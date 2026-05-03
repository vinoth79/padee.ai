// ═══════════════════════════════════════════════════════════════════════════
// TeacherAssignTestScreenV4 — Assign · what / who / when
// ═══════════════════════════════════════════════════════════════════════════
// Three-column wizard for handing off content to the class:
//   1. WHAT — pick the artefact (saved worksheet, paper mimic, practice set,
//      live recap, NCERT reading). Worksheet/mimic come from the teacher's
//      library; the rest are placeholders pending Phase 2.
//   2. WHO  — class roster with checkboxes. Pa surfaces a banner when many
//      students are below 60% mastery so the teacher can scope to weak only.
//   3. WHEN — release window + due date + assignment toggles + Pa's nudge
//      cadence (informational; cron lands in Phase 2).
//
// Pre-fill paths: sessionStorage["padee-prefill-test"] (alert-driven action)
// and router state.fromWorksheet (worksheet generator hand-off).
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import {
  listWorksheets, getWorksheet, listTeacherStudents, assignTest,
} from '../services/api'
import TeacherTopNav from '../components/teacher-v4/TeacherTopNav'
import '../styles/home-v4.css'
import '../styles/teacher-v4.css'

const AVATAR_COLORS = ['#7C5CFF', '#E85D3A', '#36D399', '#4C7CFF', '#FF4D8B', '#FFB547', '#2BD3F5', '#9B5DE5']
function avatar(name, idx) {
  const init = (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return { init: init || '?', color: AVATAR_COLORS[idx % AVATAR_COLORS.length] }
}

const STATIC_PLACEHOLDERS = [
  {
    id: 'placeholder-practice',
    type: 'practice',
    eyebrow: 'PRACTICE SET',
    title: "Newton's 2nd law focus",
    meta: '10 MCQs · 12 min · Pa-curated',
    tags: ['Ch 9', 'Targeted', 'Easy-Med'],
    disabled: true,
  },
  {
    id: 'placeholder-live',
    type: 'live',
    eyebrow: 'LIVE RECAP',
    title: '5-min Force recap',
    meta: 'Pa-narrated · auto-paced',
    tags: ['Ch 9', 'Video'],
    disabled: true,
  },
  {
    id: 'placeholder-read',
    type: 'read',
    eyebrow: 'READING',
    title: 'NCERT Ch 9 · sections 9.3–9.5',
    meta: '3 sections · est. 14 min read',
    tags: ['Ch 9', 'NCERT'],
    disabled: true,
  },
]

export default function TeacherAssignTestScreenV4() {
  const { token } = useAuth()
  const user = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  // ─── Library ───
  const [worksheets, setWorksheets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null) // full worksheet object
  const [loadingLibrary, setLoadingLibrary] = useState(true)

  // ─── Students ───
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [picked, setPicked] = useState(new Set())
  const [filter, setFilter] = useState('all') // all | weak

  // ─── When ───
  const [release, setRelease] = useState('now')
  const [due, setDue] = useState('friday') // tomorrow | friday | custom
  const [customDue, setCustomDue] = useState('')

  // Toggles
  const [autoGrade, setAutoGrade]       = useState(true)
  const [allowHints, setAllowHints]     = useState(true)
  const [hideLeader, setHideLeader]     = useState(false)
  const [notifyParents, setNotifyParents] = useState(true)

  // ─── Save ───
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load library + students once
  useEffect(() => {
    if (!token) return
    listWorksheets(token).then(d => {
      setLoadingLibrary(false)
      if (Array.isArray(d.worksheets)) setWorksheets(d.worksheets)
    })
    listTeacherStudents(token).then(d => {
      setStudentsLoading(false)
      if (Array.isArray(d.students)) {
        setStudents(d.students)
        // Pre-pick all by default
        setPicked(new Set(d.students.map(s => s.id)))
      }
    })
  }, [token])

  // Handle deep links
  useEffect(() => {
    const fromWorksheet = location.state?.fromWorksheet
    if (fromWorksheet && !selectedId) setSelectedId(fromWorksheet)
    // sessionStorage prefill (from teacher alerts)
    const prefillStr = sessionStorage.getItem('padee-prefill-test')
    if (prefillStr) sessionStorage.removeItem('padee-prefill-test')
  }, [location.state, selectedId])

  // Auto-pick first worksheet when library loads
  useEffect(() => {
    if (selectedId || worksheets.length === 0) return
    setSelectedId(worksheets[0].id)
  }, [worksheets, selectedId])

  // Fetch full worksheet on selection
  useEffect(() => {
    if (!selectedId || !token) return
    let cancelled = false
    getWorksheet(token, selectedId).then(d => {
      if (cancelled) return
      if (d.worksheet) setSelected(d.worksheet)
    })
    return () => { cancelled = true }
  }, [selectedId, token])

  // Filtered + decorated student list — mocks per-student mastery for the
  // demo until subject_mastery is wired into this view.
  const decoratedStudents = useMemo(() => {
    return students.map((s, idx) => {
      // Pseudo-mastery from id hash so it's stable across renders
      const seed = (s.id || '').charCodeAt(0) || idx
      const mastery = 35 + ((seed * 13) % 60)
      return { ...s, mastery, ...avatar(s.name, idx) }
    }).filter(s => filter === 'weak' ? s.mastery < 60 : true)
  }, [students, filter])

  const weakCount = useMemo(() => students.filter((s, idx) => {
    const seed = (s.id || '').charCodeAt(0) || idx
    const mastery = 35 + ((seed * 13) % 60)
    return mastery < 60
  }).length, [students])

  function togglePick(id) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function applyPaSuggestion() {
    const weak = new Set()
    students.forEach((s, idx) => {
      const seed = (s.id || '').charCodeAt(0) || idx
      const mastery = 35 + ((seed * 13) % 60)
      if (mastery < 60) weak.add(s.id)
    })
    setPicked(weak)
  }

  // Compute due ISO
  function computeDueISO() {
    const now = new Date()
    if (due === 'tomorrow') {
      const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(23, 59, 0, 0)
      return t.toISOString()
    }
    if (due === 'friday') {
      const t = new Date(now)
      const offset = (5 - t.getDay() + 7) % 7 || 7
      t.setDate(t.getDate() + offset); t.setHours(23, 59, 0, 0)
      return t.toISOString()
    }
    if (due === 'custom' && customDue) return new Date(customDue).toISOString()
    return null
  }

  // Convert worksheet questions → test format expected by /api/test/assign
  function buildTestQuestions(worksheet) {
    if (!worksheet?.sections) return []
    const out = []
    for (const sec of worksheet.sections) {
      for (const q of (sec.questions || [])) {
        const optionsArr = q.options
          ? Object.values(q.options)
          : ['Option A', 'Option B', 'Option C', 'Option D']
        const correctKey = (q.answer || 'A').trim()
        const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctKey.toUpperCase()) >= 0
          ? ['A', 'B', 'C', 'D'].indexOf(correctKey.toUpperCase())
          : 0
        out.push({
          question: q.question,
          options: optionsArr,
          correctIndex: correctIdx,
          explanation: q.answer_explanation || '',
          difficulty: q.difficulty || 'medium',
          concept_slug: q.concept_slug || null,
        })
      }
    }
    return out
  }

  async function handleAssign() {
    if (!selected) { setError('Pick a worksheet first'); return }
    if (picked.size === 0) { setError('Pick at least one student'); return }
    setError('')
    setSaving(true)

    const questions = buildTestQuestions(selected)
    const res = await assignTest(token, {
      title: selected.title || 'Class assignment',
      subject: selected.subject || 'General',
      classLevel: selected.class_level || user?.studentClass || 10,
      questionCount: questions.length,
      difficulty: selected.difficulty || 'mixed',
      deadline: computeDueISO(),
      questions,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    navigate('/teacher', { replace: true })
  }

  // Selected what-card (label for header)
  const headerLabel = selected
    ? `Assign · ${selected.chapter || selected.subject} · Worksheet draft`
    : 'Assign'

  const releaseDateText = useMemo(() => {
    const d = new Date()
    return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
  }, [])

  const dueLabel = useMemo(() => {
    const iso = computeDueISO()
    if (!iso) return 'No deadline'
    const d = new Date(iso)
    return `Due ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due, customDue])

  return (
    <div className="teacher-v4">
      <TeacherTopNav />
      <div className="pd-page">
        <div className="page-head">
          <div>
            <div className="head-eyebrow">04 — desktop</div>
            <h2 className="t-h1" style={{ marginTop: 4 }}>{headerLabel}</h2>
          </div>
          <div className="head-eyebrow" style={{ color: 'var(--c-muted-2)' }}>what · who · when</div>
        </div>

        {error && (
          <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        <div className="assign-grid">
          {/* ─── 1 · WHAT ─── */}
          <div className="assign-step">
            <div className="step-head">
              <div className="step-title">
                <span className="step-num">1 · What</span>
              </div>
              <div className="step-meta">▾ Recent</div>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Pick what to assign</h3>

            {loadingLibrary && [0, 1, 2].map(i => (
              <div key={i} className="what-card" style={{ pointerEvents: 'none' }}>
                <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 11, width: '80%' }} />
              </div>
            ))}

            {!loadingLibrary && worksheets.length === 0 && (
              <div className="empty-state" style={{ padding: '20px 12px' }}>
                <div className="icon" style={{ fontSize: 24 }}>📝</div>
                <h3>No saved worksheets</h3>
                <p>Generate one in <a onClick={() => navigate('/teacher/worksheet')} style={{ color: 'var(--c-accent)', cursor: 'pointer', fontWeight: 600 }}>Worksheet</a> first.</p>
              </div>
            )}

            {!loadingLibrary && worksheets.map(w => {
              const isMimic = w.mode === 'mimic' || (w.title || '').toLowerCase().includes('mimic')
              const isSelected = w.id === selectedId
              return (
                <button
                  key={w.id}
                  className={`what-card ${isSelected ? 'selected' : ''} ${isMimic ? 'what-mimic' : ''}`}
                  onClick={() => setSelectedId(w.id)}
                  type="button"
                >
                  <div className="what-head">
                    <div className={`what-icon ${isMimic ? 'mimic' : 'ws'}`}>
                      {isMimic ? <CopyIco /> : <DocIco />}
                    </div>
                    <div className="what-text">
                      <div className="what-eyebrow">{isMimic ? 'PAPER MIMIC' : 'WORKSHEET'}</div>
                      <div className="what-title">{w.title}</div>
                      <div className="what-meta">
                        {w.total_marks ? `${w.total_marks} marks · ` : ''}
                        {w.total_questions ? `${w.total_questions} questions · ` : ''}
                        {w.created_at ? `Drafted ${relativeDay(w.created_at)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="what-tags">
                    {w.chapter && <span className="what-tag">{w.chapter.split(/\s+/).slice(0, 2).join(' ')}</span>}
                    <span className="what-tag">{(w.difficulty || 'mixed').replace(/^./, c => c.toUpperCase())}</span>
                    {isMimic ? <span className="what-tag">Numerical-led</span> : <span className="what-tag">Adaptive</span>}
                  </div>
                  {isSelected && <span className="selected-mark">✓</span>}
                </button>
              )
            })}

            {/* Phase-2 placeholders */}
            {STATIC_PLACEHOLDERS.map(p => (
              <div key={p.id} className={`what-card disabled what-${p.type}`}>
                <div className="what-head">
                  <div className={`what-icon ${p.type}`}>
                    {p.type === 'prac' ? <PlayIco /> : p.type === 'live' ? <RadioIco /> : <BookIco />}
                  </div>
                  <div className="what-text">
                    <div className="what-eyebrow">{p.eyebrow}</div>
                    <div className="what-title">{p.title}</div>
                    <div className="what-meta">{p.meta}</div>
                  </div>
                </div>
                <div className="what-tags">
                  {p.tags.map(t => <span key={t} className="what-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* ─── 2 · WHO ─── */}
          <div className="assign-step">
            <div className="step-head">
              <div className="step-title">
                <span className="step-num">2 · Who</span>
              </div>
              <div className="who-toggle">
                <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All {students.length}</button>
                <button className={filter === 'weak' ? 'active' : ''} onClick={() => setFilter('weak')}>Weak only</button>
              </div>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>
              Class {user?.studentClass || '—'}{user?.studentClass ? '-B' : ''} · {students.length} students
            </h3>

            {weakCount >= 3 && filter === 'all' && picked.size !== weakCount && (
              <div className="pa-suggest">
                <span className="icon">💡</span>
                <p>Pa suggests assigning <b>only to the {weakCount} students</b> below 60% mastery on this concept.</p>
                <button onClick={applyPaSuggestion}>Apply</button>
              </div>
            )}

            {studentsLoading && [0, 1, 2, 3, 4].map(i => (
              <div key={i} className="who-row">
                <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 5 }} />
                <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                </div>
                <div className="skeleton" style={{ width: 40, height: 12 }} />
              </div>
            ))}

            {!studentsLoading && decoratedStudents.length === 0 && (
              <div className="empty-state" style={{ padding: '20px 12px' }}>
                <div className="icon" style={{ fontSize: 24 }}>👥</div>
                <h3>No students yet</h3>
                <p>Students show up here as they sign up to your class.</p>
              </div>
            )}

            {!studentsLoading && decoratedStudents.map(s => {
              const isPicked = picked.has(s.id)
              const tone = s.mastery >= 75 ? 'strong' : s.mastery >= 50 ? 'mid' : 'weak'
              return (
                <div key={s.id} className={`who-row ${isPicked ? 'checked' : ''}`} onClick={() => togglePick(s.id)} style={{ cursor: 'pointer' }}>
                  <div className={`check ${isPicked ? 'on' : ''}`}>{isPicked ? '✓' : ''}</div>
                  <div className="av" style={{ background: s.color }}>{s.init}</div>
                  <div className="name">{s.name || 'Student'}</div>
                  <div className="stats">
                    <span className={`pct ${tone}`}>{s.mastery}%</span>
                    {tone === 'weak' && <span className="tag weak">WEAK</span>}
                    {tone === 'strong' && <span className="tag strong">STRONG</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ─── 3 · WHEN ─── */}
          <div className="when-col">
            <div className="assign-step">
              <div className="step-head">
                <div className="step-title">
                  <span className="step-num">3 · When</span>
                </div>
              </div>
              <div className="when-section">
                <div className="ws-label">Release</div>
                <select className="ws-select" value={release} onChange={e => setRelease(e.target.value)}>
                  <option value="now">Now · {releaseDateText}</option>
                  <option value="next-class">Next class</option>
                  <option value="custom">Custom…</option>
                </select>
              </div>
              <div className="when-section">
                <div className="ws-label">Due</div>
                <div className="due-row">
                  <button className={`due-btn ${due === 'tomorrow' ? 'selected' : ''}`} onClick={() => setDue('tomorrow')}>Tomorrow</button>
                  <button className={`due-btn ${due === 'friday' ? 'selected' : ''}`} onClick={() => setDue('friday')}>Friday</button>
                  <button className={`due-btn ${due === 'custom' ? 'selected' : ''}`} onClick={() => setDue('custom')}>Custom</button>
                </div>
                {due === 'custom' && (
                  <input type="datetime-local" className="ws-input" style={{ marginTop: 8 }}
                    value={customDue} onChange={e => setCustomDue(e.target.value)} />
                )}
                <div className="due-meta">{dueLabel}</div>
              </div>

              {[
                { id: 'auto',    label: 'Auto-grade MCQs & numericals', val: autoGrade, set: setAutoGrade },
                { id: 'hints',   label: 'Allow Pa hints during attempt', val: allowHints, set: setAllowHints },
                { id: 'hide',    label: 'Hide leaderboard until due date', val: hideLeader, set: setHideLeader },
                { id: 'notify',  label: 'Notify parents on submission', val: notifyParents, set: setNotifyParents },
              ].map(t => (
                <div key={t.id} className="toggle-row">
                  <button type="button" className={`toggle-switch ${t.val ? 'on' : ''}`} onClick={() => t.set(v => !v)} aria-label={t.label} />
                  <span>{t.label}</span>
                </div>
              ))}

              <button className="pd-btn primary" style={{ width: '100%', marginTop: 14 }} onClick={handleAssign} disabled={saving || !selected || picked.size === 0}>
                {saving ? 'Assigning…' : `Assign to ${picked.size} student${picked.size === 1 ? '' : 's'}`}
              </button>
            </div>

            {/* Pa's nudge plan */}
            <div className="nudge-plan">
              <div className="eyebrow">★ Pa's nudge plan</div>
              <p className="nudge-blurb">I'll send these on your behalf. Soft pings, never spam.</p>
              <div className="nudge-row">
                <span className="at">T+0</span>
                <span>Pa intro + start CTA</span>
                <span className="who-count">{picked.size} students</span>
              </div>
              <div className="nudge-row">
                <span className="at">T+24h</span>
                <span>Reminder if not started</span>
                <span className="who-count">~{Math.round(picked.size * 0.35)} expected</span>
              </div>
              <div className="nudge-row">
                <span className="at">T+48h</span>
                <span>Personal nudge w/ hint</span>
                <span className="who-count">~{Math.round(picked.size * 0.15)} expected</span>
              </div>
              <div className="nudge-row">
                <span className="at">T+72h</span>
                <span>Teacher escalation</span>
                <span className="who-count">You + parent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helpers
function relativeDay(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86400000
  if (diff < day) return 'today'
  if (diff < 2 * day) return 'yesterday'
  return `${Math.floor(diff / day)}d ago`
}

// Inline SVG icons
function DocIco()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function CopyIco()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> }
function PlayIco()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function RadioIco() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/></svg> }
function BookIco()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
