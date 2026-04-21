import { useState, useRef, useEffect } from 'react'
import { mockAIResponses } from '../data/mockData'
import AIOrb from '../components/AIOrb'
import XPToast from '../components/XPToast'
import RateLimitErrorCard from '../components/RateLimitErrorCard'
import { useUser } from '../context/UserContext'

// ═══ Module-level set: questions we've auto-sent in this tab/session.
// Survives React StrictMode remounts, route changes, HMR, and
// useRef resets — the ONLY reliable guard for ?q= auto-send deduping.
// Cleared when the user explicitly clears conversation history.
const AUTO_SENT_QUESTIONS = new Set()

// Monotonic counter to avoid Date.now() collisions when sendMessage
// is called 2+ times in the same millisecond (rare, but possible with
// StrictMode double-fires).
let MSG_ID_COUNTER = 0
function nextMsgId() {
  MSG_ID_COUNTER += 1
  return `msg-${Date.now()}-${MSG_ID_COUNTER}`
}

const SAMPLE_QUESTIONS_BY_SUBJECT = {
  Physics: [
    { q: "Explain Ohm's Law with formula", icon: '⚡' },
    { q: "What is the difference between series and parallel circuits?", icon: '🔌' },
    { q: "How does a concave lens form an image?", icon: '🔍' },
  ],
  Chemistry: [
    { q: "What happens when an acid reacts with a base?", icon: '🧪' },
    { q: "Explain the pH scale with examples", icon: '📊' },
    { q: "Why does milk curdle when left outside?", icon: '🥛' },
  ],
  Biology: [
    { q: "How does photosynthesis work?", icon: '🌿' },
    { q: "Explain the human digestive system", icon: '🫁' },
    { q: "What is the difference between mitosis and meiosis?", icon: '🧬' },
  ],
  Mathematics: [
    { q: "How do I solve quadratic equations?", icon: '📐' },
    { q: "Explain the Pythagoras theorem with an example", icon: '📏' },
    { q: "What are arithmetic progressions?", icon: '🔢' },
  ],
  'Computer Science': [
    { q: "What is a loop in Python?", icon: '💻' },
    { q: "Explain the difference between a list and a tuple", icon: '📋' },
    { q: "How does an if-else statement work?", icon: '🔀' },
  ],
  English: [
    { q: "Explain the difference between active and passive voice", icon: '📖' },
    { q: "What is a metaphor? Give examples", icon: '✍️' },
    { q: "How do I write a formal letter?", icon: '✉️' },
  ],
}

const DEFAULT_SAMPLES = [
  { q: "Explain a concept from your textbook", icon: '📖' },
  { q: "Help me solve a problem step by step", icon: '✏️' },
  { q: "What are the key points of this chapter?", icon: '📝' },
]

const QUICK_ACTIONS = [
  { icon: '📖', label: 'Explain a concept', prompt: 'Explain ' },
  { icon: '✏️', label: 'Solve a problem', prompt: 'Solve this: ' },
  { icon: '⚡', label: 'Quiz me on a topic', prompt: 'Quiz me on ' },
  { icon: '🔄', label: 'Help me revise', prompt: 'Revise ' },
  { icon: '✅', label: 'Check my answer', prompt: 'Check if this is correct: ' },
  { icon: '📝', label: 'Prep for a test', prompt: 'Help me prepare for a test on ' },
]

// Parse AI text into step cards
function parseSteps(text) {
  if (!text) return []
  const lines = text.split('\n')
  const steps = []
  let current = null

  for (const line of lines) {
    const stepMatch = line.match(/^\*\*Step (\d+)[^*]*\*\*$/)
    if (stepMatch) {
      if (current) steps.push(current)
      const title = line.replace(/\*\*/g, '').trim()
      current = { type: 'step', number: parseInt(stepMatch[1]), title, lines: [] }
    } else if (line.startsWith('💡') || line.startsWith('⚠️')) {
      if (current) steps.push(current)
      current = null
      steps.push({ type: 'tip', content: line.replace(/\*/g, '').trim() })
    } else if (current) {
      if (line.trim()) current.lines.push(line.replace(/\*\*/g, ''))
    } else if (line.trim() && !line.startsWith('⚠️')) {
      // Intro line before steps
      if (steps.length === 0) {
        steps.push({ type: 'intro', content: line.replace(/\*\*/g, '').trim() })
      }
    }
  }
  if (current) steps.push(current)
  return steps.filter(s => s.type !== 'intro' || s.content)
}

