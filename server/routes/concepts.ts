import { Hono } from 'hono'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { logLLMCall } from '../lib/llmLog.js'
import { clearConceptCache } from '../lib/conceptDetection.js'
import { ADMIN_PASSWORD } from '../lib/adminAuth.js'
import { safeParseLLMJson } from '../lib/latexValidate.js'
import { toSlug, buildConceptRows } from '../lib/conceptHelpers.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const concepts = new Hono()

// ═══ Admin auth helper ═══
// Accepts EITHER:
//   • X-Admin-Password header matching ADMIN_PASSWORD (admin panel)
//   • Authorization: Bearer <token> where user has role 'admin' or 'teacher'
async function requireAdmin(c: any) {
  const adminPwd = c.req.header('X-Admin-Password')
  if (adminPwd && adminPwd === ADMIN_PASSWORD) {
    return { source: 'password' as const, userId: 'admin-panel' }
  }
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return { error: 'Unauthorized', status: 401 as const }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', u.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
    return { error: 'Forbidden', status: 403 as const }
  }
  return { source: 'token' as const, userId: u.id, profile }
}

// toSlug + buildConceptRows live in lib/conceptHelpers.ts (pure functions,
// independently unit-tested in tests/conceptExtract.test.mjs).

// ═══ extractConceptsFromChapter ═══
// Pulls NCERT chunks for a chapter and asks GPT-4o to extract concepts.
// Exported so the admin upload handler can auto-trigger it.
export async function extractConceptsFromChapter(params: {
  subject: string
  classLevel: number
  chapterNo: number
  chapterName: string
  userId: string
}) {
  const { subject, classLevel, chapterNo, chapterName, userId } = params

  // Fetch chunks in order
  const { data: chunks, error: chunkErr } = await supabase
    .from('ncert_chunks')
    .select('content, chunk_index')
    .eq('subject', subject)
    .eq('class_level', classLevel)
    .eq('chapter_number', chapterNo)
    .order('chunk_index', { ascending: true })

  if (chunkErr) throw new Error(`Failed to load chunks: ${chunkErr.message}`)
  if (!chunks || chunks.length === 0) {
    throw new Error(`No NCERT chunks found for Class ${classLevel} ${subject} Chapter ${chapterNo}. Upload the PDF first.`)
  }

  // Concat chunks. Truncate to ~80k chars to stay under GPT-4o context + leave room for response.
  let chapterText = chunks.map((c: any) => c.content).join('\n\n')
  const MAX_CHARS = 80000
  if (chapterText.length > MAX_CHARS) chapterText = chapterText.slice(0, MAX_CHARS) + '\n\n[...truncated...]'

  const systemPrompt = `You are an expert CBSE curriculum analyst. You are extracting the distinct teachable concepts from an NCERT textbook chapter so they can be used by a concept-level knowledge tracking engine.

STRICT RULES:
1. A concept MUST appear as a section heading, sub-heading, labelled formula, named law/principle, or be the explicit subject of chapter exercise questions. If it does not appear in the text, do NOT invent it.
2. 5-12 concepts per chapter is typical. Err on the side of fewer, more distinct concepts.
3. Each concept must be a distinct teachable unit — something a student can get right or wrong independently. Do NOT create concepts that are trivial restatements of each other.
4. concept_name: short, clear, 20-60 chars. Use CBSE textbook terminology.
5. exam_weight_percent: your estimate of % of chapter marks. Must be integers 0-30. All concepts in a chapter should sum to roughly 100 but do not need to be exact.
6. brief_summary: one sentence (under 25 words) describing what the concept covers.
7. Order concepts by how they appear in the text.

OUTPUT FORMAT — strict JSON, no preamble, no markdown:
{
  "concepts": [
    { "concept_name": "...", "exam_weight_percent": N, "brief_summary": "..." },
    ...
  ]
}`

  const userPrompt = `Subject: ${subject}
Class: ${classLevel}
Chapter ${chapterNo}: ${chapterName}

NCERT chapter content below. Extract the concepts.

---
${chapterText}
---`

  const t0 = Date.now()
  const model = process.env.LLM_CONCEPT_EXTRACT || 'gpt-4o'

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content || '{}'

  logLLMCall({
    timestamp: new Date().toISOString(),
    endpoint: 'other',
    userId,
    model,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt.slice(0, 2000) + '...[chapter text truncated in log]' }],
    response: raw,
    latencyMs: Date.now() - t0,
    metadata: { action: 'concept_extract', subject, classLevel, chapterNo, chunkCount: chunks.length },
  }).catch(() => {})

  // safeParseLLMJson handles the LaTeX-mangled-JSON edge case (\frac → form
  // feed + "rac"). Concept names are usually plain prose but can contain
  // formula symbols, so apply the same defence as /practice and /worksheet.
  const parsed = safeParseLLMJson(raw)
  const extracted: any[] = Array.isArray(parsed?.concepts) ? parsed.concepts : []
  if (extracted.length === 0) throw new Error('AI returned no concepts')

  // Determine syllabus_order offset: find max existing order for this subject/class
  const { data: maxOrderRow } = await supabase
    .from('concept_catalog')
    .select('syllabus_order')
    .eq('subject', subject)
    .eq('class_level', classLevel)
    .eq('chapter_no', chapterNo)
    .order('syllabus_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const startingOrder = maxOrderRow?.syllabus_order != null
    ? maxOrderRow.syllabus_order + 1
    : chapterNo * 100  // simple scheme: chapter N concepts get orders N00-N99

  // Build rows via pure helper — empties filtered, slug collisions deduped.
  const rows = buildConceptRows({
    extracted, subject, classLevel, chapterNo, chapterName, startingOrder,
  })

  if (rows.length === 0) {
    throw new Error('All extracted concepts had empty/invalid names')
  }

  // Upsert (preserves existing concepts with same slug — admin might have edited them)
  const inserted: any[] = []
  for (const row of rows) {
    const { data: existing } = await supabase
      .from('concept_catalog').select('concept_slug, status').eq('concept_slug', row.concept_slug).maybeSingle()
    if (existing) {
      // Skip if admin already published or manually created this one
      if (existing.status !== 'draft') continue
      // Update draft with new data
      await supabase.from('concept_catalog').update({
        concept_name: row.concept_name,
        exam_weight_percent: row.exam_weight_percent,
        brief_summary: row.brief_summary,
        updated_at: new Date().toISOString(),
      }).eq('concept_slug', row.concept_slug)
      inserted.push({ ...row, status: 'draft', _updated: true })
    } else {
      const { data: ins } = await supabase.from('concept_catalog').insert(row).select().single()
      if (ins) inserted.push(ins)
    }
  }

  return { extracted: inserted.length, concepts: inserted, totalChunks: chunks.length }
}

