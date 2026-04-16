import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖', 'Social Science': '🌍',
  Economics: '📊', Accounts: '📋', 'Business Studies': '💼',
}

const SUBJECT_COLORS = {
  Physics: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  Chemistry: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  Mathematics: { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  Biology: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  'Computer Science': { bg: '#ECFEFF', border: '#A5F3FC', text: '#0E7490' },
  English: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' },
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try {
    const s = JSON.parse(localStorage.getItem(key))
    return s?.access_token || s?.currentSession?.access_token || null
  } catch { return null }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatDeadline(iso) {
  if (!iso) return 'No deadline'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d - now
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffMs < 0) return 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 7) return `Due in ${diffDays} days`
  return `Due ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

export default function TestListScreen({ onNavigate }) {
  const user = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Self-pick dialog state
  const [pickSubject, setPickSubject] = useState(null)
  const [pickLength, setPickLength] = useState(10)
  const [pickDifficulty, setPickDifficulty] = useState('medium')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) { setError('Not authenticated'); setLoading(false); return }
      try {
        const r = await fetch('/api/test/list', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await r.json()
        if (!cancelled) {
          if (r.ok) setData(json)
          else setError(json.error || 'Failed to load')
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function startTest(params) {
    // Stash params for the active screen to consume
    sessionStorage.setItem('padee-test-start', JSON.stringify(params))
    onNavigate('test')  // → /tests/active
  }

  function openReview(sessionId) {
    onNavigate('test-results', { sessionId })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <div className="flex justify-center gap-2 mb-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#0D9488', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-sm" style={{ color: '#6B7280' }}>Loading tests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const selectedSubjects = data?.selectedSubjects || []
  const assignments = data?.assignments || []
  const pendingAssignments = assignments.filter(a => !a.completed)
  const aiRec = data?.aiRecommendation
  const completedTests = data?.completedTests || []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>Tests</h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>Take a timed test to check your understanding</p>
      </div>

      {/* ─── Teacher-assigned tests ─── */}
      {pendingAssignments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
            📋 Assigned by your teacher ({pendingAssignments.length})
          </h2>
          <div className="space-y-3">
            {pendingAssignments.map(a => {
              const colors = SUBJECT_COLORS[a.subject] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' }
              const isOverdue = a.deadline && new Date(a.deadline) < new Date()
              return (
                <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border"
                  style={{ borderLeft: `4px solid ${colors.text}` }}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{SUBJECT_ICONS[a.subject] || '📖'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold" style={{ color: '#111827' }}>{a.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-1" style={{ color: '#6B7280' }}>
                        <span>{a.subject}</span>
                        <span>·</span>
                        <span>{a.question_count} questions</span>
                        <span>·</span>
                        <span className="capitalize">{a.difficulty}</span>
                        <span>·</span>
                        <span style={{ color: isOverdue ? '#DC2626' : '#6B7280', fontWeight: isOverdue ? 600 : 400 }}>
                          {formatDeadline(a.deadline)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startTest({ mode: 'teacher', assignmentId: a.id })}
                    disabled={isOverdue}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ background: isOverdue ? '#9CA3AF' : colors.text, cursor: isOverdue ? 'not-allowed' : 'pointer' }}>
                    {isOverdue ? 'Overdue' : 'Start test'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── AI-recommended test ─── */}
      {aiRec && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
            ✨ Recommended for you
          </h2>
          <div className="rounded-2xl p-5 shadow-sm border"
            style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)', borderColor: '#A7F3D0' }}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">{SUBJECT_ICONS[aiRec.subject] || '📖'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#059669' }}>AI suggests</p>
                <h3 className="text-base font-bold" style={{ color: '#065F46' }}>
                  {aiRec.subject} · {aiRec.questionCount} questions · {aiRec.difficulty}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#047857' }}>{aiRec.reason}</p>
              </div>
            </div>
            <button
              onClick={() => startTest({
                mode: 'ai_recommended',
                subject: aiRec.subject,
                classLevel: user.studentClass || data.classLevel,
                questionCount: aiRec.questionCount,
                difficulty: aiRec.difficulty,
              })}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: '#059669' }}>
              Start recommended test
            </button>
          </div>
        </div>
      )}

      {/* ─── Self-pick test ─── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
          🎯 Create your own test
        </h2>
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          {/* Subject picker */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>Subject</label>
            {selectedSubjects.length === 0 ? (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Complete onboarding to pick subjects.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedSubjects.map(s => {
                  const colors = SUBJECT_COLORS[s] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' }
                  const selected = pickSubject === s
                  return (
                    <button key={s} onClick={() => setPickSubject(s)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left"
                      style={{
                        background: selected ? colors.bg : '#FFFFFF',
                        border: `2px solid ${selected ? colors.text : '#E5E7EB'}`,
                        color: selected ? colors.text : '#111827',
                      }}>
                      <span className="text-lg">{SUBJECT_ICONS[s] || '📖'}</span>
                      <span className="text-sm font-medium truncate">{s}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Length picker */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>Length</label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map(n => (
                <button key={n} onClick={() => setPickLength(n)}
                  className="py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: pickLength === n ? '#0D9488' : '#FFFFFF',
                    color: pickLength === n ? '#FFFFFF' : '#111827',
                    border: `2px solid ${pickLength === n ? '#0D9488' : '#E5E7EB'}`,
                  }}>
                  {n} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty picker */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Easy', icon: '🟢' },
                { id: 'medium', label: 'Medium', icon: '🟡' },
                { id: 'hard', label: 'Hard', icon: '🔴' },
              ].map(d => (
                <button key={d.id} onClick={() => setPickDifficulty(d.id)}
                  className="py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1"
                  style={{
                    background: pickDifficulty === d.id ? '#F0FDFA' : '#FFFFFF',
                    color: pickDifficulty === d.id ? '#0F766E' : '#111827',
                    border: `2px solid ${pickDifficulty === d.id ? '#0D9488' : '#E5E7EB'}`,
                  }}>
                  <span>{d.icon}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time estimate */}
          <p className="text-xs text-center mb-3" style={{ color: '#9CA3AF' }}>
            ⏱️ Estimated time: {pickLength} min ({pickLength * 60}s per question)
          </p>

          <button
            onClick={() => pickSubject && startTest({
              mode: 'self',
              subject: pickSubject,
              classLevel: user.studentClass || data.classLevel,
              questionCount: pickLength,
              difficulty: pickDifficulty,
            })}
            disabled={!pickSubject}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: pickSubject ? '#0D9488' : '#F3F4F6',
              color: pickSubject ? '#FFFFFF' : '#9CA3AF',
              cursor: pickSubject ? 'pointer' : 'not-allowed',
            }}>
            {pickSubject ? `Start ${pickLength}-question ${pickSubject} test` : 'Pick a subject to start'}
          </button>
        </div>
      </div>

      {/* ─── Recent completed tests ─── */}
      {completedTests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
            📈 Your recent tests
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border divide-y overflow-hidden">
            {completedTests.map(t => {
              const colors = SUBJECT_COLORS[t.subject] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' }
              const accuracy = t.total_marks > 0 ? Math.round((t.score / t.total_marks) * 100) : 0
              const scoreColor = accuracy >= 80 ? '#059669' : accuracy >= 60 ? '#D97706' : '#DC2626'
              return (
                <button key={t.id} onClick={() => openReview(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <span className="text-xl">{SUBJECT_ICONS[t.subject] || '📖'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{t.title}</p>
                    <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                      {formatDate(t.created_at)} · {t.source === 'teacher' ? 'Teacher' : t.source === 'ai_recommended' ? 'AI-rec' : 'Self'}
                      {t.difficulty ? ` · ${t.difficulty}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono" style={{ color: scoreColor }}>{accuracy}%</p>
                    <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{t.score}/{t.total_marks}</p>
                  </div>
                  <span style={{ color: '#9CA3AF' }}>›</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
