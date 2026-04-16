import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖',
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try {
    const s = JSON.parse(localStorage.getItem(key))
    return s?.access_token || s?.currentSession?.access_token || null
  } catch { return null }
}

export default function PracticeModeScreen({ onNavigate, initialSubject }) {
  const user = useUser()
  const homeData = user.homeData

  // Read subject from prop (URL ?subject=Chemistry) or daily challenge or default
  const subject = initialSubject || homeData?.dailyChallenge?.subject || user.selectedSubjects?.[0] || 'Physics'
  const questionCount = homeData?.dailyChallenge?.questionCount || 5
  const className = user.studentClass || 10

  // State machine: 'loading' → 'quiz' → 'results'
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState([])
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load questions: check pre-loaded cache first, then generate via API
  useEffect(() => {
    let cancelled = false
    async function load() {
      setPhase('loading')

      // Check if home screen pre-loaded today's questions
      const cacheKey = `padee-preloaded-practice-${subject}-${new Date().toISOString().split('T')[0]}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const preloaded = JSON.parse(cached)
          if (Array.isArray(preloaded) && preloaded.length > 0) {
            localStorage.removeItem(cacheKey) // consume once
            setQuestions(preloaded)
            setPhase('quiz')
            return
          }
        } catch {}
      }

      // No cache — generate fresh
      const token = getToken()
      if (!token) { setError('Not authenticated'); setPhase('error'); return }
      try {
        const r = await fetch('/api/ai/practice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: `CBSE Class ${className} ${subject}`, subject, className, count: questionCount }),
        })
        const data = await r.json()
        if (cancelled) return
        if (!r.ok || !data.questions?.length) {
          setError(data.error || 'Failed to generate questions')
          setPhase('error')
          return
        }
        setQuestions(data.questions)
        setPhase('quiz')
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed'); setPhase('error') }
      }
    }
    load()
    return () => { cancelled = true }
  }, [subject, className, questionCount])

  const current = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1

  function handleSelect(idx) {
    if (submitted) return
    setSelected(idx)
  }

  function handleCheck() {
    if (selected === null) return
    setSubmitted(true)
    setAnswers(prev => [...prev, {
      questionIdx: currentIdx,
      selectedIdx: selected,
      correct: selected === current.correctIndex,
    }])
  }

  function handleNext() {
    if (isLast) {
      finishSession()
    } else {
      setCurrentIdx(prev => prev + 1)
      setSelected(null)
      setSubmitted(false)
    }
  }

  async function finishSession() {
    setSaving(true)
    const allAnswers = [...answers]
    const correct = allAnswers.filter(a => a.correct).length
    const token = getToken()
    try {
      const r = await fetch('/api/ai/practice/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          className,
          questions: questions.map((q, i) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            studentAnswer: allAnswers.find(a => a.questionIdx === i)?.selectedIdx ?? null,
            correct: allAnswers.find(a => a.questionIdx === i)?.correct ?? false,
          })),
          correctCount: correct,
          totalQuestions: questions.length,
        }),
      })
      const data = await r.json()
      setResults({ accuracy: data.accuracy, xpAwarded: data.xpAwarded, correctCount: correct })
      // Refresh user state → triggers level-up / badge celebration if unlocked
      user.refreshUser?.()
    } catch {
      setResults({ accuracy: Math.round((correct / questions.length) * 100), xpAwarded: 0, correctCount: correct })
    }
    setSaving(false)
    setPhase('results')
  }

  function restart() {
    setPhase('loading')
    setQuestions([])
    setCurrentIdx(0)
    setAnswers([])
    setResults(null)
    setSelected(null)
    setSubmitted(false)
  }

  // ═══ LOADING ═══
  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center">
          <div className="text-4xl mb-4">{SUBJECT_ICONS[subject] || '📖'}</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>{subject} Practice</h1>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Generating {questionCount} questions...</p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#0D9488', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══ ERROR ═══
  if (phase === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Something went wrong</h1>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={restart} className="text-sm font-semibold underline" style={{ color: '#0D9488' }}>Try again</button>
        <span className="mx-2 text-gray-300">|</span>
        <button onClick={() => onNavigate('home')} className="text-sm font-semibold underline" style={{ color: '#6B7280' }}>Go home</button>
      </div>
    )
  }

  // ═══ RESULTS ═══
  if (phase === 'results' && results) {
    const pct = results.accuracy
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : pct >= 40 ? '💪' : '📚'
    const msg = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good job!' : pct >= 40 ? 'Keep practising!' : 'Let\'s review this topic.'
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm border text-center">
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>{msg}</h1>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>{subject} Practice Complete</p>

          <div className="relative w-28 h-28 mx-auto mb-4">
            <svg className="-rotate-90 w-28 h-28" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={pct >= 70 ? '#059669' : pct >= 50 ? '#D97706' : '#EF4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                className="transition-all duration-1000" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold font-mono" style={{ color: '#111827' }}>{pct}%</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl p-3" style={{ background: '#ECFDF5' }}>
              <p className="text-lg font-bold font-mono" style={{ color: '#059669' }}>{results.correctCount}</p>
              <p className="text-[11px]" style={{ color: '#065F46' }}>Correct</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#FEF2F2' }}>
              <p className="text-lg font-bold font-mono" style={{ color: '#EF4444' }}>{questions.length - results.correctCount}</p>
              <p className="text-[11px]" style={{ color: '#991B1B' }}>Wrong</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#F0FDFA' }}>
              <p className="text-lg font-bold font-mono" style={{ color: '#0D9488' }}>+{results.xpAwarded}</p>
              <p className="text-[11px]" style={{ color: '#115E59' }}>XP Earned</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={restart}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ border: '1px solid #CCFBF1', color: '#0F766E' }}>
              Practice again
            </button>
            <button onClick={() => onNavigate('home')}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0D9488' }}>
              Back to home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══ QUIZ ═══
  const answeredCount = answers.length
  const correctSoFar = answers.filter(a => a.correct).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#111827' }}>{SUBJECT_ICONS[subject] || '📖'} {subject}</h1>
          <p className="text-xs" style={{ color: '#6B7280' }}>Question {currentIdx + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: '#ECFDF5', color: '#059669' }}>
            {correctSoFar}/{answeredCount} correct
          </span>
          <button onClick={() => onNavigate('home')} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: '#E5E7EB' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ background: '#0D9488', width: `${((answeredCount) / questions.length) * 100}%` }} />
      </div>

      {/* Question card */}
      {current && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border mb-4">
          <p className="text-[15px] font-semibold leading-relaxed mb-4" style={{ color: '#111827' }}>{current.question}</p>
          <div className="space-y-2.5">
            {current.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              let bg = '#FFFFFF', border = '#E5E7EB', text = '#111827'
              if (submitted) {
                if (i === current.correctIndex) { bg = '#ECFDF5'; border = '#34D399'; text = '#065F46' }
                else if (i === selected) { bg = '#FEF2F2'; border = '#FCA5A5'; text = '#991B1B' }
                else { text = '#9CA3AF' }
              } else if (i === selected) {
                bg = '#F0FDFA'; border = '#5EEAD4'; text = '#0F766E'
              }
              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={submitted}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{ background: bg, border: `2px solid ${border}`, color: text }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ border: `2px solid ${border}` }}>{letter}</span>
                  <span className="text-sm font-medium">{opt}</span>
                </button>
              )
            })}
          </div>

          {submitted && current.explanation && (
            <div className="mt-4 p-3 rounded-xl text-xs"
              style={{ background: selected === current.correctIndex ? '#ECFDF5' : '#FFFBEB', color: selected === current.correctIndex ? '#065F46' : '#92400E' }}>
              {selected === current.correctIndex ? '✓ Correct! ' : `✗ Answer: ${String.fromCharCode(65 + current.correctIndex)}. `}
              {current.explanation}
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {!submitted ? (
        <button onClick={handleCheck} disabled={selected === null}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={selected !== null ? { background: '#0D9488', color: '#FFFFFF' } : { background: '#F3F4F6', color: '#9CA3AF' }}>
          Check Answer
        </button>
      ) : (
        <button onClick={handleNext}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: '#0D9488' }}>
          {saving ? 'Saving results...' : isLast ? 'See Results →' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}