// ═══ POST /api/admin/concepts/extract ═══
concepts.post('/extract', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const { subject, classLevel, chapterNo, chapterName } = await c.req.json()
  if (!subject || !classLevel || !chapterNo || !chapterName) {
    return c.json({ error: 'subject, classLevel, chapterNo, chapterName required' }, 400)
  }

  try {
    const result = await extractConceptsFromChapter({
      subject, classLevel, chapterNo, chapterName, userId: auth.userId,
    })
    return c.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[concepts] extract error:', err)
    return c.json({ error: err.message || 'Extraction failed' }, 500)
  }
})

// ═══ GET /api/admin/concepts/list ═══
// Returns concepts grouped by subject → class → chapter, with mastery-row counts.
concepts.get('/list', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const { data: rows, error } = await supabase
    .from('concept_catalog')
    .select('*')
    .neq('status', 'archived')
    .order('subject', { ascending: true })
    .order('class_level', { ascending: true })
    .order('chapter_no', { ascending: true })
    .order('syllabus_order', { ascending: true })

  if (error) return c.json({ error: error.message }, 500)

  // Attach mastery counts
  const slugs = (rows || []).map(r => r.concept_slug)
  let masteryCounts: Record<string, number> = {}
  if (slugs.length > 0) {
    const { data: masteryRows } = await supabase
      .from('concept_mastery')
      .select('concept_slug')
      .in('concept_slug', slugs)
    if (masteryRows) {
      for (const m of masteryRows) {
        masteryCounts[m.concept_slug] = (masteryCounts[m.concept_slug] || 0) + 1
      }
    }
  }

  const concepts = (rows || []).map(r => ({ ...r, mastery_row_count: masteryCounts[r.concept_slug] || 0 }))
  return c.json({ concepts })
})

