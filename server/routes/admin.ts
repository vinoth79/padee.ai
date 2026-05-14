import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { getRecentCalls } from '../lib/llmLog.js'
import { ADMIN_PASSWORD } from '../lib/adminAuth.js'
import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'

// ── App config (file-backed, always fresh) ──
// Previously kept an in-memory cache for "performance", but config.json is tiny
// (< 2 KB) and reading it per request is trivial. The cache caused stale data
// when admins edited the file directly on disk (e.g. via git pull or manual
// tweak) — the running server kept serving the old version until restart.
// Re-reading always is the simpler, correct default.
const CONFIG_PATH = path.resolve(process.cwd(), 'server/config.json')

export async function getAppConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { dailyChallenge: { questionCount: 5, xpReward: 30, preferWeakSubject: true }, badges: [], weakTopicThreshold: 70 }
  }
}

async function saveAppConfig(config: any) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

const admin = new Hono()

// Simple admin auth middleware
function checkAdmin(c: any, next: any) {
  const auth = c.req.header('X-Admin-Password')
  if (auth !== ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
}

admin.use('/*', checkAdmin)

// ── List all uploaded content ──
admin.get('/content', async (c) => {
  const { data, error } = await supabase
    .from('ncert_uploads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)

  // Get total chunks count
  const { count } = await supabase
    .from('ncert_chunks')
    .select('*', { count: 'exact', head: true })

  return c.json({ uploads: data || [], totalChunks: count || 0 })
})

// ── Upload + process a PDF ──
admin.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('pdf') as File
  const subject = formData.get('subject') as string
  const classLevel = Number(formData.get('classLevel'))
  const chapterNumber = formData.get('chapterNumber') ? Number(formData.get('chapterNumber')) : null
  const chapterName = formData.get('chapterName') as string || null
  // F6b — language of the source PDF. 'en' (default) covers Sci / Maths / CS
  // / SS / English-medium NCERT. 'hi' covers CBSE Hindi-as-a-subject books
  // (Vasant, Sparsh, Kshitij, Aroh, etc.) which need the unit-aware chunker.
  const languageRaw = (formData.get('language') as string || 'en').toLowerCase()
  const language: 'en' | 'hi' = languageRaw === 'hi' ? 'hi' : 'en'

  if (!file || !subject || !classLevel) {
    return c.json({ error: 'Missing required fields: pdf, subject, classLevel' }, 400)
  }

  // Create upload record
  const { data: upload, error: uploadErr } = await supabase
    .from('ncert_uploads')
    .insert({
      subject,
      class_level: classLevel,
      chapter_number: chapterNumber,
      chapter_name: chapterName,
      filename: file.name,
      file_size: file.size,
      status: 'processing',
    })
    .select()
    .single()

  if (uploadErr) return c.json({ error: uploadErr.message }, 500)

  // Process in background (don't block the response)
  processUpload(upload.id, file, subject, classLevel, chapterNumber, chapterName, language)
    .catch(err => console.error('Upload processing failed:', err))

  return c.json({ upload, message: 'Processing started', language })
})

// ── Delete content for a subject/class/chapter ──
admin.delete('/content/:id', async (c) => {
  const uploadId = c.req.param('id')

  // Get upload record to find matching chunks
  const { data: upload } = await supabase
    .from('ncert_uploads')
    .select('*')
    .eq('id', uploadId)
    .single()

  if (!upload) return c.json({ error: 'Upload not found' }, 404)

  // Delete chunks matching this upload's source_pdf
  await supabase
    .from('ncert_chunks')
    .delete()
    .eq('source_pdf', upload.filename)
    .eq('subject', upload.subject)
    .eq('class_level', upload.class_level)

  // Delete upload record
  await supabase.from('ncert_uploads').delete().eq('id', uploadId)

  return c.json({ ok: true })
})