function StepCard({ step, index, total }) {
  if (step.type === 'tip') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-700 leading-relaxed">{step.content}</p>
      </div>
    )
  }
  if (step.type === 'intro') {
    return (
      <div className="bg-white rounded-xl px-4 py-3 shadow-card border border-white">
        <p className="text-sm text-brand-navy leading-relaxed">{step.content}</p>
      </div>
    )
  }
  // step card
  return (
    <div className="bg-white rounded-xl px-4 py-3.5 shadow-card border border-white animate-step-reveal" style={{ animationDelay: `${index * 120}ms` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 bg-brand-primary/10 rounded-full flex items-center justify-center">
          <span className="text-[10px] font-black text-brand-primary">{step.number}</span>
        </div>
        <span className="text-xs font-bold text-brand-primary">{step.title}</span>
      </div>
      <div className="space-y-1">
        {step.lines.map((line, i) => (
          <p key={i} className="text-sm text-brand-navy leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  )
}

// Inline quiz card after "Quiz me"
function InlineQuiz({ context, subject, className, onAnswer, onClose }) {
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(''); setQuiz(null); setSelected(null); setSubmitted(false)
      const token = getToken()
      if (!token) { setError('Not authenticated'); setLoading(false); return }
      try {
        const r = await fetch('/api/ai/practice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: context || '',
            subject: subject || 'Physics',
            className: className || 10,
            count: 1,
          }),
        })
        const data = await r.json()
        if (cancelled) return
        if (!r.ok) { setError(data.error || 'Failed to generate quiz'); setLoading(false); return }
        if (data.questions?.[0]) setQuiz(data.questions[0])
        else setError('No quiz returned')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Quiz failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [context, reloadKey])

  const QuizHeader = () => (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold text-brand-primary">Quick quiz ⚡</span>
      <button onClick={onClose} className="text-[11px] text-brand-slate hover:text-brand-navy font-medium">
        Close ×
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="bg-brand-light border border-brand-pale/30 rounded-xl p-4">
        <QuizHeader />
        <p className="text-xs text-brand-slate italic">Generating a question on this topic...</p>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <QuizHeader />
        <p className="text-xs text-red-600 mb-2">Couldn't generate quiz: {error}</p>
        <button onClick={() => setReloadKey(k => k + 1)}
          className="text-xs font-semibold text-brand-primary underline">
          Try again
        </button>
      </div>
    )
  }

  const isCorrect = submitted && selected === quiz.correctIndex

  return (
    <div className="bg-brand-light border border-brand-pale/30 rounded-xl p-4">
      <QuizHeader />
      <p className="text-sm font-semibold text-brand-navy mb-3">{quiz.question}</p>
      <div className="space-y-2 mb-3">
        {quiz.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !submitted && setSelected(i)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
              submitted
                ? i === quiz.correctIndex ? 'bg-brand-success/10 border-brand-success text-emerald-800'
                  : selected === i ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 text-gray-400'
                : selected === i
                ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                : 'bg-white border-gray-200 text-brand-navy'
            }`}
          >
            <span className="inline-block w-5 h-5 rounded-full bg-current opacity-20 mr-2 text-center text-[10px] leading-5 font-bold">{String.fromCharCode(65 + i)}</span>
            {opt}
          </button>
        ))}
      </div>
      {!submitted ? (
        <button
          disabled={selected === null}
          onClick={() => { setSubmitted(true); onAnswer?.(selected === quiz.correctIndex) }}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${selected !== null ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-400'}`}
        >
          Check
        </button>
      ) : (
        <>
          <div className={`text-xs font-semibold px-3 py-2 rounded-xl ${isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {isCorrect
              ? `✓ Correct! ${quiz.explanation || ''}`
              : `Not quite — the answer is ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.explanation || ''}`
            }
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white border border-brand-primary/30 text-brand-primary hover:bg-brand-light transition-colors">
              Try another question ↻
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors">
              Done
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Visual Explanation bubble per UI Spec Screen 19
function VisualExplanationBubble({ html, loading, error, cached, onRetry }) {
  const [expanded, setExpanded] = useState(false)
  const [iframeHeight, setIframeHeight] = useState(200)
  const iframeRef = useRef(null)

  // Auto-size the iframe to its content
  useEffect(() => {
    if (!html || !iframeRef.current) return
    const iframe = iframeRef.current
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          const h = Math.min(500, Math.max(180, doc.body.scrollHeight + 20))
          setIframeHeight(h)
        }
      } catch {}
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [html])

  if (loading) {
    return (
      <div className="border-2 border-teal-300 rounded-xl p-4 bg-teal-50/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs font-bold text-teal-700">Visual Explanation</span>
        </div>
        <p className="text-xs text-teal-600 italic">Generating visual...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-2 border-amber-200 rounded-xl p-4 bg-amber-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-800">Visual Explanation</span>
        </div>
        <p className="text-xs text-amber-700 mb-2">
          Visual explanation could not be generated for this concept. Try asking for a step-by-step explanation instead.
        </p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs font-semibold text-amber-800 underline">
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!html) return null

  // Wrap with responsive CSS that forces SVGs to scale even if the LLM forgot width="100%"
  const wrappedHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow:hidden}
body{padding:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827}
svg{max-width:100%;height:auto;display:block}
img{max-width:100%}
div{max-width:100%}
</style></head><body>${html}</body></html>`

  return (
    <>
      <div className="border-2 border-teal-300 rounded-xl p-3 bg-white relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-xs font-bold text-teal-700">Visual Explanation</span>
            {cached && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-bold">
                Cached ⚡
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onRetry && (
              <button onClick={onRetry} title="Generate a different visual"
                className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                Regenerate ↻
              </button>
            )}
            <button
              onClick={() => setExpanded(true)}
              title="Expand to full screen"
              className="text-xs text-teal-600 hover:text-teal-800 font-medium">
              Expand ⛶
            </button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={wrappedHtml}
          sandbox="allow-scripts"
          className="w-full rounded-lg border-0 bg-white"
          style={{ height: iframeHeight, maxWidth: 480 }}
          title="Visual explanation"
        />
      </div>

      {/* Fullscreen modal (UI spec 19.2: expand button opens centered full-screen modal) */}
      {expanded && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-sm font-bold text-teal-700">Visual Explanation</span>
              <button onClick={() => setExpanded(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
                Close ×
              </button>
            </div>
            <iframe
              srcDoc={wrappedHtml}
              sandbox="allow-scripts"
              className="flex-1 w-full rounded-lg border border-gray-100 bg-white"
              style={{ minHeight: 400 }}
              title="Visual explanation (expanded)"
            />
          </div>
        </div>
      )}
    </>
  )
}

// Render AI response text with basic markdown support (headings, bold, paragraphs, bullets, light LaTeX cleanup)
function AIResponseContent({ text }) {
  if (!text) return null
  // Split into paragraphs (double newline) or single-line blocks
  const blocks = text.split(/\n\n+/).filter(b => b.trim())
  return (
    <div className="space-y-2.5 text-sm text-brand-navy leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(l => l.trim())

        // Heading: starts with ## or ### (markdown heading)
        if (lines[0] && /^#{1,6}\s/.test(lines[0])) {
          const level = lines[0].match(/^(#{1,6})/)[1].length
          const headingText = lines[0].replace(/^#{1,6}\s+/, '')
          const restLines = lines.slice(1)
          const sizeClass = level <= 2 ? 'text-base font-semibold' : 'text-sm font-semibold'
          return (
            <div key={bi}>
              <h4 className={`${sizeClass} text-brand-navy pt-1 pb-0.5`}
                dangerouslySetInnerHTML={{ __html: inlineMarkup(headingText) }} />
              {restLines.length > 0 && (
                <p dangerouslySetInnerHTML={{
                  __html: restLines.map(l => inlineMarkup(l)).join('<br/>')
                }} />
              )}
            </div>
          )
        }

        // Bullet list (lines start with - or *)
        const isBulletList = lines.every(l => /^\s*[-*]\s+/.test(l))
        if (isBulletList) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1">
              {lines.map((l, li) => (
                <li key={li} dangerouslySetInnerHTML={{ __html: inlineMarkup(l.replace(/^\s*[-*]\s+/, '')) }} />
              ))}
            </ul>
          )
        }

        // Bold-only single-line heading (**Title**)
        if (lines.length === 1 && /^\*\*.+\*\*:?$/.test(lines[0])) {
          return <h4 key={bi} className="font-semibold text-brand-navy pt-1" dangerouslySetInnerHTML={{ __html: inlineMarkup(lines[0]) }} />
        }

        // Regular paragraph -- preserve single-line breaks
        return (
          <p key={bi} dangerouslySetInnerHTML={{
            __html: lines.map(l => inlineMarkup(l)).join('<br/>')
          }} />
        )
      })}
    </div>
  )
}

