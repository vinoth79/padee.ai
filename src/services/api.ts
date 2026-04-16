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

// -- Worksheet --
export async function generateWorksheet(token: string, data: {
  subject: string; className: number; chapter: string;
  questionTypes: string[]; difficulty: string; totalQuestions: number
}) {
  const r = await fetch(`${BASE}/ai/worksheet`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(data),
  })
  return r.json()
}

// -- Paper Mimic --
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
  className: number; subjects: string[]; track: string
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
