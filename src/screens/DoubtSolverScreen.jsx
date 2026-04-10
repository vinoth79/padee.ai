import { useState, useRef, useEffect } from 'react'
import { mockAIResponses } from '../data/mockData'
import AIOrb from '../components/AIOrb'
import XPToast from '../components/XPToast'

const SAMPLE_QUESTIONS = [
  { q: "How does osmosis work?", icon: '🌿' },
  { q: "Explain Ohm's Law with formula", icon: '⚡' },
  { q: "How do I solve quadratic equations?", icon: '📐' },
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
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
        <p className="text-xs text-amber-700 leading-relaxed">{step.content}</p>
      </div>
    )
  }
  if (step.type === 'intro') {
    return (
      <div className="bg-white rounded-2xl px-4 py-3 shadow-card border border-white">
        <p className="text-sm text-brand-navy leading-relaxed">{step.content}</p>
      </div>
    )
  }
  // step card
  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 shadow-card border border-white animate-step-reveal" style={{ animationDelay: `${index * 120}ms` }}>
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
function InlineQuiz({ onAnswer }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const options = [
    { text: 'V = IR', correct: true },
    { text: 'V = I/R', correct: false },
    { text: 'I = VR', correct: false },
    { text: 'R = VI', correct: false },
  ]
  const isCorrect = submitted && options[selected]?.correct

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-brand-primary">Quick quiz ⚡</span>
      </div>
      <p className="text-sm font-semibold text-brand-navy mb-3">What is Ohm's Law?</p>
      <div className="space-y-2 mb-3">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !submitted && setSelected(i)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
              submitted
                ? opt.correct ? 'bg-brand-success/10 border-brand-success text-emerald-800'
                  : selected === i ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 text-gray-400'
                : selected === i
                ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                : 'bg-white border-gray-200 text-brand-navy'
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>
      {!submitted ? (
        <button
          disabled={selected === null}
          onClick={() => setSubmitted(true)}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${selected !== null ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-400'}`}
        >
          Check
        </button>
      ) : (
        <div className={`text-xs font-semibold px-3 py-2 rounded-xl ${isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {isCorrect ? '✓ Correct! Great job.' : `Not quite — it's V = IR. Voltage = Current × Resistance.`}
        </div>
      )}
    </div>
  )
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

export default function DoubtSolverScreen({ onNavigate, initialQuestion }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [xpVisible, setXpVisible] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (initialQuestion) sendMessage(initialQuestion)
  }, [])

  const sendMessage = async (text = input) => {
    const question = (typeof text === 'string' ? text : input).trim()
    if (!question) return
    setInput('')
    setShowQuiz(false)
    setLoading(true)
    setMessages(prev => [...prev, { role: 'student', text: question, id: Date.now() }])

    await new Promise(r => setTimeout(r, 1100))

    const aiText = getAIResponse(question)
    const steps = parseSteps(aiText)
    setLoading(false)
    setMessages(prev => [...prev, { role: 'ai', text: aiText, steps, id: Date.now() + 1 }])
    setXpVisible(true)
  }

  const handleChip = (chip) => {
    if (chip === 'quiz') { setShowQuiz(true); return }
    const prompts = {
      simpler: 'Explain that using a simple real-life analogy I can relate to.',
      exam: 'Give me the CBSE exam model answer for this topic.',
      harder: 'Give me a harder problem on this topic with a step-by-step solution.',
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
            <span className="font-black text-brand-navy text-base">Ask a Doubt</span>
          </div>
          <span className="ml-auto text-xs text-brand-slate bg-white px-2.5 py-1 rounded-full border border-gray-200 font-semibold">Physics</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {empty && (
          <div className="flex flex-col items-center pt-6 animate-fade-in">
            <AIOrb size="lg" state="idle" className="mb-4" />
            <h2 className="font-black text-brand-navy text-lg text-center mb-1">What's your doubt?</h2>
            <p className="text-brand-slate text-sm text-center mb-5 max-w-xs">Type any question from your syllabus — I'll explain it step by step.</p>

            <div className="w-full space-y-2">
              {SAMPLE_QUESTIONS.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(sq.q)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left shadow-card hover:shadow-card-hover transition-shadow active:scale-[0.98]"
                >
                  <span className="text-xl">{sq.icon}</span>
                  <span className="text-sm text-brand-navy font-medium flex-1">{sq.q}</span>
                  <span className="text-brand-slate text-lg">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'student' ? (
              <div className="max-w-[78%] bg-gradient-to-br from-brand-primary to-violet-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AIOrb size="xs" state="idle" />
                  <span className="text-xs font-bold text-brand-primary">AI Tutor</span>
                </div>

                {/* Step cards */}
                {msg.steps?.map((step, si) => (
                  <StepCard key={si} step={step} index={si} total={msg.steps.length} />
                ))}

                {/* Inline quiz slot */}
                {showQuiz && i === messages.length - 1 && (
                  <InlineQuiz onAnswer={() => setShowQuiz(false)} />
                )}

                {/* Action chips — only on last AI message */}
                {i === messages.length - 1 && !showQuiz && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { key: 'simpler', label: 'Simpler 🧠' },
                      { key: 'exam',    label: 'Exam answer 📝' },
                      { key: 'quiz',    label: 'Quiz me ⚡' },
                      { key: 'harder',  label: 'Harder 🎯' },
                    ].map(chip => (
                      <button
                        key={chip.key}
                        onClick={() => handleChip(chip.key)}
                        className="text-xs bg-white border border-gray-200 text-brand-primary font-semibold px-3 py-1.5 rounded-full hover:bg-violet-50 hover:border-brand-primary/30 transition-colors active:scale-95 shadow-sm"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 animate-fade-in">
            <AIOrb size="xs" state="thinking" />
            <div className="bg-white rounded-2xl shadow-card border border-white">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-white/60 px-4 py-3 pb-5 flex-shrink-0">
        <div className="flex items-center gap-2 bg-brand-bg rounded-2xl border border-gray-200 px-4 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type your doubt…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-brand-navy placeholder-brand-slate leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '80px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
              input.trim() ? 'bg-brand-primary text-white shadow-sm' : 'bg-gray-200 text-gray-400'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