// Convert common LaTeX to Unicode (defensive fallback if the LLM still uses $...$)
function stripLatex(s) {
  return s
    // Remove $ delimiters
    .replace(/\${1,2}([^$]+)\${1,2}/g, '$1')
    // Common LaTeX commands → Unicode
    .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
    .replace(/\\theta/g, 'θ').replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
    .replace(/\\pi/g, 'π').replace(/\\Omega/g, 'Ω').replace(/\\omega/g, 'ω')
    .replace(/\\Delta/g, 'Δ').replace(/\\delta/g, 'δ').replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'µ').replace(/\\phi/g, 'φ').replace(/\\circ/g, '°')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\cdot/g, '·')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\approx/g, '≈').replace(/\\neq/g, '≠')
    .replace(/\\sqrt/g, '√').replace(/\\infty/g, '∞')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\\(/g, '').replace(/\\\)/g, '')
    .replace(/\\\[/g, '').replace(/\\\]/g, '')
    // Stray backslashes before letters = strip the backslash
    .replace(/\\([a-zA-Z]+)/g, '$1')
}

// Inline markup: **bold**, *italic*, `code` + LaTeX cleanup
function inlineMarkup(s) {
  return stripLatex(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-brand-primary px-1 py-0.5 rounded text-[13px]">$1</code>')
    // Only match *italic* if surrounded by word boundaries (avoid mid-word * like F = BIL*sin)
    .replace(/(^|\s)\*([^\s*].+?)\*(\s|$|[.,;:!?])/g, '$1<em>$2</em>$3')
}

function TypingDots() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-brand-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-brand-slate">Thinking…</span>
    </div>
  )
}

function getAIResponse(question) {
  const q = question.toLowerCase()
  if (q.includes('osmosis')) return mockAIResponses.osmosis.default
  if (q.includes("ohm") || q.includes("resistance") || q.includes("v=ir")) return mockAIResponses.ohmsLaw.default
  if (q.includes('quadratic') || q.includes('equation')) return mockAIResponses.quadratic.default
  return `**Step 1 — Identify the concept**
This is a core topic in your CBSE Class 10 syllabus.

**Step 2 — Break it down**
Start by identifying what you know. List the given values and what you need to find.

**Step 3 — Apply the formula**
Use the standard CBSE formula for this topic. Remember to include units.

**Step 4 — Solve and verify**
Work through step by step. Check your answer makes physical sense.

💡 *Tip: Write what's given, what's asked, and the formula before solving — this alone gets you 1 mark.*`
}

// Dual-loop thinking phases per UI spec 6.1
const ANALYSIS_PHASES = [
  'Analysing your question...',
  'Identifying the concept...',
  'Checking what usually confuses students here...',
]
const SOLVE_PHASES = [
  'Building your explanation...',
  'Adding step-by-step breakdown...',
]