// ── Re-index: delete existing chunks for this upload and re-run the pipeline ──
admin.post('/content/:id/reindex', async (c) => {
  const uploadId = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('pdf') as File | null

  const { data: upload } = await supabase
    .from('ncert_uploads')
    .select('*')
    .eq('id', uploadId)
    .single()

  if (!upload) return c.json({ error: 'Upload not found' }, 404)
  if (!file) return c.json({ error: 'PDF file required for re-index' }, 400)

  // F6b — language carries through reindex. Form override > existing chunks'
  // language > 'en' default.
  let language: 'en' | 'hi' = 'en'
  const formLang = (formData.get('language') as string || '').toLowerCase()
  if (formLang === 'hi' || formLang === 'en') {
    language = formLang as 'en' | 'hi'
  } else {
    const { data: probe } = await supabase
      .from('ncert_chunks')
      .select('language')
      .eq('source_pdf', upload.filename)
      .eq('subject', upload.subject)
      .eq('class_level', upload.class_level)
      .limit(1)
    if (probe && probe.length > 0 && probe[0].language === 'hi') language = 'hi'
  }

  // Delete existing chunks for this upload
  await supabase
    .from('ncert_chunks')
    .delete()
    .eq('source_pdf', upload.filename)
    .eq('subject', upload.subject)
    .eq('class_level', upload.class_level)

  // Reset upload record
  await supabase.from('ncert_uploads').update({
    status: 'processing',
    chunk_count: 0,
    error_message: null,
    filename: file.name,
    file_size: file.size,
  }).eq('id', uploadId)

  processUpload(uploadId, file, upload.subject, upload.class_level, upload.chapter_number, upload.chapter_name, language)
    .catch(err => console.error('Reindex processing failed:', err))

  return c.json({ ok: true, message: 'Re-indexing started', language })
})

// ── App config (admin-editable thresholds) ──
admin.get('/config', async (c) => {
  const config = await getAppConfig()
  return c.json(config)
})

admin.put('/config', async (c) => {
  const body = await c.req.json()
  await saveAppConfig(body)
  return c.json({ ok: true })
})

// ── List all users with stats ──
// Default response: NO email. Most admin workflows (browse roster, see XP
// distribution) don't need parent contact info. Email is opt-in via
// `?include=email` so the field still surfaces for the support flow that
// genuinely needs it (e.g., looking up a student by email to set their
// role). Reduces blast radius if the admin password leaks; helps with
// DPDP under-18 minimisation.
admin.get('/users', async (c) => {
  const includeEmail = c.req.query('include') === 'email'
  const profileSelect = includeEmail
    ? 'id, name, email, role, class_level, active_track, school_code, created_at, updated_at'
    : 'id, name, role, class_level, active_track, school_code, created_at, updated_at'

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(profileSelect)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)

  const [{ data: xpData }, { data: doubtCounts }, { data: streakData }] = await Promise.all([
    supabase.from('student_xp').select('student_id, amount'),
    supabase.from('doubt_sessions').select('student_id'),
    supabase.from('student_streaks').select('student_id, current_streak, longest_streak'),
  ])

  // Aggregate XP per user
  const xpByUser: Record<string, number> = {}
  for (const row of xpData || []) {
    xpByUser[row.student_id] = (xpByUser[row.student_id] || 0) + row.amount
  }

  // Count doubts per user
  const doubtsByUser: Record<string, number> = {}
  for (const row of doubtCounts || []) {
    doubtsByUser[row.student_id] = (doubtsByUser[row.student_id] || 0) + 1
  }

  // Streak per user
  const streakByUser: Record<string, any> = {}
  for (const row of streakData || []) {
    streakByUser[row.student_id] = row
  }

  const users = (profiles || []).map((p: any) => ({
    ...p,
    totalXP: xpByUser[p.id] || 0,
    totalDoubts: doubtsByUser[p.id] || 0,
    currentStreak: streakByUser[p.id]?.current_streak || 0,
  }))

  return c.json({ users, includesEmail: includeEmail })
})

