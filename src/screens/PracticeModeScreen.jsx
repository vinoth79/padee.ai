import { useState, useEffect } from 'react'
import { mcqQuestions, descriptiveQuestions, codingQuestions } from '../data/mockData'
import XPToast from '../components/XPToast'
import Confetti from '../components/Confetti'
import AIOrb from '../components/AIOrb'
import ScoreRing from '../components/ScoreRing'

// ─── MCQ SESSION — Duolingo feel ─────────────────────────────────────────────
function MCQSession({ onComplete, onNavigate }) {
  const questions = mcqQuestions
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState([])
  const [xpVisible, setXpVisible] = useState(false)
  const [xpAmt, setXpAmt] = useState(0)
  const [feedbackVisible, setFeedbackVisible] = useState(false)

  const q = questions[current]
  const isCorrect = submitted && selected === q.correct
  const progress = ((current) / questions.length) * 100

  const handleSubmit = () => {
    if (selected === null) return
    const correct = selected === q.correct
    setSubmitted(true)
    setFeedbackVisible(true)
    setAnswers(prev => [...prev, { correct }])
    if (correct) {
      setXpAmt(q.xp || 10)
      setXpVisible(true)
    }
  }

  const handleNext = () => {
    setFeedbackVisible(false)
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        const score = answers.filter(a => a.correct).length + (isCorrect ? 1 : 0)
        onComplete(score, questions.length)
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
        setSubmitted(false)
        setXpVisible(false)
      }
    }, 200)
  }

  const optionLabels = ['A', 'B', 'C', 'D']

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      <XPToast xp={xpAmt} visible={xpVisible} onDone={() => setXpVisible(false)} />

      {/* Top bar */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => onNavigate('home')} className="w-8 h-8 flex items-center justify-center text-brand-slate">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-pale rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-bold text-brand-slate w-10 text-right">{current + 1}/{questions.length}</span>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 flex flex-col">
        {/* Subject chip */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-brand-primary bg-brand-light px-3 py-1 rounded-full">{q.subject}</span>
          <span className="text-xs text-brand-slate bg-white px-2 py-1 rounded-full border border-gray-200">{q.difficulty}</span>
          <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">+{q.xp || 10} XP</span>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl px-5 py-5 shadow-card mb-5">
          <p className="text-base font-bold text-brand-navy leading-relaxed">{q.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 flex-1">
          {q.options.map((opt, idx) => {
            let style = 'bg-white border-2 border-gray-200 text-brand-navy'
            if (!submitted) {
              if (selected === idx) style = 'bg-brand-light border-2 border-brand-primary text-brand-primary shadow-sm'
            } else {
              if (idx === q.correct) style = 'bg-emerald-50 border-2 border-brand-success text-emerald-800'
              else if (idx === selected && selected !== q.correct) style = 'bg-amber-50 border-2 border-amber-300 text-amber-800'
              else style = 'bg-white border-2 border-gray-100 text-gray-400'
            }

            return (
              <button
                key={idx}
                onClick={() => !submitted && setSelected(idx)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left font-semibold text-sm transition-all active:scale-[0.98] ${style}`}
              >
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black border-2 transition-all ${
                  !submitted
                    ? selected === idx
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'border-gray-300 text-gray-500'
                    : idx === q.correct
                      ? 'bg-brand-success border-brand-success text-white'
                      : idx === selected && selected !== q.correct
                        ? 'bg-amber-400 border-amber-400 text-white'
                        : 'border-gray-200 text-gray-400'
                }`}>
                  {submitted && idx === q.correct ? '✓' : optionLabels[idx]}
                </div>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Check button (pre-submit) */}
      {!submitted && (
        <div className="px-4 pb-36 pt-4">
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className={`w-full py-4 rounded-xl font-black text-base transition-all active:scale-95 ${
              selected !== null
                ? 'bg-brand-primary text-white shadow-action'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            Check
          </button>
        </div>
      )}

      {/* Feedback card + Continue — slides up, replaces Check button */}
      {feedbackVisible && submitted && (
        <div className={`fixed left-0 right-0 max-w-sm mx-auto animate-slide-up rounded-t-3xl px-5 pt-4 z-40 shadow-2xl ${
          isCorrect ? 'bg-emerald-500' : 'bg-amber-400'
        }`} style={{ bottom: '130px' }}>
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl mt-0.5">{isCorrect ? '🎉' : '💡'}</span>
            <div className="flex-1">
              <p className={`font-black text-base ${isCorrect ? 'text-white' : 'text-amber-900'}`}>
                {isCorrect ? 'Correct!' : 'Not quite this time'}
              </p>
              <p className={`text-xs mt-1 leading-relaxed ${isCorrect ? 'text-emerald-100' : 'text-amber-800'}`}>
                {q.explanation?.substring(0, 100)}{q.explanation?.length > 100 ? '…' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleNext}
            className={`w-full py-3.5 rounded-xl font-black text-sm mb-4 transition-all active:scale-95 ${
              isCorrect ? 'bg-white text-emerald-700' : 'bg-white text-amber-800'
            }`}
          >
            {current + 1 >= questions.length ? 'See results →' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PRACTICE COMPLETE ────────────────────────────────────────────────────────
function PracticeComplete({ score, total, onNavigate }) {
  const percent = Math.round((score / total) * 100)
  const xp = 20 + (percent >= 80 ? 15 : percent >= 60 ? 8 : 0)

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6">
      <Confetti active={percent >= 80} />

      <div className="w-full text-center">
        {/* Score ring */}
        <div className="flex justify-center mb-4 relative">
          <div className="relative">
            <ScoreRing percent={percent} size={100} strokeWidth={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-brand-navy">{score}/{total}</span>
              <span className="text-[10px] text-brand-slate">correct</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-black text-brand-navy mb-1">
          {percent >= 80 ? 'Excellent!' : percent >= 60 ? 'Good effort!' : 'Keep going!'}
        </h1>
        <p className="text-brand-slate text-sm mb-4">{percent}% accuracy</p>

        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 mb-6">
          <span>⚡</span>
          <span className="font-black text-amber-800 text-sm">+{xp} XP earned</span>
        </div>

        {/* AI insight */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-card text-left">
          <div className="flex items-center gap-2 mb-2">
            <AIOrb size="xs" state="idle" />
            <span className="text-xs font-bold text-brand-primary">AI Insight</span>
          </div>
          <p className="text-sm text-brand-navy leading-relaxed">
            {percent >= 80
              ? "You've got this topic down. Try the harder set or move to the next chapter."
              : percent >= 60
                ? "Solid attempt! Review the questions you missed — the pattern will click."
                : "This topic needs more practice. Try the 'Simpler' mode to build confidence first."}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('practice')}
            className="flex-1 bg-white border-2 border-gray-200 text-brand-navy font-bold py-3.5 rounded-xl text-sm active:scale-95"
          >
            Try again
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="flex-1 bg-brand-primary text-white font-bold py-3.5 rounded-xl text-sm shadow-action active:scale-95"
          >
            Home →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MODE SELECTOR ────────────────────────────────────────────────────────────
function ModeSelector({ onSelectMode, onNavigate }) {
  return (
    <div className="min-h-screen bg-brand-bg pb-28">
      <div className="px-5 pt-12 pb-5">
        <button onClick={() => onNavigate('home')} className="text-brand-slate mb-4 block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="text-2xl font-black text-brand-navy">Practice</h1>
        <p className="text-brand-slate text-sm mt-0.5">Choose how to practice today</p>
      </div>

      {/* AI recommendation */}
      <div className="px-4 mb-5">
        <button
          onClick={() => onSelectMode('mcq')}
          className="w-full bg-gradient-to-br from-brand-primary to-brand-mid rounded-xl p-5 text-left shadow-action relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="flex items-center gap-2 mb-2">
            <AIOrb size="xs" state="idle" />
            <span className="text-white/70 text-xs font-semibold">AI recommends</span>
          </div>
          <h2 className="text-white font-black text-lg leading-snug mb-1">Power Formulas need work.</h2>
          <p className="text-white/70 text-sm mb-3">5 quick questions. Takes ~4 minutes. Let's fix this gap.</p>
          <div className="bg-white text-brand-primary font-black text-sm py-2.5 rounded-xl text-center">
            Start now →
          </div>
        </button>
      </div>

      <div className="px-4 space-y-3">
        {[
          { id: 'mcq', icon: '⚡', label: 'Quick MCQ', desc: '5–10 questions, instant feedback', bg: 'bg-amber-50', text: 'text-amber-700' },
          { id: 'descriptive', icon: '✍️', label: 'Written Answer', desc: 'AI evaluates your CBSE answer', bg: 'bg-brand-light', text: 'text-brand-primary' },
          { id: 'coding', icon: '💻', label: 'Coding Practice', desc: 'Python problems with AI feedback', bg: 'bg-cyan-50', text: 'text-cyan-700' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => onSelectMode(m.id)}
            className="w-full flex items-center gap-4 bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow active:scale-[0.98]"
          >
            <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center text-2xl`}>{m.icon}</div>
            <div className="flex-1 text-left">
              <p className={`font-bold text-sm ${m.text}`}>{m.label}</p>
              <p className="text-xs text-brand-slate mt-0.5">{m.desc}</p>
            </div>
            <span className="text-brand-slate text-lg">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── DESCRIPTIVE SESSION ──────────────────────────────────────────────────────
function DescriptiveSession({ onNavigate }) {
  const q = descriptiveQuestions[0]
  const [answer, setAnswer] = useState('')
  const [evaluated, setEvaluated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setLoading(false)
    setEvaluated(true)
  }

  const score = 2
  const total = 3
  const percent = Math.round((score / total) * 100)

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col pb-8">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => onNavigate('practice')} className="text-brand-slate">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-black text-brand-navy">Written Answer</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        <div className="bg-white rounded-xl shadow-card px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-brand-slate uppercase">Question</span>
            <span className="ml-auto text-xs font-bold text-brand-primary bg-brand-light px-2 py-0.5 rounded-full">{q.marks} marks</span>
          </div>
          <p className="text-sm font-semibold text-brand-navy leading-relaxed">{q.question}</p>
        </div>

        {!evaluated ? (
          <>
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <label className="block px-4 pt-3 text-xs font-bold text-brand-slate uppercase tracking-wider">Your Answer</label>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Write your answer here..."
                className="w-full px-4 pb-4 pt-2 text-sm text-brand-navy placeholder-brand-slate outline-none resize-none bg-transparent"
                rows={7}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={answer.trim().length < 20 || loading}
              className={`w-full font-bold py-4 rounded-xl text-sm transition-all active:scale-95 ${
                answer.trim().length >= 20 && !loading
                  ? 'bg-brand-primary text-white shadow-action'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI is evaluating…
                </span>
              ) : 'Submit for AI Evaluation →'}
            </button>
          </>
        ) : (
          <div className="space-y-3 animate-slide-up">
            <div className="bg-white rounded-xl shadow-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <AIOrb size="sm" state="idle" />
                <div>
                  <p className="font-black text-brand-navy text-sm">AI Evaluation</p>
                  <p className="text-xs text-brand-slate">CBSE marking scheme</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-black text-brand-navy">{score}/{total}</p>
                  <p className="text-xs text-brand-slate">marks</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-emerald-700 mb-1">What you got right ✓</p>
                  <p className="text-xs text-emerald-700">Correctly explained single current path in series circuits.</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">What to add next time</p>
                  <p className="text-xs text-amber-700">Mention that voltage divides in series. Use CBSE keyword: "potential difference".</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setEvaluated(false); setAnswer('') }} className="flex-1 bg-white border-2 border-gray-200 text-brand-navy font-bold py-3 rounded-xl text-sm active:scale-95">Try again</button>
              <button onClick={() => onNavigate('home')} className="flex-1 bg-brand-primary text-white font-bold py-3 rounded-xl text-sm shadow-action active:scale-95">Home →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CODING SESSION ───────────────────────────────────────────────────────────
function CodingSession({ onNavigate }) {
  const q = codingQuestions[0]
  const [code, setCode] = useState(q.starterCode)
  const [output, setOutput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    await new Promise(r => setTimeout(r, 1000))
    setOutput('2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 ')
    setRunning(false)
  }

  const handleSubmit = async () => {
    setRunning(true)
    await new Promise(r => setTimeout(r, 1500))
    setSubmitted(true)
    setRunning(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 px-4 pt-12 pb-3 border-b border-gray-700 flex items-center gap-3">
        <button onClick={() => onNavigate('practice')} className="text-gray-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-black text-white flex-1">Coding Practice</h1>
        <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-1 rounded-full border border-cyan-500/30">Python</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-gray-800 px-4 py-4 border-b border-gray-700">
          <p className="text-sm text-gray-200 leading-relaxed">{q.question}</p>
          <div className="mt-2 bg-gray-900 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-mono">Expected: <span className="text-emerald-400">{q.sampleOutput}</span></p>
          </div>
        </div>

        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 mb-2 font-mono">solution.py</p>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="w-full bg-transparent text-emerald-300 font-mono text-xs leading-relaxed outline-none resize-none"
            rows={12}
            spellCheck={false}
          />
        </div>

        {output && (
          <div className="bg-gray-800 px-4 py-3 border-t border-gray-700 animate-slide-up">
            <p className="text-xs text-gray-400 mb-1">Output:</p>
            <p className="text-xs text-emerald-400 font-mono">{output}</p>
          </div>
        )}

        {submitted && (
          <div className="mx-4 my-4 bg-gray-800 border border-emerald-500/30 rounded-xl p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <AIOrb size="xs" state="celebrating" />
              <span className="font-bold text-emerald-400 text-sm">Correct! +15 XP</span>
            </div>
            <p className="text-sm text-gray-300">Your solution works. The √n optimization is efficient — O(n√n) overall.</p>
          </div>
        )}
      </div>

      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex gap-3">
        <button onClick={handleRun} disabled={running} className="flex-1 bg-gray-700 text-gray-200 font-bold py-3 rounded-xl text-sm active:scale-95">
          {running ? '▶ Running…' : '▶ Run'}
        </button>
        <button onClick={handleSubmit} disabled={running || submitted} className={`flex-1 font-bold py-3 rounded-xl text-sm active:scale-95 ${submitted ? 'bg-emerald-600 text-white' : 'bg-cyan-500 text-white'}`}>
          {submitted ? '✓ Submitted' : 'Submit →'}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PracticeModeScreen({ onNavigate }) {
  const [mode, setMode] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  const handleComplete = (s, t) => { setScore(s); setTotal(t); setCompleted(true) }

  if (completed) return <PracticeComplete score={score} total={total} onNavigate={onNavigate} />
  if (!mode) return <ModeSelector onSelectMode={setMode} onNavigate={onNavigate} />
  if (mode === 'mcq') return <MCQSession onComplete={handleComplete} onNavigate={onNavigate} />
  if (mode === 'descriptive') return <DescriptiveSession onNavigate={onNavigate} />
  if (mode === 'coding') return <CodingSession onNavigate={onNavigate} />
  return null
}
