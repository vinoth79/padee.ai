// ═══════════════════════════════════════════════════════════════════════════
// DoubtSolverScreenV4 — Ask Pa / doubt solver (v4 design)
// ═══════════════════════════════════════════════════════════════════════════
// Option A scope: visual refresh only. SAME backend, SAME endpoints, SAME
// streaming logic, SAME feedback/flag contracts as v3 DoubtSolverScreen.
// v3 file stays untouched and still renders when flag is off.
//
// Key behaviours preserved 1:1 from v3:
//   - SSE streaming reader with chunk-boundary buffering + mountedRef guard
//   - localStorage persistence + orphan (streaming:true) sanitization
//   - Auto-send from Learn-screen concept click (via initialQuestion prop)
//   - Subject auto-detection (keyword-based) with initialSubject override
//   - Memory-aware indicator when backend flags memoryUsed=true
//   - 8 action chips with interpolated topic ("this concept" → actual Q)
//   - Photo upload → Llama-4-Scout vision (camera icon in input bar)
//   - Quality signals: 👍 / 👎 + reason chips / 🚩 flag modal
//   - RateLimitErrorCard when both providers fail
//   - Copy-on-hover + clear chat
//   - Inline Quiz-me MCQ (when chip clicked)
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react'
import { useUser } from '../context/UserContext'
import HomeTopNav from '../components/home-v4/HomeTopNav'
import FooterStrip from '../components/home-v4/FooterStrip'
import AskHeader from '../components/ask-v4/AskHeader'
import StudentBubble from '../components/ask-v4/StudentBubble'
import PaBubble from '../components/ask-v4/PaBubble'
import AskInput from '../components/ask-v4/AskInput'
import RateLimitErrorCard from '../components/RateLimitErrorCard'
import '../styles/ask-v4.css'

// ─── Module-level guards (same pattern as v3) ───
const AUTO_SENT_QUESTIONS = new Set()
let MSG_ID_COUNTER = 0
function nextMsgId() { return `msg-${Date.now()}-${++MSG_ID_COUNTER}` }

// Thinking phase cycling (same as v3)
const THINKING_PHASES = [
  'Reading your question…',
  'Looking up NCERT content…',
  'Building your explanation…',
]

// Subject detection keywords (mirrors v3 — single source of truth would be better, deferred)
const SUBJECT_KEYWORDS = {
  Physics:     ['force', 'velocity', 'acceleration', 'gravity', 'magnet', 'magnetic', 'electric', 'current', 'voltage', 'resistance', 'ohm', 'circuit', 'lens', 'mirror', 'reflection', 'refraction', 'wave', 'sound', 'light', 'energy', 'power', 'watt', 'joule', 'newton', 'momentum', 'friction', 'pressure'],
  Chemistry:   ['acid', 'base', 'salt', 'ph', 'reaction', 'chemical', 'element', 'compound', 'molecule', 'atom', 'ion', 'metal', 'non-metal', 'periodic', 'oxidation', 'reduction', 'corrosion', 'carbon', 'hydrogen', 'oxygen', 'nitrogen', 'sulphur', 'ethanol', 'methane', 'soap', 'detergent'],
  Biology:     ['cell', 'tissue', 'organ', 'photosynthesis', 'respiration', 'digestion', 'nutrition', 'excretion', 'reproduction', 'heredity', 'evolution', 'ecosystem', 'dna', 'gene', 'chromosome', 'plant', 'animal', 'blood', 'heart', 'brain', 'kidney', 'liver', 'hormone', 'enzyme', 'transportation', 'transport', 'circulation', 'lung', 'stomach', 'nephron', 'xylem', 'phloem', 'stomata'],
  Mathematics: ['equation', 'polynomial', 'quadratic', 'triangle', 'circle', 'area', 'volume', 'probability', 'statistics', 'mean', 'median', 'mode', 'trigonometry', 'sin', 'cos', 'tan', 'pythagoras', 'theorem', 'algebra', 'arithmetic', 'geometric', 'sequence', 'matrix', 'prime', 'factor', 'hcf', 'lcm', 'divisor', 'euclid', 'integer', 'rational', 'irrational', 'decimal', 'fraction', 'ratio', 'coordinate', 'slope'],
  'Computer Science': ['algorithm', 'program', 'code', 'python', 'java', 'loop', 'function', 'array', 'variable', 'database', 'sql', 'html', 'css', 'network', 'internet', 'binary', 'boolean'],
  English:     ['grammar', 'tense', 'noun', 'verb', 'adjective', 'adverb', 'essay', 'comprehension', 'poem', 'poetry', 'prose', 'literature', 'letter', 'writing', 'speech'],
}
function detectSubject(question, availableSubjects) {
  if (!question) return null
  const lower = question.toLowerCase()
  let best = null, bestScore = 0
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    if (!availableSubjects.includes(subject)) continue
    const score = keywords.filter(k => lower.includes(k)).length
    if (score > bestScore) { bestScore = score; best = subject }
  }
  return bestScore >= 1 ? best : null
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