// ═══ PATCH /api/admin/concepts/:slug ═══
concepts.patch('/:slug', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const slug = c.req.param('slug')
  const body = await c.req.json()
  const updates: any = { updated_at: new Date().toISOString() }
  if (body.concept_name != null) updates.concept_name = String(body.concept_name).slice(0, 120)
  if (body.exam_weight_percent != null) updates.exam_weight_percent = Math.max(0, Math.min(100, Number(body.exam_weight_percent)))
  if (body.brief_summary != null) updates.brief_summary = String(body.brief_summary).slice(0, 300)
  if (body.syllabus_order != null) updates.syllabus_order = Number(body.syllabus_order)

  const { data, error } = await supabase
    .from('concept_catalog').update(updates).eq('concept_slug', slug).select().single()
  if (error) return c.json({ error: error.message }, 500)
  // Edits to a published concept change the keyword-match surface seen by
  // detectConcept(). Invalidate the in-memory cache so the next call refetches.
  if (data?.status === 'published') clearConceptCache()
  return c.json({ ok: true, concept: data })
})

// ═══ POST /api/admin/concepts/:slug/publish ═══
concepts.post('/:slug/publish', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const slug = c.req.param('slug')
  const { error } = await supabase
    .from('concept_catalog').update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('concept_slug', slug)
  if (error) return c.json({ error: error.message }, 500)
  clearConceptCache()
  return c.json({ ok: true })
})

// ═══ POST /api/admin/concepts/bulk-publish ═══
// Body: { subject, classLevel, chapterNo }  — publishes all drafts for a chapter
concepts.post('/bulk-publish', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const { subject, classLevel, chapterNo } = await c.req.json()
  if (!subject || !classLevel || !chapterNo) return c.json({ error: 'subject, classLevel, chapterNo required' }, 400)

  const { data, error } = await supabase
    .from('concept_catalog')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('subject', subject)
    .eq('class_level', classLevel)
    .eq('chapter_no', chapterNo)
    .eq('status', 'draft')
    .select('concept_slug')
  if (error) return c.json({ error: error.message }, 500)
  if ((data?.length || 0) > 0) clearConceptCache()
  return c.json({ ok: true, published: data?.length || 0 })
})

// ═══ DELETE /api/admin/concepts/:slug ═══
// Soft-delete (archive) if mastery rows exist; hard-delete otherwise.
concepts.delete('/:slug', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const slug = c.req.param('slug')
  const { count } = await supabase
    .from('concept_mastery')
    .select('*', { count: 'exact', head: true })
    .eq('concept_slug', slug)

  if ((count || 0) > 0) {
    // Archive (preserves mastery data history)
    await supabase.from('concept_catalog')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('concept_slug', slug)
    clearConceptCache()
    return c.json({ ok: true, mode: 'archived', mastery_rows: count })
  } else {
    await supabase.from('concept_catalog').delete().eq('concept_slug', slug)
    clearConceptCache()
    return c.json({ ok: true, mode: 'deleted' })
  }
})

// ═══ POST /api/admin/concepts/manual ═══
// Admin creates a concept manually (no AI).
concepts.post('/manual', async (c) => {
  const auth = await requireAdmin(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const { concept_name, subject, classLevel, chapterNo, chapterName, exam_weight_percent = 0, brief_summary = '' } = await c.req.json()
  if (!concept_name || !subject || !classLevel || !chapterNo || !chapterName) {
    return c.json({ error: 'Required: concept_name, subject, classLevel, chapterNo, chapterName' }, 400)
  }

  // Find next syllabus order for this chapter
  const { data: maxOrderRow } = await supabase
    .from('concept_catalog')
    .select('syllabus_order')
    .eq('subject', subject)
    .eq('class_level', classLevel)
    .eq('chapter_no', chapterNo)
    .order('syllabus_order', { ascending: false })
    .limit(1).maybeSingle()
  const syllabus_order = maxOrderRow?.syllabus_order != null ? maxOrderRow.syllabus_order + 1 : chapterNo * 100

  const slug = toSlug(chapterNo, concept_name)
  const { data, error } = await supabase.from('concept_catalog').insert({
    concept_slug: slug,
    concept_name: String(concept_name).slice(0, 120),
    subject,
    class_level: classLevel,
    chapter_no: chapterNo,
    chapter_name: chapterName,
    syllabus_order,
    exam_weight_percent: Number(exam_weight_percent) || 0,
    brief_summary: String(brief_summary).slice(0, 300),
    status: 'draft',
    source: 'admin_manual',
  }).select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true, concept: data })
})

export default concepts