// Lightweight subject detection from question text (no LLM call)
const SUBJECT_KEYWORDS = {
  'Physics': ['force', 'velocity', 'acceleration', 'gravity', 'magnet', 'magnetic', 'electric', 'current', 'voltage', 'resistance', 'ohm', 'circuit', 'lens', 'mirror', 'reflection', 'refraction', 'wave', 'sound', 'light', 'energy', 'power', 'watt', 'joule', 'newton', 'momentum', 'friction', 'pressure'],
  'Chemistry': ['acid', 'base', 'salt', 'pH', 'reaction', 'chemical', 'element', 'compound', 'molecule', 'atom', 'ion', 'metal', 'non-metal', 'periodic', 'oxidation', 'reduction', 'corrosion', 'carbon', 'hydrogen', 'oxygen', 'nitrogen', 'sulphur', 'ethanol', 'methane', 'soap', 'detergent', 'milk', 'fermentation', 'curd', 'spoilage', 'bacteria'],
  'Biology': ['cell', 'tissue', 'organ', 'photosynthesis', 'respiration', 'digestion', 'nutrition', 'excretion', 'reproduction', 'heredity', 'evolution', 'ecosystem', 'biodiversity', 'dna', 'gene', 'chromosome', 'plant', 'animal', 'blood', 'heart', 'brain', 'kidney', 'liver', 'hormone', 'enzyme', 'transportation', 'transport', 'circulation', 'circulatory', 'lung', 'stomach', 'intestine', 'nerve', 'nervous', 'muscle', 'human being', 'organism', 'species', 'habitat', 'food chain', 'nephron', 'xylem', 'phloem', 'stomata'],
  'Mathematics': ['equation', 'polynomial', 'quadratic', 'triangle', 'circle', 'area', 'volume', 'probability', 'statistics', 'mean', 'median', 'mode', 'trigonometry', 'sin', 'cos', 'tan', 'pythagoras', 'theorem', 'proof', 'algebra', 'arithmetic', 'geometric', 'sequence', 'matrix', 'prime', 'factor', 'factoris', 'hcf', 'lcm', 'gcd', 'divisor', 'multiple', 'remainder', 'euclid', 'integer', 'rational', 'irrational', 'real number', 'decimal', 'fraction', 'percentage', 'ratio', 'proportion', 'zero of', 'zeroes', 'coefficient', 'coordinate', 'axis', 'slope', 'distance', 'midpoint', 'similar triangle', 'congruent', 'tangent', 'secant', 'chord', 'surface area'],
  'Computer Science': ['algorithm', 'program', 'code', 'python', 'java', 'loop', 'function', 'array', 'variable', 'database', 'SQL', 'HTML', 'CSS', 'network', 'internet', 'binary', 'boolean'],
  'English': ['grammar', 'tense', 'noun', 'verb', 'adjective', 'adverb', 'essay', 'comprehension', 'poem', 'poetry', 'prose', 'literature', 'letter', 'writing', 'speech'],
}

function detectSubject(question, availableSubjects) {
  if (!question) return null
  const lower = question.toLowerCase()
  let bestMatch = null
  let bestScore = 0
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    if (!availableSubjects.includes(subject)) continue
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) { bestScore = score; bestMatch = subject }
  }
  return bestScore >= 1 ? bestMatch : null
}

function getToken() {
  const sessionStr = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!sessionStr) return null
  try {
    const session = JSON.parse(localStorage.getItem(sessionStr))
    return session?.access_token || session?.currentSession?.access_token || null
  } catch { return null }
}

