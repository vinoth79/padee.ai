const BASE = '/api'

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// -- Doubt: streaming SSE --
export async function askDoubt(
  token: string,
  messages: { role: string; content: string }[],
  subject: string,
  className: number,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const resp = await fetch(`${BASE}/ai/doubt`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ messages, subject, className }),
  })

  if (resp.status === 429) throw new Error('daily_limit_reached')
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (line === 'data: [DONE]') { onDone(); continue }
      if (line.startsWith('data: ')) {
        try { onChunk(JSON.parse(line.slice(6)).text || '') } catch {}
      }
    }
  }
}

// -- Daily usage count --
export async function getDailyUsage(token: string): Promise<{ count: number; limit: number }> {
  const r = await fetch(`${BASE}/ai/usage`, { headers: authHeader(token) })
  return r.json()
}

// -- Quality signals --
export async function submitFeedback(
  token: string, sessionId: string, helpful: boolean, reason?: string
) {
  await fetch(`${BASE}/ai/feedback`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ sessionId, helpful, reason }),
  })
}

export async function reportIncorrect(token: string, data: {
  sessionId?: string; questionText: string; aiResponse: string;
  subject: string; classLevel: number; reportText: string
}) {
  await fetch(`${BASE}/ai/flag`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
}

// -- Visual explain --
export async function generateVisual(
  token: string, concept: string, subject: string, className: number
): Promise<string> {
  const r = await fetch(`${BASE}/ai/visual`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ concept, subject, className }),
  })
  return (await r.json()).html || ''
}

// -- Practice --
export async function generatePractice(token: string, data: {
  subject: string; className: number; chapter: string;
  count: number; difficulty: string
}) {
  const r = await fetch(`${BASE}/ai/practice`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
  return r.json()
}

// -- Evaluate descriptive answer --
export async function evaluateAnswer(token: string, data: {
  question: string; studentAnswer: string; marks: number; subject: string
}) {
  const r = await fetch(`${BASE}/ai/evaluate`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
  return r.json()
}

// ═══ Worksheet ═══
// Generate from a free-text teacher brief.
// Returns { worksheet: { title, subject, class_level, chapter, sections: [...], total_marks }, meta }
export async function generateWorksheet(token: string, data: {
  prompt: string
  validate?: boolean
}) {
  const r = await fetch(`${BASE}/ai/worksheet`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
  return r.json()
}

// Persist a worksheet to the teacher's library. Pass `id` to overwrite an existing one.
export async function saveWorksheet(token: string, payload: {
  id?: string
  worksheet: any
  prompt?: string
}) {
  const r = await fetch(`${BASE}/ai/worksheet/save`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  })
  return r.json()
}

// List the teacher's saved worksheets (metadata only).
export async function listWorksheets(token: string) {
  const r = await fetch(`${BASE}/ai/worksheet/list`, {
    headers: authHeader(token),
  })
  return r.json()
}

// Fetch one full worksheet (with all questions).
export async function getWorksheet(token: string, id: string) {
  const r = await fetch(`${BASE}/ai/worksheet/${id}`, {
    headers: authHeader(token),
  })
  return r.json()
}

export async function deleteWorksheet(token: string, id: string) {
  const r = await fetch(`${BASE}/ai/worksheet/${id}`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
  return r.json()
}

// ═══ Paper Mimic ═══
// Upload a past CBSE paper PDF → server extracts + analyzes + generates a
// fresh paper with the same structure. Output shape identical to worksheet
// so save/list/export functions above work as-is.
export async function mimicPaper(
  token: string,
  file: File,
  opts?: { validate?: boolean; hint?: string }
) {
  const form = new FormData()
  form.append('pdf', file)
  if (opts?.validate === false) form.append('validate', 'false')
  if (opts?.hint) form.append('hint', opts.hint)
  const r = await fetch(`${BASE}/ai/mimic`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // NO Content-Type — browser sets multipart boundary
    body: form,
  })
  return r.json()
}

// (Legacy signature preserved for back-compat; new code should use mimicPaper)
export async function uploadMimicPDF(
  token: string, file: File, subject: string,
  className: number, questionCount: number
) {
  const form = new FormData()
  form.append('pdf', file)
  form.append('subject', subject)
  form.append('className', className.toString())
  form.append('questionCount', questionCount.toString())
  const r = await fetch(`${BASE}/ai/mimic`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  return r.json()
}

// -- Student profile --
export async function getProfile(token: string) {
  const r = await fetch(`${BASE}/user/profile`, { headers: authHeader(token) })
  return r.json()
}

export async function saveOnboarding(token: string, data: {
  className: number
  subjects: string[]
  track: string
  board?: 'CBSE' | 'ICSE' | 'IGCSE' | 'IB' | 'STATE' | 'OTHER'
  dailyPledgeXp?: number
  studyDays?: string[]
}) {
  const r = await fetch(`${BASE}/user/onboarding`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
  return r.json()
}

// -- Home data --
export async function getHomeData(token: string) {
  const r = await fetch(`${BASE}/user/home-data`, { headers: authHeader(token) })
  return r.json()
}

// ═══ Teacher review queue ═══
export async function listFlagged(token: string, opts?: {
  status?: 'pending' | 'reviewed' | 'all'
  subject?: string
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (opts?.status) qs.set('status', opts.status)
  if (opts?.subject) qs.set('subject', opts.subject)
  if (opts?.limit) qs.set('limit', String(opts.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const r = await fetch(`${BASE}/teacher/flagged${suffix}`, { headers: authHeader(token) })
  return r.json()
}

export async function getFlagged(token: string, id: string) {
  const r = await fetch(`${BASE}/teacher/flagged/${id}`, { headers: authHeader(token) })
  return r.json()
}

export async function reviewFlagged(token: string, id: string, data: {
  status: 'correct' | 'wrong' | 'partial'
  teacher_notes?: string
}) {
  const r = await fetch(`${BASE}/teacher/flagged/${id}/review`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function reopenFlagged(token: string, id: string) {
  const r = await fetch(`${BASE}/teacher/flagged/${id}/reopen`, {
    method: 'POST',
    headers: authHeader(token),
  })
  return r.json()
}

// ═══ Teacher — student list + profile drill-down ═══
export async function listTeacherStudents(token: string, opts?: { q?: string; classLevel?: number }) {
  const qs = new URLSearchParams()
  if (opts?.q) qs.set('q', opts.q)
  if (opts?.classLevel) qs.set('class', String(opts.classLevel))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const r = await fetch(`${BASE}/teacher/students${suffix}`, { headers: authHeader(token) })
  return r.json()
}

export async function getStudentProfile(token: string, studentId: string) {
  const r = await fetch(`${BASE}/teacher/student/${studentId}`, { headers: authHeader(token) })
  return r.json()
}

// ═══ Teacher dashboard (command centre) ═══
export async function getTeacherDashboard(token: string) {
  const r = await fetch(`${BASE}/teacher/dashboard`, { headers: authHeader(token) })
  return r.json()
}

// ═══ Concept catalog (teacher + admin) ═══
// Returns published concepts grouped by subject/class/chapter — used by the
// worksheet generator to populate scope dropdowns.
export async function listConcepts(token: string) {
  const r = await fetch(`${BASE}/admin/concepts/list`, { headers: authHeader(token) })
  return r.json()
}

// ═══ Test assignment (teacher) ═══
export async function assignTest(token: string, payload: {
  title: string
  subject: string
  classLevel: number
  questionCount?: number
  difficulty?: string
  deadline?: string | null
  questions?: any[]
}) {
  const r = await fetch(`${BASE}/test/assign`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  })
  return r.json()
}