// ── Set user role (for Phase 1 demo: promote a user to teacher) ──
admin.post('/set-role', async (c) => {
  const { email, role } = await c.req.json()
  if (!email || !['student', 'teacher', 'parent', 'admin'].includes(role)) {
    return c.json({ error: 'Provide email and role (student/teacher/parent/admin)' }, 400)
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('email', email)
    .select('id, email, role')
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true, profile: data })
})

// ── LLM Audit: recent calls ──
admin.get('/llm-log', (c) => {
  const limit = Number(c.req.query('limit') || '50')
  const endpoint = c.req.query('endpoint')
  let calls = getRecentCalls(limit * 2)  // get more, then filter
  if (endpoint) calls = calls.filter(call => call.endpoint === endpoint)
  return c.json({ calls: calls.slice(0, limit) })
})

// ── Error stats: counts of recent errors for the admin banner ──
admin.get('/error-stats', (c) => {
  const calls = getRecentCalls(500)
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const dayAgo = now - 24 * 60 * 60 * 1000

  const withTime = calls.map(call => ({ ...call, ts: new Date(call.timestamp).getTime() }))
  const errorsLastHour = withTime.filter(c => c.error && c.ts >= hourAgo).length
  const errorsLast24h = withTime.filter(c => c.error && c.ts >= dayAgo).length
  const totalLastHour = withTime.filter(c => c.ts >= hourAgo).length
  const fallbacksLastHour = withTime.filter(c => (c.metadata as any)?.fallbackFired && c.ts >= hourAgo).length

  // Rate-limit specific (common case — highlight this)
  const rateLimitLastHour = withTime.filter(c =>
    c.error && c.ts >= hourAgo && /rate limit|429|quota/i.test(c.error)
  ).length

  // Simple severity: red if >20 errors/hr or >50% error rate, amber if any errors
  const errorRate = totalLastHour > 0 ? errorsLastHour / totalLastHour : 0
  let severity: 'none' | 'amber' | 'red' = 'none'
  if (errorsLastHour >= 20 || (totalLastHour >= 10 && errorRate > 0.5)) severity = 'red'
  else if (errorsLastHour > 0) severity = 'amber'

  return c.json({
    severity,
    errorsLastHour,
    errorsLast24h,
    totalLastHour,
    errorRate: Math.round(errorRate * 100),
    fallbacksLastHour,
    rateLimitLastHour,
  })
})

// ── Get processing status ──
admin.get('/upload/:id/status', async (c) => {
  const { data } = await supabase
    .from('ncert_uploads')
    .select('*')
    .eq('id', c.req.param('id'))
    .single()

  return c.json(data || { error: 'Not found' })
})

// ═══ Background processing pipeline ═══