export default function DoubtSolverScreenV4({ onNavigate, initialQuestion, initialSubject }) {
  const user = useUser()

  const availableSubjects = user.selectedSubjects?.length > 0
    ? user.selectedSubjects
    : ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English']

  // ─── State (mirrors v3) ───
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('padee-ask-ai-messages')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // Sanitise orphaned streaming:true messages with no text (from broken sessions)
          const pruned = []
          for (const m of parsed) {
            const isEmptyAi = m.role === 'ai' && (!m.text || !m.text.trim())
            if (isEmptyAi) {
              if (pruned.length && pruned[pruned.length - 1].role === 'student') pruned.pop()
              continue
            }
            pruned.push(m)
          }
          return pruned
        }
      }
    } catch {}
    return []
  })
  const [loading, setLoading] = useState(false)
  const [thinkingPhase, setThinkingPhase] = useState('')
  const [feedbackState, setFeedbackState] = useState({})
  const [reportModalFor, setReportModalFor] = useState(null)
  const [reportText, setReportText] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const mountedRef = useRef(true)
  // AbortController for the in-flight /api/ai/doubt fetch. We abort on
  // unmount so a navigation away mid-stream releases the SSE connection
  // (server keeps streaming chunks if we don't), AND so the streaming
  // loop's setMessages calls don't fire on an unmounted component.
  const abortRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  // Helper: setMessages but no-op if the component has unmounted. Wraps
  // every state update inside the streaming loop so we don't trip React's
  // "setState on unmounted component" warning when the student navigates
  // away mid-stream.
  function safeSetMessages(updater) {
    if (!mountedRef.current) return
    setMessages(updater)
  }

  // Persist messages (stripping streaming flag to prevent orphan state)
  useEffect(() => {
    try {
      const tail = messages.slice(-30).map(m => m.streaming ? { ...m, streaming: false } : m)
      localStorage.setItem('padee-ask-ai-messages', JSON.stringify(tail))
    } catch {}
  }, [messages])

  // Auto-scroll to bottom on new messages
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Auto-send from Learn concept click
  useEffect(() => {
    if (!initialQuestion) return
    if (AUTO_SENT_QUESTIONS.has(initialQuestion)) return
    AUTO_SENT_QUESTIONS.add(initialQuestion)
    const alreadyInHistory = messages.some(m => m.role === 'student' && m.text === initialQuestion)
    if (alreadyInHistory) return
    sendMessage(initialQuestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion])

  // ─── Actions ───
  function clearHistory() {
    if (!confirm('Clear all messages in this session?')) return
    setMessages([])
    setFeedbackState({})
    AUTO_SENT_QUESTIONS.clear()
  }

  async function copyMessage(msgId, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(msgId)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  function openCamera() { /* handled by AskInput via its file input */ }
  function onImageSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPendingImage({ dataUrl: ev.target.result, name: file.name, size: file.size })
    }
    reader.readAsDataURL(file)
  }
  function clearPendingImage() { setPendingImage(null) }

  async function handleFeedback(msgId, helpful, reason) {
    setFeedbackState(prev => ({ ...prev, [msgId]: { helpful, reasonPicked: reason || null } }))
    setMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, _feedback: { helpful, reason: reason || null } }
      : m
    ))
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.sessionId) return
    const token = getToken()
    if (!token) return
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: msg.sessionId, helpful, reason: reason || null }),
      })
    } catch {}
  }

  async function submitReport(msgId) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const token = getToken()
    const studentMsg = messages[messages.findIndex(m => m.id === msgId) - 1]
    try {
      await fetch('/api/ai/flag', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: msg.sessionId,
          questionText: studentMsg?.text || '',
          aiResponse: msg.text || '',
          subject: msg.subject || 'General',
          classLevel: user.studentClass || 10,
          reportText: reportText,
        }),
      })
    } catch {}
    setReportModalFor(null)
    setReportText('')
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, _reported: true } : m))
  }

  async function sendMessage(text = input, opts = {}) {
    if (loading) return
    const question = (typeof text === 'string' ? text : input).trim()
    if (!question && !pendingImage) return
    const imageToSend = pendingImage
    const fromChip = !!opts.fromChip

    const effectiveSubject = initialSubject
      || detectSubject(question, availableSubjects)
      || availableSubjects[0]
      || 'Physics'

    setInput('')
    setPendingImage(null)
    setLoading(true)

    // Capture conversation history for LLM (last 6 turns)
    const history = messages
      .filter(m => m.text && m.text.trim())
      .slice(-6)
      .map(m => ({ role: m.role === 'student' ? 'user' : 'assistant', content: m.text }))

    const studentId = nextMsgId()
    setMessages(prev => [...prev, {
      role: 'student', text: question,
      image: imageToSend?.dataUrl || null,
      id: studentId,
      fromChip,  // Marks chip-generated student messages so handleChip's topic lookup can skip them
    }])

    // Thinking phase cycle
    let phaseIdx = 0
    setThinkingPhase(THINKING_PHASES[0])
    const phaseTimer = setInterval(() => {
      phaseIdx++
      if (phaseIdx < THINKING_PHASES.length) setThinkingPhase(THINKING_PHASES[phaseIdx])
    }, 900)

    const token = getToken()

    if (token) {
      const aiId = nextMsgId()
      // tagAi spreads chip-specific flags onto the AI bubble (e.g. isChallenge)
      // so PaBubble can render specialised views without sniffing the text.
      const aiTags = opts.tagAi || {}
      setMessages(prev => [...prev, {
        role: 'ai', text: '', id: aiId, streaming: true,
        subject: effectiveSubject,
        ...aiTags,
      }])

      // Bind a fresh AbortController to this send. Unmount calls abortRef.abort()
      // to release the SSE connection cleanly.
      abortRef.current = new AbortController()
      try {
        const resp = await fetch('/api/ai/doubt', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...history, { role: 'user', content: question || '(photo)' }],
            subject: effectiveSubject,
            className: user.studentClass || 10,
            ...(imageToSend ? { imageDataUrl: imageToSend.dataUrl } : {}),
          }),
          signal: abortRef.current.signal,
        })
        clearInterval(phaseTimer)
        if (mountedRef.current) { setThinkingPhase(''); setLoading(false) }

        if (resp.status === 429) {
          safeSetMessages(prev => prev.map(m => m.id === aiId
            ? { ...m, text: 'Rate limit hit. Please try again in a moment.', streaming: false, error: true }
            : m))
          return
        }

        // SSE streaming — chunk-boundary-safe buffer
        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let buffer = ''

        while (mountedRef.current) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '')
            if (!line || line === 'data: [DONE]') continue
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6))
                if (d.error) {
                  const friendly = /rate limit/i.test(d.error)
                    ? "I've hit the AI provider's rate limit. Please try again in a few minutes."
                    : /quota/i.test(d.error)
                      ? "AI quota exhausted for today. Try again tomorrow or contact admin."
                      : `Something went wrong: ${String(d.error).slice(0, 200)}`
                  safeSetMessages(prev => prev.map(m => m.id === aiId
                    ? { ...m, text: friendly, streaming: false, error: true } : m))
                  continue
                }
                if (d.text) {
                  fullText += d.text
                  safeSetMessages(prev => prev.map(m => m.id === aiId
                    ? { ...m, text: fullText } : m))
                }
                if (d.sessionId) {
                  safeSetMessages(prev => prev.map(m => m.id === aiId
                    ? { ...m, sessionId: d.sessionId, ncertSource: d.ncertSource, memoryUsed: d.memoryUsed, streaming: false }
                    : m))
                }
              } catch {}
            }
          }
        }

        // Safety: finalize if stream ended cleanly without sessionId event
        safeSetMessages(prev => prev.map(m => {
          if (m.id !== aiId) return m
          if (!m.text || m.text.trim() === '') {
            return { ...m, text: 'No response received. Please try again.', streaming: false, error: true }
          }
          return { ...m, streaming: false }
        }))
      } catch (err) {
        clearInterval(phaseTimer)
        if (mountedRef.current) { setThinkingPhase(''); setLoading(false) }
        // AbortError is the expected unmount path — don't show an error to a
        // user who's already navigated away (and even if they come back, the
        // streaming bubble was discarded with the screen).
        if (err?.name === 'AbortError') return
        safeSetMessages(prev => prev.map(m => m.streaming
          ? { ...m, text: 'Something went wrong talking to the AI. Please try again.', streaming: false, error: true }
          : m))
      } finally {
        abortRef.current = null
      }
    } else {
      // No token — bail (protected route should prevent this, but defensively)
      clearInterval(phaseTimer); setThinkingPhase(''); setLoading(false)
    }
  }

  // ─── Action chips ───
  // Interpolate the student's actual last question text so the LLM has an
  // explicit topic reference (prevents drift to memory-referenced topics).
  // Skip chip-generated messages — using a previous chip prompt as the topic
  // produces nested garbage like "quiz me on 'CBSE answer for Explain ...'".
  async function handleChip(chip) {
    // ── Quiz Me → toggle inline widget on the most recent AI message,
    //    DON'T send a new student message. Avoids round-trip through doubt
    //    LLM and gives a real interactive MCQ via /api/ai/practice.
    if (chip === 'quiz') {
      setMessages(prev => {
        const out = [...prev]
        // Find last AI bubble with text and toggle its showQuiz flag
        for (let i = out.length - 1; i >= 0; i--) {
          if (out[i].role === 'ai' && out[i].text && !out[i].streaming) {
            out[i] = { ...out[i], showQuiz: !out[i].showQuiz }
            break
          }
        }
        return out
      })
      return
    }

    let lastTopic = null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'student' && !m.fromChip && m.text?.trim()) {
        lastTopic = m.text.trim().slice(0, 150)
        break
      }
    }
    const ref = lastTopic ? `"${lastTopic}"` : 'the concept we just discussed'

    // Visual chip → call /api/ai/visual (GPT-4o HTML+SVG) and render in an
    // in-bubble iframe. `visual:force` bypasses the server-side cache.
    if (chip === 'visual' || chip === 'visual:force') {
      // Find the most recent non-streaming AI bubble — that's the answer
      // we're visualising.
      let lastAiIdx = -1
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'ai' && messages[i].text) { lastAiIdx = i; break }
      }
      if (lastAiIdx < 0) return
      const lastAi = messages[lastAiIdx]
      // Find the student question that prompted this AI response by walking
      // BACKWARD from the AI bubble's position (NOT the array tail, which
      // could be a chip-driven prompt that came after).
      let lastQuestion = ''
      for (let i = lastAiIdx - 1; i >= 0; i--) {
        if (messages[i].role === 'student' && messages[i].text) {
          lastQuestion = messages[i].text
          break
        }
      }

      setMessages(prev => prev.map(m => m.id === lastAi.id
        ? { ...m, visualLoading: true, visualError: null, visualHtml: null }
        : m
      ))
      const token = getToken()
      if (!token) return
      try {
        const r = await fetch('/api/ai/visual', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: lastAi.text,
            question: lastQuestion,
            subject: lastAi.subject || availableSubjects[0] || 'Physics',
            className: user.studentClass || 10,
            force: chip === 'visual:force',
          }),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Visual generation failed')
        setMessages(prev => prev.map(m => m.id === lastAi.id
          ? { ...m, visualLoading: false, visualHtml: data.html, visualCached: data.cached }
          : m
        ))
      } catch (err) {
        setMessages(prev => prev.map(m => m.id === lastAi.id
          ? { ...m, visualLoading: false, visualError: err.message || 'Failed' }
          : m
        ))
      }
      return
    }
    // Other chips: prompt the doubt LLM with a topic-anchored ask.
    // (quiz handled above — opens an inline widget, no LLM round-trip.)
    const prompts = {
      simpler:  `Explain ${ref} again but simpler — use a real-life analogy a Class 10 student can relate to.`,
      exam:     `Give me the CBSE board exam model answer for ${ref} — include keyword highlights and mark distribution.`,
      similar:  `Give me a similar practice question on the same concept as ${ref}.`,
      // Challenge: structured response the frontend splits into problem + hidden
      // solution, so the student attempts before revealing. The marker is
      // matched verbatim by ChallengeView in PaBubble.
      challenge: `Give me a harder (challenge-level) problem on ${ref}. Format your reply EXACTLY like this:

[Write the problem statement here, with all needed values. Do NOT include the answer or any solution steps in this section.]

---SOLUTION---

[Write the step-by-step solution here, ending with the final answer.]`,
      reallife: `Give me a real-life example of ${ref} used in everyday life.`,
      mistakes: `What are the common mistakes students make on ${ref}? Warn me about each one.`,
    }
    if (!prompts[chip]) return

    const opts = { fromChip: true }
    if (chip === 'challenge') opts.tagAi = { isChallenge: true }
    sendMessage(prompts[chip], opts)
  }

  // ─── UI helpers ───
  const subjectCtx = useMemo(() => {
    const last = [...messages].reverse().find(m => m.role === 'ai')
    return last?.subject || initialSubject || availableSubjects[0] || 'Science'
  }, [messages, initialSubject, availableSubjects])

  const lastAiMemoryUsed = useMemo(() => {
    const last = [...messages].reverse().find(m => m.role === 'ai' && !m.streaming)
    return !!last?.memoryUsed
  }, [messages])

  const homeData = user.homeData
  const mastery = (homeData?.subjectHealth || []).slice(0, 5).map(s => ({
    name: s.subject, pct: s.accuracy || 0,
    color: 'var(--c-accent)',
  }))
  const week = Array(7).fill(0)
  week[6] = homeData?.todayXP || 0

  // ─── Render ───
  return (
    <div className="ask-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...(homeData?.profile || {}), level: user.level || 1 }}
        streak={homeData?.streak?.current_streak || 0}
        active="ask"
        onNavigate={onNavigate}
      />

      <main className="ask-body">
        <AskHeader
          subject={subjectCtx}
          classLevel={user.studentClass || 10}
          thinking={loading}
          memoryUsed={lastAiMemoryUsed}
          onVoice={() => alert('Voice input is coming soon.')}
          onSnap={() => document.getElementById('ask-v4-file-input')?.click()}
        />

        {/* Hidden file input shared with Snap button in header */}
        <input id="ask-v4-file-input" type="file" accept="image/*" capture="environment"
          onChange={onImageSelected} style={{ display: 'none' }} />

        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--c-muted)' }}>
              <p style={{ fontSize: 15 }}>Ask Pa anything about your syllabus — type, snap a photo, or try a quick prompt below.</p>
            </div>
          )}

          {messages.map(msg => {
            if (msg.role === 'student') {
              return <StudentBubble key={msg.id} text={msg.text} imageDataUrl={msg.image} />
            }
            // AI message
            if (msg.error && msg.text) {
              return (
                <div key={msg.id} style={{ marginBottom: 20 }}>
                  <RateLimitErrorCard
                    message={msg.text}
                    onTakeQuiz={() => onNavigate?.('practice')}
                    onClearAndAsk={() => {
                      // Drop the error AI bubble + the student question that
                      // produced it. The previous one-liner used `msg.id - 1`
                      // which was NaN (msg.id is a string), and operator
                      // precedence made the filter a no-op.
                      setMessages(prev => {
                        const errIdx = prev.findIndex(m => m.id === msg.id)
                        let studentIdx = -1
                        for (let i = errIdx - 1; i >= 0; i--) {
                          if (prev[i].role === 'student') { studentIdx = i; break }
                        }
                        return prev.filter((_, i) => i !== errIdx && i !== studentIdx)
                      })
                      inputRef.current?.focus()
                    }}
                    onRetry={() => {
                      const studentIdx = messages.findIndex(m => m.id === msg.id) - 1
                      const prev = messages[studentIdx]
                      if (prev?.role === 'student' && prev.text) {
                        setMessages(curr => curr.filter(m => m.id !== msg.id))
                        sendMessage(prev.text)
                      }
                    }}
                  />
                </div>
              )
            }
            return (
              <PaBubble key={msg.id}
                msg={msg}
                onChip={handleChip}
                onCloseQuiz={(msgId) => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, showQuiz: false } : m))}
                onFeedback={handleFeedback}
                onReport={id => setReportModalFor(id)}
                onCopy={copyMessage}
                copied={copiedId === msg.id}
                className={user.studentClass}
              />
            )
          })}

          {loading && thinkingPhase && (
            <div className="thinking">
              <div className="dots"><span /><span /><span /></div>
              <span className="t-sm" style={{ color: 'var(--c-muted)' }}>{thinkingPhase}</span>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </main>

      {/* Clear chat — small text link at the top-right corner of the body */}
      {messages.length > 0 && (
        <div style={{ position: 'fixed', top: 70, right: 16, zIndex: 10 }}>
          <button onClick={clearHistory}
            style={{
              background: 'transparent', border: 'none', fontFamily: 'inherit',
              fontSize: 12, color: 'var(--c-muted)', cursor: 'pointer',
            }}>
            Clear chat
          </button>
        </div>
      )}

      <AskInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage()}
        disabled={loading}
        pendingImage={pendingImage}
        onPickImage={onImageSelected}
        onClearImage={clearPendingImage}
        onVoice={() => alert('Voice input is coming soon.')}
        inputRef={inputRef}
      />

      <FooterStrip
        xpToday={homeData?.todayXP || 0}
        xpGoal={homeData?.dailyGoal || 50}
        week={week}
        mastery={mastery}
        badges={(homeData?.badges || []).slice(0, 5).map(b => b.icon || b.emoji || '🏆')}
        totalBadges={homeData?.totalBadges || 15}
      />

      {/* Report modal */}
      {reportModalFor && (
        <div className="modal-backdrop" onClick={() => setReportModalFor(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Report this answer</h3>
            <p className="t-sm" style={{ marginBottom: 14 }}>
              Tell your teacher what's wrong. They'll review and reply with a correction.
            </p>
            <textarea
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              placeholder="e.g., 'The formula is wrong — it should be V=IR not V=I/R'"
              rows={4}
              style={{
                width: '100%', padding: 12,
                border: '1.5px solid var(--c-hair)',
                borderRadius: 12, fontFamily: 'inherit', fontSize: 14,
                resize: 'none', outline: 'none',
              }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setReportModalFor(null); setReportText('') }}
                style={{
                  padding: '10px 18px', borderRadius: 12,
                  background: 'transparent', border: '1.5px solid var(--c-hair)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  color: 'var(--c-ink)', cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button
                onClick={() => submitReport(reportModalFor)}
                disabled={!reportText.trim()}
                style={{
                  padding: '10px 18px', borderRadius: 12,
                  background: 'var(--c-accent)', color: '#fff',
                  border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 3px 0 var(--c-accent-d)',
                  opacity: reportText.trim() ? 1 : 0.5,
                }}>
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
