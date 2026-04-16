import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

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

function fmtDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export default function TestResultsScreen({ onNavigate }) {
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('sessionId')

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedQ, setExpandedQ] = useState(null)

  useEffect(() => {
    async function load() {
      // Case 1: Fresh result in sessionStorage (just finished test)
      const stored = sessionStorage.getItem('padee-test-result')
      if (stored && !sessionIdFromUrl) {
        try {
          const r = JSON.parse(stored)
          setResult(r)
          setLoading(false)
          return
        } catch {}
      }

      // Case 2: Reviewing an old test via sessionId in URL
      if (sessionIdFromUrl) {
        const token = getToken()
        if (!token) { setError('Not authenticated'); setLoading(false); return }
        try {
          const r = await fetch(`/api/test/session/${sessionIdFromUrl}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await r.json()
          if (!r.ok) throw new Error(data.error || 'Not found')
          // Adapt DB shape to screen shape
          const totalQuestions = data.total_marks || (data.questions?.length || 0)
          const correctCount = data.score || 0
          const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
          setResult({
            sessionId: data.id,
            accuracy,
            correctCount,
            totalQuestions,
            xpAwarded: 0,  // already awarded, don't show again
            bonusAwarded: false,
            aiInsights: data.ai_insights || {},
            questions: data.questions || [],
            subject: data.subject,
            title: data.title,
            timeTakenSeconds: data.time_taken_seconds,
            autoSubmitted: false,
            isReview: true,
          })
        } catch (err) {
          setError(err.message || 'Failed to load')
        }
        setLoading(false)
        return
      }

      setError('No test result to show')
      setLoading(false)
    }
    load()
    // Only clear stashed result once consumed (so leaving & coming back still works initially, but not forever)
    return () => {
      if (!sessionIdFromUrl) sessionStorage.removeItem('padee-test-result')
    }
  }, [sessionIdFromUrl])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="flex justify-center gap-2 mb-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#0D9488', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-sm" style={{ color: '#6B7280' }}>Loading results...</p>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Results not available</h1>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>{error || 'No result to display.'}</p>
        <button onClick={() => onNavigate('tests')} className="text-sm font-semibold underline" style={{ color: '#0D9488' }}>
          Back to tests
        </button>
      </div>
    )
  }

  const pct = result.accuracy
  const scoreColor = pct >= 80 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626'
  const scoreGrade = pct >= 90 ? 'Outstanding' : pct >= 75 ? 'Great work' : pct >= 60 ? 'Good effort' : pct >= 40 ? 'Keep practising' : "Let's review"
  const emoji = pct >= 90 ? '🏆' : pct >= 75 ? '🎉' : pct >= 60 ? '👍' : pct >= 40 ? '💪' : '📚'
  const wrongCount = result.totalQuestions - result.correctCount
  const skipped = (result.questions || []).filter(q => q.studentAnswer === null || q.studentAnswer === undefined).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-8 space-y-5">
      {/* ─── Score hero ─── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border text-center">
        {result.autoSubmitted && (
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
            ⏱ Auto-submitted (time up)
          </div>
        )}
        <div className="text-5xl mb-3">{emoji}</div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>{scoreGrade}!</h1>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>{result.title || `${result.subject} Test`}</p>

        <div className="relative w-36 h-36 mx-auto mb-4">
          <svg className="-rotate-90 w-36 h-36" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none"
              stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono" style={{ color: '#111827' }}>{pct}%</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>{result.correctCount} / {result.totalQuestions}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl p-3" style={{ background: '#ECFDF5' }}>
            <p className="text-xl font-bold font-mono" style={{ color: '#059669' }}>{result.correctCount}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#065F46' }}>Correct</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#FEF2F2' }}>
            <p className="text-xl font-bold font-mono" style={{ color: '#EF4444' }}>{wrongCount - skipped}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#991B1B' }}>Wrong</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#F9FAFB' }}>
            <p className="text-xl font-bold font-mono" style={{ color: '#6B7280' }}>{skipped}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6B7280' }}>Skipped</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#F0FDFA' }}>
            <p className="text-xl font-bold font-mono" style={{ color: '#0D9488' }}>{fmtDuration(result.timeTakenSeconds)}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#115E59' }}>Time</p>
          </div>
        </div>

        {!result.isReview && result.xpAwarded > 0 && (
          <div className="rounded-xl p-3 mb-2"
            style={{ background: result.bonusAwarded ? '#FEF3C7' : '#F0FDFA', border: `1px solid ${result.bonusAwarded ? '#FCD34D' : '#A7F3D0'}` }}>
            <p className="text-sm font-semibold" style={{ color: result.bonusAwarded ? '#92400E' : '#0F766E' }}>
              ✨ +{result.xpAwarded} XP earned {result.bonusAwarded ? '(includes 80%+ bonus!)' : ''}
            </p>
          </div>
        )}
      </div>

      {/* ─── AI Insights ─── */}
      {result.aiInsights?.summary && (
        <div className="rounded-2xl p-5 shadow-sm border"
          style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #F0FDFA 100%)', borderColor: '#BAE6FD' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧠</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#0C4A6E' }}>AI Analysis</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#075985' }}>{result.aiInsights.summary}</p>
              {result.aiInsights.weakTopics?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.aiInsights.weakTopics.slice(0, 5).map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: '#E0F2FE', color: '#0C4A6E', border: '1px solid #BAE6FD' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Per-question review ─── */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
            Review questions
          </h2>
        </div>
        <div className="divide-y">
          {(result.questions || []).map((q, i) => {
            const correct = q.correct
            const selected = q.studentAnswer
            const isSkipped = selected === null || selected === undefined
            const isOpen = expandedQ === i
            return (
              <div key={i}>
                <button onClick={() => setExpandedQ(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: correct ? '#ECFDF5' : isSkipped ? '#F9FAFB' : '#FEF2F2',
                      color: correct ? '#059669' : isSkipped ? '#9CA3AF' : '#DC2626',
                    }}>
                    {correct ? '✓' : isSkipped ? '—' : '✗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                      Q{i + 1}. {q.question}
                    </p>
                    <p className="text-[11px]" style={{ color: isSkipped ? '#9CA3AF' : correct ? '#059669' : '#DC2626' }}>
                      {isSkipped ? 'Skipped' : correct ? 'Correct' : 'Incorrect'}
                      {q.topic ? ` · ${q.topic}` : ''}
                    </p>
                  </div>
                  <span style={{ color: '#9CA3AF', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {q.options.map((opt, j) => {
                      const letter = String.fromCharCode(65 + j)
                      const isCorrect = j === q.correctIndex
                      const isChosen = j === selected
                      let bg = '#FFFFFF', border = '#E5E7EB', color = '#6B7280'
                      if (isCorrect) { bg = '#ECFDF5'; border = '#34D399'; color = '#065F46' }
                      else if (isChosen) { bg = '#FEF2F2'; border = '#FCA5A5'; color = '#991B1B' }
                      return (
                        <div key={j} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm"
                          style={{ background: bg, border: `1px solid ${border}`, color }}>
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ border: `1px solid ${border}` }}>{letter}</span>
                          <span className="flex-1">{opt}</span>
                          {isCorrect && <span className="text-xs font-semibold">✓ Correct</span>}
                          {isChosen && !isCorrect && <span className="text-xs font-semibold">Your answer</span>}
                        </div>
                      )
                    })}
                    {q.explanation && (
                      <div className="mt-2 p-3 rounded-xl text-xs" style={{ background: '#F0F9FF', color: '#075985' }}>
                        <strong>Why:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Action buttons ─── */}
      <div className="flex gap-3">
        <button onClick={() => onNavigate('tests')}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ background: '#FFFFFF', color: '#0F766E', border: '1px solid #CCFBF1' }}>
          Back to tests
        </button>
        <button onClick={() => onNavigate('home')}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#0D9488' }}>
          Go home
        </button>
      </div>
    </div>
  )
}
