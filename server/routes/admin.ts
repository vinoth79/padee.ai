import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { getRecentCalls } from '../lib/llmLog.js'
import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'

// ── App config (in-memory cache + file persistence) ──
const CONFIG_PATH = path.resolve(process.cwd(), 'server/config.json')
let configCache: any = null

export async function getAppConfig() {
  if (configCache) return configCache
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    configCache = JSON.parse(raw)
  } catch {
    configCache = { dailyChallenge: { questionCount: 5, xpReward: 30, preferWeakSubject: true }, badges: [], weakTopicThreshold: 70 }
  }
  return configCache
}

async function saveAppConfig(config: any) {
  configCache = config
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

const admin = new Hono()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'padee-admin-2026'

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
  processUpload(upload.id, file, subject, classLevel, chapterNumber, chapterName)
    .catch(err => console.error('Upload processing failed:', err))

  return c.json({ upload, message: 'Processing started' })
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

  processUpload(uploadId, file, upload.subject, upload.class_level, upload.chapter_number, upload.chapter_name)
    .catch(err => console.error('Reindex processing failed:', err))

  return c.json({ ok: true, message: 'Re-indexing started' })
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
admin.get('/users', async (c) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, class_level, active_track, school_code, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)

  // Get XP + doubt counts per user in parallel
  const userIds = (profiles || []).map((p: any) => p.id)

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

  return c.json({ users })
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
  chapterName: string | null
) {
  try {
    // Step 1: Extract text from PDF
    console.log(`[Admin] Extracting text from ${file.name}...`)
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = pdfParseModule.default || pdfParseModule
    const pdf = await (pdfParse as any)(buffer)
    const fullText = pdf.text

    if (!fullText.trim()) {
      await updateUploadStatus(uploadId, 'failed', 'No text found in PDF')
      return
    }

    // Step 2: Chunk the text
    console.log(`[Admin] Chunking text (${fullText.length} chars)...`)
    const chunks = chunkText(fullText, 800, 100) // 800 chars per chunk, 100 char overlap

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

// Split text into overlapping chunks
function chunkText(text: string, chunkSize: number, overlap: number): { text: string; page: number | null }[] {
  const chunks: { text: string; page: number | null }[] = []
  // Clean up the text
  const clean = text.replace(/\n{3,}/g, '\n\n').trim()
  const paragraphs = clean.split(/\n\n+/)

  let current = ''
  let pageNum: number | null = null

  for (const para of paragraphs) {
    // Try to detect page numbers
    const pageMatch = para.match(/^\s*(\d{1,3})\s*$/)
    if (pageMatch && para.trim().length <= 3) {
      pageNum = parseInt(pageMatch[1])
      continue
    }

    if (current.length + para.length > chunkSize && current.length > 0) {
      chunks.push({ text: current.trim(), page: pageNum })
      // Keep overlap from end of current chunk
      const words = current.split(' ')
      const overlapWords = words.slice(-Math.ceil(overlap / 5))
      current = overlapWords.join(' ') + ' ' + para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), page: pageNum })
  }

  return chunks.filter(c => c.text.length > 50) // Skip tiny chunks
}

export default admin
