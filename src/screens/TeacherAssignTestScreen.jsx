import { useState, useEffect } from 'react'

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English']
const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖',
}
const CLASSES = [8, 9, 10, 11, 12]

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try {
    const s = JSON.parse(localStorage.getItem(key))
    return s?.access_token || s?.currentSession?.access_token || null
  } catch { return null }
}

function formatDeadline(iso) {
  if (!iso) return 'No deadline'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TeacherAssignTestScreen({ onNavigate }) {
  // Form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Physics')
  const [classLevel, setClassLevel] = useState(10)
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [deadline, setDeadline] = useState('')

  // Preview state
  const [previewQuestions, setPreviewQuestions] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Existing assignments
  const [assignments, setAssignments] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  async function loadAssignments() {
    const token = getToken()
    if (!token) return
    try {
      const r = await fetch('/api/test/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      if (r.ok) setAssignments(data.assignments || [])
    } catch {}
    setLoadingList(false)
  }

  useEffect(() => {
    loadAssignments()
    // Pre-fill from alert action (teacher clicked "Create remedial worksheet")
    const prefillStr = sessionStorage.getItem('padee-prefill-test')
    if (prefillStr) {
      try {
        const p = JSON.parse(prefillStr)
        if (p.title) setTitle(p.title)
        if (p.subject) setSubject(p.subject)
        if (p.classLevel) setClassLevel(p.classLevel)
        if (p.questionCount) setQuestionCount(p.questionCount)
        if (p.difficulty) setDifficulty(p.difficulty)
      } catch {}
      sessionStorage.removeItem('padee-prefill-test')
    }
  }, [])

  async function handlePreview() {
    setError('')
    setSuccess('')
    setPreviewing(true)
    const token = getToken()
    try {
      const r = await fetch('/api/test/assign/preview', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, classLevel, questionCount, difficulty }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to generate preview')
      setPreviewQuestions(data.questions)
      if (!title) setTitle(`${subject} Test — Class ${classLevel}`)
    } catch (err) {
      setError(err.message)
    }
    setPreviewing(false)
  }

  async function handlePublish() {
    if (!title.trim()) { setError('Please add a title'); return }
    if (!previewQuestions || previewQuestions.length === 0) {
      setError('Generate questions first')
      return
    }
    setError('')
    setPublishing(true)
    const token = getToken()
    try {
      const r = await fetch('/api/test/assign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, subject, classLevel,
          questionCount: previewQuestions.length,
          difficulty,
          questions: previewQuestions,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to publish')
      setSuccess(`"${title}" assigned to all Class ${classLevel} students.`)
      setPreviewQuestions(null)
      setTitle('')
      setDeadline('')
      loadAssignments()
    } catch (err) {
      setError(err.message)
    }
    setPublishing(false)
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this test? Students will no longer see it.')) return
    const token = getToken()
    try {
      await fetch(`/api/test/assignments/${id}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      loadAssignments()
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>Assign a test</h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Generate MCQs with AI, preview, then publish to all students in a class.
        </p>
      </div>

      {/* ─── Form ─── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Test title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Unit Test 1 — Motion & Force"
            className="w-full px-3 py-2 rounded-xl text-sm border"
            style={{ borderColor: '#E5E7EB' }} />
        </div>

        {/* Subject + Class */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border bg-white"
              style={{ borderColor: '#E5E7EB' }}>
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_ICONS[s]} {s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Class</label>
            <select value={classLevel} onChange={e => setClassLevel(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-sm border bg-white"
              style={{ borderColor: '#E5E7EB' }}>
              {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        </div>

        {/* Count + difficulty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Questions</label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map(n => (
                <button key={n} onClick={() => setQuestionCount(n)}
                  className="py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: questionCount === n ? '#0D9488' : '#FFFFFF',
                    color: questionCount === n ? '#FFFFFF' : '#111827',
                    border: `2px solid ${questionCount === n ? '#0D9488' : '#E5E7EB'}`,
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                  style={{
                    background: difficulty === d ? '#F0FDFA' : '#FFFFFF',
                    color: difficulty === d ? '#0F766E' : '#111827',
                    border: `2px solid ${difficulty === d ? '#0D9488' : '#E5E7EB'}`,
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Deadline (optional)</label>
          <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border bg-white"
            style={{ borderColor: '#E5E7EB' }} />
        </div>

        {/* Errors / success */}
        {error && <div className="rounded-xl p-3 text-sm" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }}>{error}</div>}
        {success && <div className="rounded-xl p-3 text-sm" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>{success}</div>}

        {/* Preview button */}
        <button onClick={handlePreview} disabled={previewing}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: previewing ? '#F3F4F6' : '#FFFFFF',
            color: previewing ? '#9CA3AF' : '#0F766E',
            border: '1px solid #CCFBF1',
          }}>
          {previewing ? 'Generating questions...' : previewQuestions ? '🔄 Regenerate' : '✨ Generate preview'}
        </button>
      </div>

      {/* ─── Preview ─── */}
      {previewQuestions && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
              Preview ({previewQuestions.length} questions)
            </h2>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Click any question to expand</span>
          </div>
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {previewQuestions.map((q, i) => (
              <details key={i} className="rounded-xl p-3 group" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                <summary className="cursor-pointer list-none flex items-start gap-2">
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: '#0D9488' }}>Q{i + 1}.</span>
                  <span className="text-sm" style={{ color: '#111827' }}>{q.question}</span>
                </summary>
                <div className="mt-3 ml-7 space-y-1.5">
                  {q.options.map((opt, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{
                          background: j === q.correctIndex ? '#ECFDF5' : '#FFFFFF',
                          color: j === q.correctIndex ? '#065F46' : '#6B7280',
                          border: `1px solid ${j === q.correctIndex ? '#A7F3D0' : '#E5E7EB'}`,
                        }}>
                        {String.fromCharCode(65 + j)}
                      </span>
                      <span style={{ color: j === q.correctIndex ? '#065F46' : '#374151' }}>
                        {opt} {j === q.correctIndex && '✓'}
                      </span>
                    </div>
                  ))}
                  {q.explanation && (
                    <p className="text-[11px] mt-2 italic" style={{ color: '#6B7280' }}>💡 {q.explanation}</p>
                  )}
                </div>
              </details>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPreviewQuestions(null)} disabled={publishing}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F3F4F6', color: '#374151' }}>
              Discard
            </button>
            <button onClick={handlePublish} disabled={publishing || !title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: publishing || !title.trim() ? '#9CA3AF' : '#0D9488' }}>
              {publishing ? 'Publishing...' : `Assign to Class ${classLevel}`}
            </button>
          </div>
        </div>
      )}

      {/* ─── Existing assignments ─── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
          Your assigned tests ({assignments.length})
        </h2>
        {loadingList ? (
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading...</p>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border text-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>No tests assigned yet. Create one above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border divide-y overflow-hidden">
            {assignments.map(a => (
              <div key={a.id} className="p-4 flex items-center gap-3">
                <span className="text-xl">{SUBJECT_ICONS[a.subject] || '📖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>{a.title}</p>
                    {!a.active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>Inactive</span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                    Class {a.class_level} · {a.subject} · {a.question_count} Qs · {a.difficulty} · {formatDeadline(a.deadline)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono" style={{ color: '#0D9488' }}>{a.stats?.submissions || 0}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>submitted</p>
                </div>
                {a.stats?.submissions > 0 && (
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono" style={{ color: '#059669' }}>{a.stats.avgScore}%</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>avg</p>
                  </div>
                )}
                {a.active && (
                  <button onClick={() => handleDeactivate(a.id)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ background: '#FEF2F2', color: '#991B1B' }}>
                    Deactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