async function processUpload(
  uploadId: string,
  file: File,
  subject: string,
  classLevel: number,
  chapterNumber: number | null,
  chapterName: string | null,
  language: 'en' | 'hi' = 'en',
) {
  try {
    // Step 1: Extract text from PDF — multi-tier fallback chain (Sprint 3 / F6b)
    // English PDFs: pdf-parse only. Hindi PDFs: pdf-parse → pdftotext →
    // Tesseract OCR (last tier lands in a follow-up commit). The chain falls
    // through on isProbablyDevanagari() < 30% so Krutidev-encoded legacy
    // NCERT PDFs that pdf-parse renders as ASCII gibberish get re-extracted
    // via poppler-utils.
    console.log(`[Admin] Extracting text from ${file.name} (language=${language})...`)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { extractTextFromPdf } = await import('../lib/pdfExtract.js')
    const extraction = await extractTextFromPdf(buffer, language)
    const fullText = extraction.text

    console.log(`[Admin] Extraction: tier=${extraction.tier}, chars/tier=${JSON.stringify(extraction.charsPerTier)}, devanagari%/tier=${JSON.stringify(Object.fromEntries(Object.entries(extraction.devanagariRatioPerTier).map(([k, v]) => [k, (v * 100).toFixed(1) + '%'])))}`)

    if (!fullText.trim()) {
      await updateUploadStatus(uploadId, 'failed', 'No text found in PDF')
      return
    }

    if (extraction.tier === 'failed') {
      const msg = language === 'hi'
        ? `Extraction failed: all tiers returned non-Devanagari output. Best ratio: ${(Math.max(...Object.values(extraction.devanagariRatioPerTier)) * 100).toFixed(1)}%. The PDF likely uses a legacy non-Unicode font that needs OCR (Tesseract tier — coming in a follow-up).`
        : `Extraction returned text but no tier matched the expected language profile.`
      await updateUploadStatus(uploadId, 'failed', msg)
      return
    }

    // Step 2: Chunk the text — Hindi uses the unit-aware chunker (poems +
    // prose + grammar units), English uses the 800-char window. See
    // server/lib/ncertChunker.ts for the heuristics.
    console.log(`[Admin] Chunking text (${fullText.length} chars, language=${language}, tier=${extraction.tier})...`)
    const { chunkText: chunkTextLib } = await import('../lib/ncertChunker.js')
    const chunks = chunkTextLib(fullText, language)

    console.log(`[Admin] Created ${chunks.length} chunks`)
    await supabase.from('ncert_uploads').update({ chunk_count: chunks.length }).eq('id', uploadId)

    // Step 3: Generate embeddings and store chunks
    console.log(`[Admin] Generating embeddings...`)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const BATCH_SIZE = 20

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const texts = batch.map(ch => ch.text)

      const embeddingRes = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: texts,
      })

      const rows = batch.map((ch, j) => ({
        subject,
        class_level: classLevel,
        chapter_number: chapterNumber,
        chapter_name: chapterName,
        page_number: ch.page,
        content: ch.text,
        embedding: JSON.stringify(embeddingRes.data[j].embedding),
        source_pdf: file.name,
        chunk_index: i + j,
        language,  // F6b — drives the language-aware RAG retrieval filter
      }))

      const { error } = await supabase.from('ncert_chunks').insert(rows)
      if (error) {
        console.error(`[Admin] Chunk insert error at batch ${i}:`, error.message)
      }

      console.log(`[Admin] Stored chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)} of ${chunks.length}`)
    }

    await updateUploadStatus(uploadId, 'completed')
    console.log(`[Admin] Done! ${chunks.length} chunks stored for ${file.name}`)

    // Step 4 (new): Auto-extract concepts via GPT-4o into concept_catalog (draft status)
    if (chapterNumber && chapterName) {
      console.log(`[Admin] Auto-extracting concepts for Class ${classLevel} ${subject} Ch ${chapterNumber}...`)
      try {
        const { extractConceptsFromChapter } = await import('./concepts.js')
        const { data: uploadRow } = await supabase
          .from('ncert_uploads').select('uploaded_by').eq('id', uploadId).single()
        const result = await extractConceptsFromChapter({
          subject,
          classLevel,
          chapterNo: chapterNumber,
          chapterName,
          userId: uploadRow?.uploaded_by || 'system',
        })
        console.log(`[Admin] Extracted ${result.extracted} concepts (draft). Awaiting admin publish.`)
      } catch (err: any) {
        console.warn(`[Admin] Concept extraction failed (non-fatal):`, err.message)
      }
    }
  } catch (err: any) {
    console.error(`[Admin] Processing failed:`, err)
    await updateUploadStatus(uploadId, 'failed', err.message)
  }
}

async function updateUploadStatus(id: string, status: string, errorMessage?: string) {
  await supabase.from('ncert_uploads').update({
    status,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  }).eq('id', id)
}

// The chunker moved to server/lib/ncertChunker.ts in Sprint 3 / F6b — it's
// now language-aware (English 800-char window vs Hindi unit-aware). See
// processUpload() above for the dispatch.

export default admin