export default function DoubtSolverScreen({ onNavigate, initialQuestion, initialSubject }) {
  const user = useUser()

  // Available subjects for auto-detection
  const availableSubjects = user.selectedSubjects?.length > 0
    ? user.selectedSubjects
    : ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English']

  const [input, setInput] = useState('')
  // Hydrate messages from localStorage (last session) so conversations persist across refresh.
  // Sanitize: drop any orphaned `streaming: true` messages with no text — those are from a
  // previous session that was closed mid-stream and would otherwise collide with new streams.
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('padee-ask-ai-messages')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // Drop orphaned empty-text AI messages from prior broken sessions.
          // Also drop the trailing student message if its AI response never landed,
          // so re-ask is clean (no "replying to ghost" state).
          const pruned = []
          for (let i = 0; i < parsed.length; i++) {
            const m = parsed[i]
            const isEmptyAi = m.role === 'ai' && (!m.text || !m.text.trim())
            if (isEmptyAi) {
              // Also drop the immediately-preceding student message (unanswered)
              if (pruned.length && pruned[pruned.length - 1].role === 'student') {
                pruned.pop()
              }
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
  const [xpVisible, setXpVisible] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [usage, setUsage] = useState({ count: 0, limit: 10 })
  const [feedbackState, setFeedbackState] = useState({}) // { [msgId]: { helpful: true/false, reasonPicked } }
  const [reportModalFor, setReportModalFor] = useState(null) // msgId being reported
  const [reportText, setReportText] = useState('')
  // Mobile chip overflow
  const [chipsExpanded, setChipsExpanded] = useState(false)
  // Per-message copy confirmation
  const [copiedId, setCopiedId] = useState(null)
  // Photo doubt (Llama-3.2-Vision)
  const [pendingImage, setPendingImage] = useState(null) // { dataUrl, name, size }
  const fileInputRef = useRef(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  // Track mount state so the async stream reader doesn't setState after unmount
  // (which would silently drop text updates and leave an empty bubble forever).
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Persist messages across refresh (cap at last 30 to keep localStorage tidy).
  // Also strip `streaming: true` from persisted copy so a mid-stream page close/HMR
  // can't leave an orphan placeholder that collides with the next session.
  useEffect(() => {
    try {
      const tail = messages.slice(-30).map(m =>
        m.streaming ? { ...m, streaming: false } : m
      )
      localStorage.setItem('padee-ask-ai-messages', JSON.stringify(tail))
    } catch {}
  }, [messages])


  function clearHistory() {
    if (!confirm('Clear all messages in this session?')) return
    setMessages([])
    setShowQuiz(false)
    setFeedbackState({})
    // Reset auto-sent tracker so user can re-ask any question fresh
    AUTO_SENT_QUESTIONS.clear()
  }

  async function copyMessage(msgId, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(msgId)
      setTimeout(() => setCopiedId(c => c === msgId ? null : c), 1500)
    } catch {}
  }

  // Load usage count on mount
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch('/api/ai/usage', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setUsage)
      .catch(() => {})
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-send when ?question= is present.
  // Uses the module-level AUTO_SENT_QUESTIONS set (defined at top of file)
  // because:
  //   - useRef resets on StrictMode's simulated remount → can't use refs
  //   - useState's initial closure is stale in multi-fire scenarios
  //   - messages-state check fails when state hasn't flushed between fires
  // Module-level Set survives ALL lifecycle tricks. Cleared on explicit "Clear".
  useEffect(() => {
    if (!initialQuestion) return
    if (AUTO_SENT_QUESTIONS.has(initialQuestion)) return
    AUTO_SENT_QUESTIONS.add(initialQuestion)
    // If the question is already in hydrated history, don't re-send (just show history)
    const alreadyInHistory = messages.some(m => m.role === 'student' && m.text === initialQuestion)
    if (alreadyInHistory) return
    sendMessage(initialQuestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion])

  const sendMessage = async (text = input) => {
    // Guard against duplicate submissions / re-entry while streaming
    if (loading) return
    const question = (typeof text === 'string' ? text : input).trim()
    // Allow sending if we have either text OR a pending image
    if (!question && !pendingImage) return
    const imageToSend = pendingImage

    // Auto-detect subject from question text (no manual selector needed)
    // Subject precedence: (1) explicit initialSubject from Learn screen click (most reliable —
    // the Learn catalog knows exactly which subject each concept belongs to),
    // (2) keyword-based detection on the question text,
    // (3) first of the student's selected subjects (weakest fallback).
    // Without (1), questions like "Prime Factorisation" match no keywords and
    // fall through to the first selected subject — which silently breaks RAG.
    const effectiveSubject = initialSubject
      || detectSubject(question, availableSubjects)
      || availableSubjects[0]
      || 'Physics'

    setInput('')
    setPendingImage(null)
    setShowQuiz(false)
    setLoading(true)

    // Capture conversation history BEFORE adding new student message
    // Send last 6 turns (3 Q&A pairs) to stay within context budget
    const history = messages
      .filter(m => m.text && m.text.trim())
      .slice(-6)
      .map(m => ({ role: m.role === 'student' ? 'user' : 'assistant', content: m.text }))

    const studentId = nextMsgId()
    setMessages(prev => [...prev, {
      role: 'student',
      text: question,
      image: imageToSend?.dataUrl || null,
      id: studentId,
    }])

    // Dual-loop thinking state (UI spec 6.1)
    let phaseIdx = 0
    setThinkingPhase(ANALYSIS_PHASES[0])
    const phaseTimer = setInterval(() => {
      phaseIdx++
      const allPhases = [...ANALYSIS_PHASES, ...SOLVE_PHASES]
      if (phaseIdx < allPhases.length) setThinkingPhase(allPhases[phaseIdx])
    }, 700)

    const token = getToken()

    if (token) {
      // Real streaming API call
      const aiId = nextMsgId()
      setMessages(prev => [...prev, { role: 'ai', text: '', steps: [], id: aiId, streaming: true }])

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
        })

        // First chunk arrived -- stop thinking animation
        clearInterval(phaseTimer)
        setThinkingPhase('')
        setLoading(false)

        // Phase 1: no usage cap, but keep handler for any future error responses
        if (resp.status === 429) {
          setMessages(prev => prev.map(m => m.id === aiId
            ? { ...m, text: 'Rate limit hit. Please try again in a moment.', streaming: false }
            : m
          ))
          return
        }

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let buffer = ''   // buffers partial SSE lines across chunk boundaries

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          // Split on newline, keep the trailing partial line in the buffer
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '')  // tolerate \r\n SSE framing
            if (!line) continue
            if (line === 'data: [DONE]') continue
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6))
                if (d.error) {
                  // Surface backend errors (rate limits, upstream failures) to the user
                  const friendly = /rate limit/i.test(d.error)
                    ? "I've hit the AI provider's rate limit. Please try again in a few minutes."
                    : /quota/i.test(d.error)
                      ? "AI quota exhausted for today. Try again tomorrow or contact admin."
                      : `Something went wrong: ${String(d.error).slice(0, 200)}`
                  setMessages(prev => prev.map(m => m.id === aiId
                    ? { ...m, text: friendly, streaming: false, error: true }
                    : m
                  ))
                  continue
                }
                if (d.text) {
                  fullText += d.text
                  setMessages(prev => prev.map(m => m.id === aiId
                    ? { ...m, text: fullText, steps: parseSteps(fullText) }
                    : m
                  ))
                }
                if (d.sessionId) {
                  setMessages(prev => prev.map(m => m.id === aiId
                    ? { ...m, sessionId: d.sessionId, ncertSource: d.ncertSource, memoryUsed: d.memoryUsed, streaming: false }
                    : m
                  ))
                }
              } catch {}
            }
          }
        }
        // Safety: if the stream ended without any text or error, mark as error
        setMessages(prev => prev.map(m => {
          if (m.id !== aiId) return m
          if (!m.text || m.text.trim() === '') {
            return { ...m, text: 'No response received. The AI service may be temporarily unavailable. Please try again.', streaming: false, error: true }
          }
          return { ...m, streaming: false }
        }))
        setXpVisible(true)
        // Refresh user state → triggers level-up / badge celebration if unlocked
        user.refreshUser?.()
        // Refresh usage count after successful doubt
        fetch('/api/ai/usage', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(setUsage).catch(() => {})
      } catch (err) {
        clearInterval(phaseTimer); setThinkingPhase(''); setLoading(false)
        // Fallback to mock on error
        const aiText = getAIResponse(question)
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, text: aiText, steps: parseSteps(aiText), streaming: false }
          : m
        ))
      }
    } else {
      // No auth token -- use mock data
      await new Promise(r => setTimeout(r, 1100))
      clearInterval(phaseTimer); setThinkingPhase('')
      const aiText = getAIResponse(question)
      const steps = parseSteps(aiText)
      setLoading(false)
      setMessages(prev => [...prev, { role: 'ai', text: aiText, steps, id: nextMsgId() }])
      setXpVisible(true)
    }
  }

  // Photo doubt handlers
  function openCamera() {
    fileInputRef.current?.click()
  }

  function onImageSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Max 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      setPendingImage({ dataUrl: ev.target.result, name: file.name, size: file.size })
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected later
    e.target.value = ''
  }

  function clearPendingImage() {
    setPendingImage(null)
  }

  // Quality signal handlers (UI spec 6.3)
  async function handleFeedback(msgId, helpful, reason) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.sessionId) return
    setFeedbackState(prev => ({ ...prev, [msgId]: { helpful, reasonPicked: reason || null } }))
    const token = getToken()
    if (!token) return
    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: msg.sessionId, helpful, reason: reason || null }),
    }).catch(() => {})
  }

  async function submitReport(msgId) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg || !reportText.trim()) return
    const token = getToken()
    if (!token) return
    await fetch('/api/ai/flag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: msg.sessionId,
        questionText: messages.find(m => m.role === 'student' && m.id < msg.id)?.text || '',
        aiResponse: msg.text,
        subject: (availableSubjects[0] || 'Physics'),
        classLevel: user.studentClass || 10,
        reportText,
      }),
    }).catch(() => {})
    setFeedbackState(prev => ({ ...prev, [msgId]: { ...prev[msgId], reported: true } }))
    setReportModalFor(null)
    setReportText('')
  }

  const handleChip = async (chip) => {
    if (chip === 'quiz') { setShowQuiz(q => !q); return }  // toggle
    if (chip === 'visual' || chip === 'visual:force') {
      // Generate visual explanation (UI spec Screen 19)
      const last = [...messages].reverse().find(m => m.role === 'ai' && m.text)
      if (!last) return
      // Find the student's most recent question (the one that prompted this AI response)
      const lastQuestion = [...messages]
        .filter(m => m.role === 'student' && m.id < last.id)
        .pop()?.text || ''
      // Show loading state on the message
      setMessages(prev => prev.map(m => m.id === last.id
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
            context: last.text,
            question: lastQuestion,
            subject: (availableSubjects[0] || 'Physics'),
            className: user.studentClass || 10,
            force: chip === 'visual:force',
          }),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Visual generation failed')
        setMessages(prev => prev.map(m => m.id === last.id
          ? { ...m, visualLoading: false, visualHtml: data.html, visualCached: data.cached }
          : m
        ))
      } catch (err) {
        setMessages(prev => prev.map(m => m.id === last.id
          ? { ...m, visualLoading: false, visualError: err.message || 'Failed' }
          : m
        ))
      }
      return
    }
    // Find the most recent student topic so chip prompts reference it explicitly.
    // Generic chip prompts ("this concept") let the LLM drift to memory-referenced
    // topics — e.g. a follow-up on Ohm's Law would answer about Polynomials if the
    // student had recently asked a Polynomials question. Interpolating the actual
    // topic text also gives detectSubject() a keyword to latch onto.
    let lastTopic = null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'student' && m.text?.trim()) {
        lastTopic = m.text.trim().slice(0, 150)
        break
      }
    }
    const ref = lastTopic ? `"${lastTopic}"` : 'the concept we just discussed'
    const prompts = {
      simpler:  `Explain ${ref} again but simpler — use a real-life analogy a Class 10 student can relate to.`,
      exam:     `Give me the CBSE board exam model answer for ${ref} — include keyword highlights and mark distribution.`,
      similar:  `Give me a similar practice question on the same concept as ${ref}.`,
      challenge:`Give me a harder (challenge-level) problem on ${ref}, with a step-by-step solution.`,
      reallife: `Give me a real-life example of ${ref} used in everyday life.`,
      mistakes: `What are the common mistakes students make on ${ref}? Warn me about each one.`,
    }
    sendMessage(prompts[chip])
  }

  const empty = messages.length === 0
  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai')

  return (
    <div className="flex flex-col h-screen bg-brand-bg">
      <XPToast xp={10} label="Doubt solved" visible={xpVisible} onDone={() => setXpVisible(false)} />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/60 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('home')} className="w-8 h-8 flex items-center justify-center text-brand-slate hover:text-brand-navy transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <AIOrb size="xs" state={loading ? 'thinking' : 'idle'} />
            <span className="font-black text-brand-navy text-base">Ask AI</span>
          </div>
          {/* Subject auto-detected from question — shown as badge after AI responds */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-brand-slate bg-white px-2 py-0.5 rounded-full border border-gray-200">Class {user.studentClass || 10}</span>
          </div>
          {/* Clear chat button (only visible if there are messages) */}
          {messages.length > 0 && (
            <button onClick={clearHistory}
              title="Clear conversation history"
              className="text-[11px] text-gray-400 hover:text-red-500 font-medium ml-2">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {empty && (
          <div className="flex flex-col items-center pt-4 animate-fade-in">
            <AIOrb size="lg" state="idle" className="mb-4" />
            <h2 className="font-black text-brand-navy text-lg text-center mb-1">
              {initialSubject ? `Let's work on ${initialSubject}` : 'What do you need help with?'}
            </h2>
            <p className="text-brand-slate text-sm text-center mb-4 max-w-xs">
              {initialSubject ? `Ask any ${initialSubject} doubt or pick a sample question below` : 'Ask me anything from your syllabus, or pick an action below'}
            </p>

            {/* Quick action grid -- click pre-fills input, focuses, and shows a smart hint */}
            <div className="w-full grid grid-cols-3 gap-2 mb-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(action.prompt)
                    setTimeout(() => {
                      const el = inputRef.current
                      if (el) {
                        el.focus()
                        // Move cursor to end so the student types right after the seed
                        const len = el.value.length
                        el.setSelectionRange(len, len)
                      }
                    }, 50)
                  }}
                  className="flex flex-col items-center gap-1.5 bg-white rounded-xl px-2 py-3 shadow-card hover:shadow-card-hover transition-shadow active:scale-95"
                >
                  <span className="text-xl">{action.icon}</span>
                  <span className="text-[10px] text-brand-navy font-semibold text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
            {input && (
              <p className="text-[11px] text-brand-slate mb-3 text-center">
                Type the topic after "<strong>{input.trim()}</strong>" and hit Enter →
              </p>
            )}

            {/* Photo upload */}
            <button onClick={openCamera}
              className="w-full flex items-center gap-3 bg-brand-light border border-brand-pale/30 rounded-xl px-4 py-3 mb-4 active:scale-[0.98] transition-transform">
              <span className="text-xl">📸</span>
              <div className="text-left">
                <p className="text-sm font-bold text-brand-navy">Snap a problem from your textbook</p>
                <p className="text-[11px] text-brand-slate">Take a photo and I'll solve it</p>
              </div>
            </button>

            {/* Sample questions (dynamic based on subject context) */}
            <div className="w-full">
              <p className="text-[11px] font-bold text-brand-slate uppercase tracking-wider mb-2 px-1">
                {initialSubject ? `Try asking — ${initialSubject}` : 'Try asking'}
              </p>
              <div className="space-y-2">
                {(SAMPLE_QUESTIONS_BY_SUBJECT[initialSubject] || SAMPLE_QUESTIONS_BY_SUBJECT[availableSubjects[0]] || DEFAULT_SAMPLES).map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(sq.q)}
                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 text-left shadow-card hover:shadow-card-hover transition-shadow active:scale-[0.98]"
                  >
                    <span className="text-lg">{sq.icon}</span>
                    <span className="text-sm text-brand-navy font-medium flex-1">{sq.q}</span>
                    <span className="text-brand-slate text-lg">›</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'student' ? (
              <div className="max-w-[78%] bg-gradient-to-br from-brand-primary to-brand-mid text-white rounded-xl rounded-tr-sm px-4 py-3 shadow-sm">
                {msg.image && (
                  <img src={msg.image} alt="Your photo"
                    className="rounded-lg mb-2 max-w-full"
                    style={{ maxHeight: 240 }} />
                )}
                {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AIOrb size="xs" state={msg.streaming ? 'thinking' : 'idle'} />
                  <span className="text-xs font-bold text-brand-primary">AI Tutor</span>
                  {/* Memory-aware personalisation indicator (UI spec 6.6) */}
                  {msg.memoryUsed && !msg.streaming && (
                    <span className="flex items-center gap-1 text-[11px] text-brand-slate font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      Remembering your profile
                    </span>
                  )}
                </div>

                {/* Error state: show actionable card with retry/quiz/different-question actions */}
                {msg.error && msg.text ? (
                  <RateLimitErrorCard
                    message={msg.text}
                    onTakeQuiz={() => {
                      const weakest = [...(user.homeData?.subjectHealth || [])]
                        .filter(s => s.accuracy != null).sort((a, b) => a.accuracy - b.accuracy)[0]
                      const subj = weakest?.subject || user.selectedSubjects?.[0] || 'Physics'
                      onNavigate('practice', { subject: subj, count: 5 })
                    }}
                    onClearAndAsk={() => {
                      // Remove the error message and focus input so they can type fresh
                      setMessages(prev => prev.filter(m => m.id !== msg.id && !(m.role === 'student' && m.id === msg.id - 1)))
                      inputRef.current?.focus()
                    }}
                    onRetry={() => {
                      // Re-send the LAST student question that preceded this error
                      const studentIdx = messages.findIndex(m => m.id === msg.id) - 1
                      const prev = messages[studentIdx]
                      if (prev?.role === 'student' && prev.text) {
                        setMessages(curr => curr.filter(m => m.id !== msg.id))  // remove error card
                        sendMessage(prev.text)
                      }
                    }}
                  />
                ) : msg.text && (
                  <div className="bg-white rounded-xl px-4 py-3.5 shadow-card border border-white relative group">
                    <AIResponseContent text={msg.text} />
                    {msg.streaming && (
                      <span className="inline-block w-1 h-4 bg-teal-500 ml-0.5 animate-pulse align-middle" />
                    )}
                    {/* Copy button -- shown on hover for non-streaming AI bubbles */}
                    {!msg.streaming && msg.text && (
                      <button
                        onClick={() => copyMessage(msg.id, msg.text)}
                        title="Copy answer to clipboard"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                      >
                        {copiedId === msg.id ? '✓ Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                )}

                {/* Optional step cards -- only show if AI used Step N formatting AND we have 2+ real steps */}
                {msg.steps?.filter(s => s.type === 'step').length >= 2 && msg.steps?.map((step, si) => (
                  <StepCard key={si} step={step} index={si} total={msg.steps.length} />
                ))}

                {/* Inline quiz slot (UI spec 6.2 "Quiz Me" chip) */}
                {showQuiz && i === messages.length - 1 && (
                  <InlineQuiz
                    context={msg.text}
                    subject={(availableSubjects[0] || 'Physics')}
                    className={user.studentClass || 10}
                    onAnswer={() => {}}
                    onClose={() => setShowQuiz(false)}
                  />
                )}

                {/* Visual explanation bubble (UI spec Screen 19) */}
                {(msg.visualLoading || msg.visualHtml || msg.visualError) && (
                  <VisualExplanationBubble
                    html={msg.visualHtml}
                    loading={msg.visualLoading}
                    error={msg.visualError}
                    cached={msg.visualCached}
                    onRetry={() => handleChip('visual:force')}
                  />
                )}

                {/* NCERT source citation (UI spec 6.5) */}
                {msg.ncertSource && !msg.streaming && (
                  <p className="text-[11px] text-teal-700/70 mt-1 px-1 font-medium">
                    Source: {msg.ncertSource}
                  </p>
                )}

                {/* Action chips per UI spec 6.2 -- always visible on last AI message */}
                {i === messages.length - 1 && !msg.streaming && msg.text && (() => {
                  // Spec 6.2: desktop shows all in scroll row; mobile shows first 4 + More overflow.
                  // Always include 'visual' in the first 4.
                  const allChips = [
                    { key: 'visual',    label: 'Explain visually ✨' },
                    { key: 'simpler',   label: 'Explain simpler 🧠' },
                    { key: 'exam',      label: 'Show exam answer 📝' },
                    { key: 'quiz',      label: 'Quiz me ⚡' },
                    { key: 'similar',   label: 'Similar question 🔁' },
                    { key: 'challenge', label: 'Challenge me 🎯' },
                    { key: 'reallife',  label: 'Real-life example 🌍' },
                    { key: 'mistakes',  label: 'Common mistakes ⚠️' },
                  ]
                  const renderChip = (chip) => {
                    const isActive =
                      (chip.key === 'quiz' && showQuiz) ||
                      (chip.key === 'visual' && (msg.visualLoading || msg.visualHtml))
                    const isLoading = chip.key === 'visual' && msg.visualLoading
                    return (
                      <button
                        key={chip.key}
                        onClick={() => handleChip(chip.key)}
                        disabled={isLoading}
                        className={`text-xs border font-semibold px-3 py-1.5 rounded-full transition-colors active:scale-95 shadow-sm disabled:opacity-60 whitespace-nowrap ${
                          isActive
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white border-gray-200 text-brand-primary hover:bg-brand-light hover:border-brand-primary/30'
                        }`}
                      >
                        {isLoading ? 'Generating visual...' : chip.label}
                      </button>
                    )
                  }
                  return (
                    <>
                      {/* Mobile (<sm): first 4 + More button */}
                      <div className="sm:hidden flex flex-wrap gap-2 mt-2">
                        {allChips.slice(0, 4).map(renderChip)}
                        {!chipsExpanded && allChips.length > 4 && (
                          <button onClick={() => setChipsExpanded(true)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">
                            More ↓
                          </button>
                        )}
                        {chipsExpanded && allChips.slice(4).map(renderChip)}
                      </div>
                      {/* Desktop (sm+): all chips wrap */}
                      <div className="hidden sm:flex flex-wrap gap-2 mt-2">
                        {allChips.map(renderChip)}
                      </div>
                    </>
                  )
                })()}

                {/* Quality signal buttons (UI spec 6.3) */}
                {!msg.streaming && msg.text && msg.sessionId && (
                  <div className="flex items-center gap-3 mt-2 px-1">
                    <button
                      onClick={() => handleFeedback(msg.id, true)}
                      className={`text-[11px] font-medium transition-colors ${
                        feedbackState[msg.id]?.helpful === true
                          ? 'text-teal-600' : 'text-gray-400 hover:text-teal-500'
                      }`}
                    >
                      {feedbackState[msg.id]?.helpful === true ? '👍 Helpful' : '👍 Helpful'}
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, false)}
                      className={`text-[11px] font-medium transition-colors ${
                        feedbackState[msg.id]?.helpful === false
                          ? 'text-amber-600' : 'text-gray-400 hover:text-amber-500'
                      }`}
                    >
                      👎 Not helpful
                    </button>
                    {feedbackState[msg.id]?.helpful === false && !feedbackState[msg.id]?.reasonPicked && (
                      <div className="flex gap-1.5 text-[10px]">
                        {['Unclear', 'Inaccurate', 'Not NCERT', 'Skip'].map(r => (
                          <button key={r}
                            onClick={() => handleFeedback(msg.id, false, r === 'Skip' ? null : r)}
                            className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100">
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="text-gray-300 text-[10px]">|</span>
                    <button
                      onClick={() => setReportModalFor(msg.id)}
                      className={`text-[11px] font-medium transition-colors ${
                        feedbackState[msg.id]?.reported ? 'text-red-600' : 'text-gray-400 hover:text-red-500'
                      }`}>
                      {feedbackState[msg.id]?.reported ? 'Reported ✓' : 'Report incorrect'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 animate-fade-in">
            <AIOrb size="xs" state="thinking" />
            <div className="bg-white rounded-xl shadow-card border border-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-brand-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-xs text-brand-slate italic transition-all">{thinkingPhase || 'Thinking…'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input bar with photo support */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-white/60 px-4 py-3 pb-5 flex-shrink-0">
        {/* Image preview above input when an image is pending */}
        {pendingImage && (
          <div className="mb-2 flex items-center gap-3 bg-brand-light border border-brand-pale/30 rounded-xl p-2">
            <img src={pendingImage.dataUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-navy truncate">{pendingImage.name}</p>
              <p className="text-[10px] text-brand-slate">{(pendingImage.size / 1024).toFixed(0)} KB · ready to send</p>
            </div>
            <button onClick={clearPendingImage}
              className="text-xs text-gray-400 hover:text-red-500 font-medium px-2">
              Remove ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-brand-bg rounded-xl border border-gray-200 px-3 py-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onImageSelected}
          />
          {/* Camera button */}
          <button onClick={openCamera}
            disabled={!!pendingImage}
            title="Attach a photo from your textbook"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 hover:bg-gray-100 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={pendingImage ? "Add an optional question about the photo..." : "Type your doubt…"}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-brand-navy placeholder-brand-slate leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '80px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() && !pendingImage}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
              input.trim() || pendingImage ? 'bg-brand-primary text-white shadow-sm' : 'bg-gray-200 text-gray-400'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Report incorrect bottom sheet (UI spec 6.3) */}
      {reportModalFor !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setReportModalFor(null)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">What is wrong with this answer?</h3>
            <p className="text-xs text-gray-500 mb-3">This goes to our teacher review queue.</p>
            <textarea
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              rows={4}
              placeholder="e.g. The formula is wrong, or the answer doesn't match NCERT..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setReportModalFor(null); setReportText('') }}
                className="flex-1 bg-gray-100 text-gray-600 text-sm font-medium py-2 rounded-lg">
                Cancel
              </button>
              <button onClick={() => submitReport(reportModalFor)} disabled={!reportText.trim()}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50">
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
