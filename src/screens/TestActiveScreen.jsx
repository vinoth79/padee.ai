import { useState, useEffect, useRef } from 'react'
import { useUser } from '../context/UserContext'

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try {
    const s = JSON.parse(localStorage.getItem(key))
    return s?.access_token || s?.currentSession?.access_token || null
  } catch { return null }
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TestActiveScreen({ onNavigate }) {
  const user = useUser()

  // Test state
  const [phase, setPhase] = useState('loading')  // loading | active | submitting | error
  const [testMeta, setTestMeta] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selections, setSelections] = useState({})  // { [qIdx]: optionIdx }
  const [flagged, setFlagged] = useState(new Set())
  const [remainingSecs, setRemainingSecs] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [error, setError] = useState('')

  const startTimeRef = useRef(null)
  const submittedRef = useRef(false)
  const paramsRef = useRef(null)

  // Load test on mount (read params from sessionStorage, call /api/test/start)
  useEffect(() => {
    let cancelled = false
    async function load() {
      const stored = sessionStorage.getItem('padee-test-start')
      if (!stored) {
        setError('No test parameters. Go back and pick a test.')
        setPhase('error')
        return
      }
      const params = JSON.parse(stored)
      paramsRef.current = params

      const token = getToken()
      if (!token) { setError('Not authenticated'); setPhase('error'); return }
      try {
        const r = await fetch('/api/test/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        })
        const data = await r.json()
        if (cancelled) return
        if (!r.ok) { setError(data.error || 'Failed to start'); setPhase('error'); return }
        if (!data.questions || data.questions.length === 0) {
          setError('No questions returned')
          setPhase('error')
          return
        }
        setTestMeta({
          mode: data.mode,
          title: data.title,
          subject: data.subject,
          classLevel: data.classLevel,
          difficulty: data.difficulty,
          secondsPerQuestion: data.secondsPerQuestion,
          assignmentId: data.assignmentId,
        })
        setQuestions(data.questions)
        setRemainingSecs(data.totalSeconds)
        startTimeRef.current = Date.now()
        setPhase('active')
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed'); setPhase('error') }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'active') return
    if (remainingSecs <= 0) {
      handleSubmit(true)
      return
    }
    const timer = setInterval(() => {
      setRemainingSecs(s => {
        if (s <= 1) {
          clearInterval(timer)
          setTimeout(() => handleSubmit(true), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  // Warn before unload
  useEffect(() => {
    if (phase !== 'active') return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  function selectOption(optIdx) {
    setSelections(prev => ({ ...prev, [currentIdx]: optIdx }))
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev)
      if (next.has(currentIdx)) next.delete(currentIdx)
      else next.add(currentIdx)
      return next
    })
  }

  function goTo(idx) {
    if (idx < 0 || idx >= questions.length) return
    setCurrentIdx(idx)
    setDrawerOpen(false)
  }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return
    submittedRef.current = true
    setPhase('submitting')

    const timeTakenSeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0

    // Build answers array
    const answers = questions.map((q, i) => {
      const sel = selections[i]
      return {
        questionIdx: i,
        selectedIdx: sel ?? null,
        correct: sel === q.correctIndex,
      }
    })

    const token = getToken()
    try {
      const r = await fetch('/api/test/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: testMeta.mode,
          subject: testMeta.subject,
          classLevel: testMeta.classLevel,
          difficulty: testMeta.difficulty,
          title: testMeta.title,
          assignmentId: testMeta.assignmentId || null,
          questions,
          answers,
          timeTakenSeconds,
        }),
      })
      const data = await r.json()
      sessionStorage.removeItem('padee-test-start')
      if (!r.ok) throw new Error(data.error || 'Submit failed')
      // Refresh user state — triggers level-up / badge celebration if unlocked
      user.refreshUser?.()
      // Stash results for review screen
      sessionStorage.setItem('padee-test-result', JSON.stringify({
        sessionId: data.sessionId,
        accuracy: data.accuracy,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        xpAwarded: data.xpAwarded,
        bonusAwarded: data.bonusAwarded,
        aiInsights: data.aiInsights,
        questions: data.questions,
        subject: testMeta.subject,
        title: testMeta.title,
        timeTakenSeconds,
        autoSubmitted: auto,
      }))
      onNavigate('test-results')
    } catch (err) {
      console.error('[Test] submit error:', err)
      setError(err.message || 'Submission failed')
      setPhase('error')
    }
  }

  // ─── LOADING ───
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="flex justify-center gap-2 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#0D9488', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {phase === 'loading' ? 'Preparing your test...' : 'Submitting & scoring...'}
        </p>
      </div>
    )
  }

  // ─── ERROR ───
  if (phase === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Something went wrong</h1>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={() => onNavigate('home')} className="text-sm font-semibold underline" style={{ color: '#0D9488' }}>
          Back to home
        </button>
      </div>
    )
  }

  // ─── ACTIVE ───
  const current = questions[currentIdx]
  const answeredCount = Object.keys(selections).length
  const flaggedCount = flagged.size
  const progressPct = (answeredCount / questions.length) * 100
  const isLow = remainingSecs < 60
  const timerColor = isLow ? '#DC2626' : remainingSecs < 180 ? '#D97706' : '#0D9488'

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-28 sm:pb-4">
      {/* Header bar — timer + progress + drawer toggle */}
      <div className="sticky top-0 z-10 bg-white rounded-2xl shadow-sm border mb-4 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>{testMeta.title}</p>
            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
              Q {currentIdx + 1} of {questions.length} · {answeredCount} answered{flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold font-mono" style={{ color: timerColor }}>{fmtTime(remainingSecs)}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                {isLow ? 'Hurry!' : 'Time left'}
              </p>
            </div>
            <button onClick={() => setDrawerOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#F3F4F6', color: '#374151' }}>
              ☰ All Qs
            </button>
            <button onClick={() => setConfirmExit(true)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
        </div>
        <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: '#E5E7EB' }}>
          <div className="h-full rounded-full transition-all" style={{ background: '#0D9488', width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Question card */}
      {current && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-[15px] font-semibold leading-relaxed flex-1" style={{ color: '#111827' }}>
              <span style={{ color: '#0D9488' }}>Q{currentIdx + 1}.</span> {current.question}
            </p>
            <button onClick={toggleFlag}
              className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg"
              style={{
                background: flagged.has(currentIdx) ? '#FEF3C7' : '#F9FAFB',
                color: flagged.has(currentIdx) ? '#92400E' : '#6B7280',
                border: `1px solid ${flagged.has(currentIdx) ? '#FCD34D' : '#E5E7EB'}`,
              }}>
              {flagged.has(currentIdx) ? '🚩 Flagged' : '🏳️ Flag'}
            </button>
          </div>

          <div className="space-y-2.5">
            {current.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              const selected = selections[currentIdx] === i
              return (
                <button key={i} onClick={() => selectOption(i)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: selected ? '#F0FDFA' : '#FFFFFF',
                    border: `2px solid ${selected ? '#5EEAD4' : '#E5E7EB'}`,
                    color: selected ? '#0F766E' : '#111827',
                  }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ border: `2px solid ${selected ? '#5EEAD4' : '#D1D5DB'}` }}>{letter}</span>
                  <span className="text-sm font-medium">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3">
        <button onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: currentIdx === 0 ? '#F3F4F6' : '#FFFFFF',
            color: currentIdx === 0 ? '#9CA3AF' : '#374151',
            border: `1px solid ${currentIdx === 0 ? '#E5E7EB' : '#D1D5DB'}`,
          }}>
          ← Previous
        </button>
        {currentIdx === questions.length - 1 ? (
          <button onClick={() => setConfirmSubmit(true)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#EA580C' }}>
            Submit test
          </button>
        ) : (
          <button onClick={() => goTo(currentIdx + 1)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#0D9488' }}>
            Next →
          </button>
        )}
      </div>

      {/* ─── Drawer: all questions overview ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setDrawerOpen(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: '#111827' }}>All Questions</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="flex items-center gap-3 text-[11px] mb-3" style={{ color: '#6B7280' }}>
              <span>⬜ Unanswered</span>
              <span style={{ color: '#0F766E' }}>🟩 Answered</span>
              <span style={{ color: '#92400E' }}>🚩 Flagged</span>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {questions.map((_, i) => {
                const answered = selections[i] !== undefined
                const isFlagged = flagged.has(i)
                const isCurrent = i === currentIdx
                let bg = '#FFFFFF', border = '#E5E7EB', color = '#111827'
                if (isFlagged) { bg = '#FEF3C7'; border = '#FCD34D'; color = '#92400E' }
                else if (answered) { bg = '#F0FDFA'; border = '#5EEAD4'; color = '#0F766E' }
                if (isCurrent) border = '#0D9488'
                return (
                  <button key={i} onClick={() => goTo(i)}
                    className="aspect-square rounded-lg text-sm font-semibold transition-all flex items-center justify-center"
                    style={{ background: bg, border: `2px solid ${border}`, color }}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <button onClick={() => { setDrawerOpen(false); setConfirmSubmit(true) }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#EA580C' }}>
              Submit test
            </button>
          </div>
        </div>
      )}

      {/* ─── Submit confirmation ─── */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmSubmit(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>Submit test?</h3>
            <p className="text-sm mb-1" style={{ color: '#6B7280' }}>
              You've answered <strong>{answeredCount} of {questions.length}</strong> questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-sm mb-3" style={{ color: '#DC2626' }}>
                {questions.length - answeredCount} unanswered will be marked wrong.
              </p>
            )}
            {flaggedCount > 0 && (
              <p className="text-xs mb-3" style={{ color: '#92400E' }}>🚩 {flaggedCount} flagged for review</p>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F3F4F6', color: '#374151' }}>
                Keep going
              </button>
              <button onClick={() => handleSubmit(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#EA580C' }}>
                Submit now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Exit confirmation ─── */}
      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmExit(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>Leave test?</h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Your progress will be lost. This test cannot be resumed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExit(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F3F4F6', color: '#374151' }}>
                Stay
              </button>
              <button onClick={() => { sessionStorage.removeItem('padee-test-start'); onNavigate('home') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#DC2626' }}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
