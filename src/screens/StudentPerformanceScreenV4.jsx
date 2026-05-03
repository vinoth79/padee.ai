// ═══════════════════════════════════════════════════════════════════════════
// StudentPerformanceScreenV4 — class roster table at /teacher/students.
// ═══════════════════════════════════════════════════════════════════════════
// Reads /api/teacher/students for real names + class + streak. Mastery,
// status, sparkline, XP-30D, HW counts are derived client-side from a stable
// id-hash until the endpoint returns aggregate per-student stats. Sidebar
// has Section / Flags / Mastery-band filters + quick actions. Click any row
// to drill into /teacher/student/:id.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listTeacherStudents } from '../services/api'
import TeacherTopNav from '../components/teacher-v4/TeacherTopNav'
import '../styles/home-v4.css'
import '../styles/teacher-v4.css'

const AVATAR_COLORS = ['#7C5CFF', '#E85D3A', '#36D399', '#4C7CFF', '#FF4D8B', '#FFB547', '#2BD3F5', '#9B5DE5']

function avatarFor(name, idx) {
  const init = (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return { init: init || '?', color: AVATAR_COLORS[idx % AVATAR_COLORS.length] }
}

function hashSeed(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function decorateStudent(s, idx) {
  const seed = hashSeed(s.id)
  // Stable mock fields until backend extends:
  const mastery = 38 + (seed % 60)            // 38-97
  const xp30 = 22 + (seed % 320)              // 22-341
  const hwDone = (seed % 5)                   // 0-4
  const lastActivityHours = ((seed >> 3) % 48) + 1 // 1-48h
  const streak = ((seed >> 5) % 22)           // 0-21d (real if backend returned it)
  const realStreak = (Array.isArray(s.streak) ? s.streak[0] : s.streak)?.current_streak
  const streakFinal = (realStreak != null ? realStreak : streak)

  // Status pill
  let status
  if (mastery >= 90 && streakFinal >= 7) status = 'top10'
  else if (mastery < 50) status = 'atrisk'
  else if (xp30 < 60) status = 'declining'
  else if (mastery < 75 && xp30 > 200) status = 'rising'
  else status = 'steady'

  // 30-day trend sparkline (random walk, stable per id)
  const trend = []
  let base = mastery - 15
  let r = seed
  for (let i = 0; i < 14; i++) {
    r = (r * 1103515245 + 12345) & 0x7fffffff
    const delta = ((r % 14) - 6)
    base = Math.max(20, Math.min(100, base + delta))
    trend.push(base)
  }
  // Adjust trend direction so it matches status visually
  if (status === 'top10' || status === 'rising') trend.sort((a, b) => a - b)
  if (status === 'declining' || status === 'atrisk') trend.sort((a, b) => b - a)

  const av = avatarFor(s.name, idx)
  const rollNum = String(idx + 1).padStart(2, '0')
  return {
    ...s,
    av,
    mastery,
    xp30,
    hwDone,
    hwTotal: 4,
    streakFinal,
    lastActivityHours,
    status,
    trend,
    rollNum,
    studentIdShort: 'PD' + (seed % 10000).toString().padStart(4, '0'),
  }
}

const STATUS_LABEL = {
  top10:     'Top 10%',
  rising:    'Rising',
  steady:    'Steady',
  declining: 'Declining',
  atrisk:    'At risk',
}

const FLAGS = [
  { id: 'atrisk',   label: 'At risk',         dot: '#FF4D8B' },
  { id: 'declining', label: 'Declining',      dot: '#FFB547' },
  { id: 'rising',   label: 'Rising',          dot: '#4C7CFF' },
  { id: 'top10',    label: 'Top 10%',         dot: '#36D399' },
  { id: 'no-hw',    label: 'No HW this wk',   dot: '#FF4D8B' },
  { id: 'streak',   label: 'Streak ≥ 7d',    dot: '#FFB547' },
]

const MASTERY_BANDS = [
  { id: '90-100', label: '90-100%', min: 90, max: 100 },
  { id: '70-89',  label: '70-89%',  min: 70, max: 89 },
  { id: '50-69',  label: '50-69%',  min: 50, max: 69 },
  { id: 'below50', label: 'Below 50%', min: 0,  max: 49 },
]

export default function StudentPerformanceScreenV4() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [section, setSection] = useState('all')   // all | A | B | C
  const [classFilter, setClassFilter] = useState(null)
  const [activeFlags, setActiveFlags] = useState(new Set())
  const [activeBand, setActiveBand] = useState(null)
  const [sortBy, setSortBy] = useState('mastery-desc')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    listTeacherStudents(token).then(res => {
      if (cancelled) return
      setLoading(false)
      if (res.error) { setError(res.error); return }
      setStudents(res.students || [])
    })
    return () => { cancelled = true }
  }, [token])

  const decorated = useMemo(() => students.map((s, idx) => decorateStudent(s, idx)), [students])

  // Derived counts for sidebar
  const sectionCounts = useMemo(() => {
    // Simulated section split (round-robin) since we don't store sections yet
    const buckets = { A: 0, B: 0, C: 0 }
    decorated.forEach((s, i) => {
      const sec = ['A', 'B', 'C'][i % 3]
      buckets[sec]++
    })
    return buckets
  }, [decorated])

  const flagCounts = useMemo(() => {
    const counts = {}
    for (const f of FLAGS) counts[f.id] = 0
    for (const s of decorated) {
      if (s.status === 'atrisk') counts['atrisk']++
      if (s.status === 'declining') counts['declining']++
      if (s.status === 'rising') counts['rising']++
      if (s.status === 'top10') counts['top10']++
      if (s.hwDone === 0) counts['no-hw']++
      if (s.streakFinal >= 7) counts['streak']++
    }
    return counts
  }, [decorated])

  const bandCounts = useMemo(() => {
    const counts = {}
    for (const b of MASTERY_BANDS) counts[b.id] = decorated.filter(s => s.mastery >= b.min && s.mastery <= b.max).length
    return counts
  }, [decorated])

  // Apply filters + sort
  const filtered = useMemo(() => {
    let out = decorated

    // Section (mocked round-robin)
    if (section !== 'all') {
      const targetSec = section
      out = out.filter((s, i) => ['A', 'B', 'C'][students.indexOf(s) % 3] === targetSec)
    }

    if (classFilter) out = out.filter(s => s.class_level === classFilter)

    if (search) {
      const q = search.toLowerCase()
      out = out.filter(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
    }

    if (activeFlags.size) {
      out = out.filter(s => {
        for (const f of activeFlags) {
          if (f === 'atrisk' && s.status === 'atrisk') return true
          if (f === 'declining' && s.status === 'declining') return true
          if (f === 'rising' && s.status === 'rising') return true
          if (f === 'top10' && s.status === 'top10') return true
          if (f === 'no-hw' && s.hwDone === 0) return true
          if (f === 'streak' && s.streakFinal >= 7) return true
        }
        return false
      })
    }

    if (activeBand) {
      const band = MASTERY_BANDS.find(b => b.id === activeBand)
      if (band) out = out.filter(s => s.mastery >= band.min && s.mastery <= band.max)
    }

    // Sort
    out = [...out]
    if (sortBy === 'mastery-desc') out.sort((a, b) => b.mastery - a.mastery)
    else if (sortBy === 'mastery-asc') out.sort((a, b) => a.mastery - b.mastery)
    else if (sortBy === 'xp-desc') out.sort((a, b) => b.xp30 - a.xp30)
    else if (sortBy === 'name') out.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    else if (sortBy === 'streak-desc') out.sort((a, b) => b.streakFinal - a.streakFinal)
    return out
  }, [decorated, students, section, classFilter, search, activeFlags, activeBand, sortBy])

  function toggleFlag(id) {
    setActiveFlags(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Top-of-page label
  const dominantClass = useMemo(() => {
    if (decorated.length === 0) return null
    const c = decorated[0].class_level
    return c
  }, [decorated])

  const sectionLabel = section === 'all' ? '' : `-${section}`

  // Sparkline path for trend
  function trendPath(values, w = 90, h = 26) {
    const max = Math.max(...values), min = Math.min(...values)
    const range = Math.max(1, max - min)
    const step = w / Math.max(1, values.length - 1)
    return 'M' + values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' L')
  }

  function trendColor(status) {
    if (status === 'top10') return '#36D399'
    if (status === 'rising') return '#4C7CFF'
    if (status === 'steady') return '#8A8A95'
    if (status === 'declining') return '#FFB547'
    return '#FF4D8B'
  }

  return (
    <div className="teacher-v4">
      <TeacherTopNav />
      <div className="pd-page">
        {/* Page head */}
        <div className="page-head">
          <div>
            <div className="head-eyebrow">07 — desktop</div>
            <h2 className="t-h1" style={{ marginTop: 4 }}>
              {loading
                ? 'Students…'
                : `Class ${dominantClass || '—'}${sectionLabel} · ${filtered.length} student${filtered.length === 1 ? '' : 's'}`}
            </h2>
          </div>
          <div className="head-eyebrow" style={{ color: 'var(--c-muted-2)' }}>filter · sort · bulk actions</div>
        </div>

        {error && (
          <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        <div className="stu-grid">
          {/* ─── SIDEBAR ─── */}
          <div className="stu-side">
            <div className="stu-panel">
              <div className="panel-eyebrow">Section</div>
              {['A', 'B', 'C'].map(sec => (
                <button key={sec}
                  className={section === sec ? 'active' : ''}
                  onClick={() => setSection(s => s === sec ? 'all' : sec)}>
                  <span><span className="row-dot" style={{ background: sec === 'A' ? '#36D399' : sec === 'B' ? '#E85D3A' : '#4C7CFF' }} />9-{sec}</span>
                  <span className="count">{sectionCounts[sec] || 0}</span>
                </button>
              ))}
            </div>

            <div className="stu-panel">
              <div className="panel-eyebrow">Flags</div>
              {FLAGS.map(f => (
                <button key={f.id}
                  className={`flag-row ${activeFlags.has(f.id) ? 'on' : ''}`}
                  onClick={() => toggleFlag(f.id)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span className="checkbox">{activeFlags.has(f.id) ? '✓' : ''}</span>
                    <span className="row-dot" style={{ background: f.dot }} />
                    {f.label}
                  </span>
                  <span className="count">{flagCounts[f.id] || 0}</span>
                </button>
              ))}
            </div>

            <div className="stu-panel">
              <div className="panel-eyebrow">Mastery band</div>
              {MASTERY_BANDS.map(b => (
                <button key={b.id}
                  className={activeBand === b.id ? 'active' : ''}
                  onClick={() => setActiveBand(prev => prev === b.id ? null : b.id)}>
                  <span><span className="checkbox" style={{
                    width: 14, height: 14, border: '1.5px solid var(--c-muted-2)',
                    borderRadius: 3, marginRight: 8, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: activeBand === b.id ? 'var(--c-accent)' : 'transparent',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    borderColor: activeBand === b.id ? 'var(--c-accent)' : 'var(--c-muted-2)',
                  }}>{activeBand === b.id ? '✓' : ''}</span>{b.label}</span>
                  <span className="count" style={{ color: b.id === 'below50' ? 'var(--c-rose)' : b.id === '50-69' ? '#92400E' : b.id === '70-89' ? '#2147A8' : '#0F7A4F' }}>{bandCounts[b.id] || 0}</span>
                </button>
              ))}
            </div>

            <div className="stu-panel">
              <div className="panel-eyebrow">Quick actions</div>
              <button className="qa-btn"><UploadIco /> Import CSV</button>
              <button className="qa-btn"><DownloadIco /> Export report</button>
              <button className="qa-btn"><PlusIco /> Add student</button>
            </div>
          </div>

          {/* ─── MAIN TABLE ─── */}
          <div className="stu-main">
            <div className="stu-tools">
              <div className="stu-search">
                <SearchIco />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, parent, roll no…" />
              </div>
              <div className="sort">
                <span>Sort:</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="mastery-desc">Mastery ↓</option>
                  <option value="mastery-asc">Mastery ↑</option>
                  <option value="xp-desc">XP-30D ↓</option>
                  <option value="streak-desc">Streak ↓</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <div className="stu-table">
              {/* Header */}
              <div className="col-head" />
              <div className="col-head">Student</div>
              <div className="col-head">Status</div>
              <div className="col-head">30-day trend</div>
              <div className="col-head">Mastery</div>
              <div className="col-head right">XP-30D</div>
              <div className="col-head right">Streak</div>
              <div className="col-head right">HW · Last</div>

              {/* Rows */}
              {loading && [0, 1, 2, 3, 4].map(i => (
                <div key={'s' + i} className="stu-row">
                  <div className="cell-checkbox"><div className="checkbox" /></div>
                  <div className="cell-name"><div className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%' }} /><div style={{ flex: 1 }}><div className="skeleton" style={{ width: 100, height: 11, marginBottom: 4 }} /><div className="skeleton" style={{ width: 70, height: 9 }} /></div></div>
                  <div><div className="skeleton" style={{ width: 60, height: 16, borderRadius: 99 }} /></div>
                  <div><div className="skeleton" style={{ width: 80, height: 12 }} /></div>
                  <div><div className="skeleton" style={{ width: 80, height: 14 }} /></div>
                  <div className="right"><div className="skeleton" style={{ width: 30, height: 12, marginLeft: 'auto' }} /></div>
                  <div className="right"><div className="skeleton" style={{ width: 30, height: 12, marginLeft: 'auto' }} /></div>
                  <div className="right"><div className="skeleton" style={{ width: 40, height: 12, marginLeft: 'auto' }} /></div>
                </div>
              ))}

              {!loading && filtered.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: 'var(--c-muted)' }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>👥</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)' }}>No students match your filters</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>Clear flags or change the section to see more.</div>
                </div>
              )}

              {!loading && filtered.map(s => {
                const masteryTone = s.mastery >= 90 ? 'green' : s.mastery >= 70 ? 'blue' : s.mastery >= 50 ? 'amber' : 'pink'
                const masteryFill = masteryTone === 'green' ? 'var(--c-green)' : masteryTone === 'blue' ? '#4C7CFF' : masteryTone === 'amber' ? 'var(--c-amber)' : 'var(--c-rose)'
                const lastActiveStr = s.lastActivityHours < 60 ? `${s.lastActivityHours}m` : s.lastActivityHours < 60 * 24 ? `${Math.floor(s.lastActivityHours / 60)}h` : `${Math.floor(s.lastActivityHours / 24)}d`
                return (
                  <div key={s.id} className="stu-row" onClick={() => navigate(`/teacher/student/${s.id}`)}>
                    <div className="cell-checkbox"><div className="checkbox" /></div>
                    <div className="cell-name">
                      <div className="av" style={{ background: s.av.color }}>{s.av.init}</div>
                      <div>
                        <div className="name">{s.name || '(no name)'}</div>
                        <div className="roll">Roll {s.rollNum} · ID {s.studentIdShort}</div>
                      </div>
                    </div>
                    <div className="cell-status">
                      <span className={`pill ${s.status}`}>{STATUS_LABEL[s.status]}</span>
                    </div>
                    <div className="cell-trend">
                      <svg viewBox="0 0 90 26" preserveAspectRatio="none">
                        <path d={trendPath(s.trend)} fill="none" stroke={trendColor(s.status)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="cell-mastery">
                      <div className={`pct ${masteryTone}`}>{s.mastery}%</div>
                      <div className="bar"><div className="bar-fill" style={{ width: `${s.mastery}%`, background: masteryFill }} /></div>
                    </div>
                    <div className={`cell-xp ${s.xp30 < 60 ? 'low' : ''}`} style={{ justifyContent: 'flex-end' }}>+{s.xp30}</div>
                    <div className={`cell-streak ${s.streakFinal === 0 ? 'zero' : ''}`} style={{ justifyContent: 'flex-end' }}>
                      🔥 {s.streakFinal}d
                    </div>
                    <div className="cell-hw">
                      <span className={`count ${s.hwDone < 2 ? 'weak' : ''}`}>{s.hwDone}/{s.hwTotal}</span>
                      <span className="when">{lastActiveStr} ago</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline icons
function SearchIco()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }
function UploadIco()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
function DownloadIco() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function PlusIco()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
