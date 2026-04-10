import { useState, useEffect, useRef } from 'react'
import { testQuestions, mockTestResult } from '../data/mockData'

// ─── PRE-TEST SCREEN ──────────────────────────────────────────────────────────
function PreTestScreen({ onStart, onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 px-4 pt-12 pb-8">
        <button onClick={onBack} className="text-white/70 mb-4 block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="bg-white/10 text-white/70 text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">Chapter Test</div>
        <h1 className="text-white font-black text-2xl leading-tight">Chapter 12 · Electricity</h1>
        <p className="text-purple-200 text-sm mt-1">Class 10 Physics · CBSE Pattern</p>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '❓', label: 'Questions', value: '15' },
              { icon: '⏱', label: 'Time', value: '30 min' },
              { icon: '📊', label: 'Marks', value: '30' },
              { icon: '📝', label: 'Pattern', value: '10 MCQ + 5 Short' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">{item.icon}</div>
                <div>
                  <div className="text-xs text-gray-400">{item.label}</div>
                  <div className="text-sm font-bold text-gray-800">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="font-bold text-amber-800 text-sm mb-2">📌 Instructions</div>
          <ul className="space-y-1">
            {[
              'Each MCQ carries 1 mark. Short answers carry 2 marks each.',
              'No negative marking in this test.',
              'You can flag questions to review later.',
              'Auto-submits when time is up.',
            ].map((rule, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span><span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black py-4 rounded-2xl text-base shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          Start Test →
        </button>
        <button onClick={onBack} className="w-full text-center text-gray-400 text-sm mt-3">Not now</button>
      </div>
    </div>
  )
}

// ─── TEST INTERFACE ───────────────────────────────────────────────────────────
function TestInterface({ onSubmit, onBack }) {
  const questions = testQuestions
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [showNav, setShowNav] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 min
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); onSubmit(answers); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeWarning = timeLeft < 5 * 60
  const q = questions[current]

  const setAnswer = (val) => setAnswers(prev => ({ ...prev, [q.id]: val }))
  const toggleFlag = () => setFlagged(prev => {
    const next = new Set(prev)
    next.has(q.id) ? next.delete(q.id) : next.add(q.id)
    return next
  })

  const answeredCount = Object.keys(answers).length
  const unattempted = questions.length - answeredCount

  const getNavStatus = (qid, idx) => {
    if (flagged.has(qid)) return 'flagged'
    if (answers[qid] !== undefined) return 'answered'
    if (idx === current) return 'current'
    return 'unattempted'
  }

  const navColors = {
    answered: 'bg-emerald-500 text-white',
    flagged: 'bg-orange-400 text-white',
    current: 'bg-purple-600 text-white ring-2 ring-purple-300',
    unattempted: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className={`px-4 pt-12 pb-3 flex items-center gap-3 border-b border-gray-100 ${timeWarning ? 'bg-red-50' : 'bg-white'}`}>
        <div className={`flex items-center gap-2 font-black text-lg px-3 py-1.5 rounded-xl ${timeWarning ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
          <span>⏱</span>
          <span>{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}</span>
        </div>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-gray-700">{current + 1} / {questions.length}</span>
        </div>
        <button
          onClick={toggleFlag}
          className={`text-sm font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
            flagged.has(q.id) ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}
        >
          {flagged.has(q.id) ? '🚩 Flagged' : '🏳 Flag'}
        </button>
        <button
          onClick={() => setShowNav(true)}
          className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600"
        >
          ☰
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Question type badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            q.type === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {q.type === 'mcq' ? 'MCQ' : 'Short Answer'} · {q.marks} mark{q.marks > 1 ? 's' : ''}
          </span>
          {flagged.has(q.id) && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">🚩 Flagged</span>}
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-5">
          <p className="text-sm font-semibold text-gray-900 leading-relaxed">{q.question}</p>
        </div>

        {/* MCQ options */}
        {q.type === 'mcq' && (
          <div className="space-y-2.5">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setAnswer(idx)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left font-medium text-sm transition-all active:scale-98 ${
                  answers[q.id] === idx
                    ? 'border-purple-500 bg-purple-50 text-purple-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  answers[q.id] === idx
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {['A','B','C','D'][idx]}
                </div>
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Short answer */}
        {q.type === 'short' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <textarea
              value={answers[q.id] || ''}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Write your answer here..."
              rows={5}
              className="w-full px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm disabled:opacity-40 hover:border-gray-300 active:scale-95"
        >
          ← Prev
        </button>
        <button
          onClick={() => {
            if (current + 1 < questions.length) setCurrent(c => c + 1)
            else setShowSubmitModal(true)
          }}
          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl text-sm active:scale-95"
        >
          {current + 1 < questions.length ? 'Next →' : 'Submit Test →'}
        </button>
      </div>

      {/* Question navigator drawer */}
      {showNav && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowNav(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative w-full bg-white rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">Question Navigator</h3>
              <button onClick={() => setShowNav(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => { setCurrent(idx); setShowNav(false) }}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${navColors[getNavStatus(q.id, idx)]}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> Answered ({answeredCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded" /> Flagged ({flagged.size})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded" /> Unattempted ({unattempted})</span>
            </div>
            <button
              onClick={() => { setShowNav(false); setShowSubmitModal(true) }}
              className="w-full mt-4 bg-purple-600 text-white font-bold py-3 rounded-xl"
            >
              Submit Test
            </button>
          </div>
        </div>
      )}

      {/* Submit confirmation modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSubmitModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <div className="text-2xl text-center mb-2">⚠️</div>
            <h3 className="text-center font-black text-gray-900 mb-2">Ready to submit?</h3>
            <p className="text-center text-sm text-gray-500 mb-4">
              {unattempted > 0
                ? `${unattempted} question${unattempted > 1 ? 's' : ''} unattempted. Submit anyway?`
                : 'All questions answered. Submit the test?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm"
              >
                Go Back
              </button>
              <button
                onClick={() => { clearInterval(timerRef.current); onSubmit(answers) }}
                className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl text-sm"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EVALUATING SCREEN ────────────────────────────────────────────────────────
function EvaluatingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
        <span className="text-4xl">🤖</span>
      </div>
      <div className="text-center">
        <h2 className="font-black text-gray-900 text-xl">Checking your answers...</h2>
        <p className="text-gray-500 text-sm mt-1">AI is evaluating your responses</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function TestScreen({ onNavigate }) {
  const [phase, setPhase] = useState('pre') // pre | test | evaluating | results

  const handleSubmit = async (answers) => {
    setPhase('evaluating')
    await new Promise(r => setTimeout(r, 2500))
    onNavigate('test-results')
  }

  if (phase === 'pre') return <PreTestScreen onStart={() => setPhase('test')} onBack={() => onNavigate('home')} />
  if (phase === 'test') return <TestInterface onSubmit={handleSubmit} onBack={() => setPhase('pre')} />
  if (phase === 'evaluating') return <EvaluatingScreen />
  return null
}
