// ═══════════════════════════════════════════════════════════════════════════
// TeacherDashboardScreenV4 — "Command Center"
// ═══════════════════════════════════════════════════════════════════════════
// v4 redesign of the teacher landing page. Pulls /api/teacher/dashboard once.
// Layout: hero headline → class pulse (concept bars) → bottom row (needs
// attention + recent activity) | right rail (Pa's read, quick create,
// today's numbers).
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { getTeacherDashboard } from '../services/api'
import TeacherTopNav from '../components/teacher-v4/TeacherTopNav'
import '../styles/home-v4.css'  // for global .user-menu-* styles
import '../styles/teacher-v4.css'

const AVATAR_COLORS = ['#7C5CFF', '#E85D3A', '#36D399', '#4C7CFF', '#FF4D8B', '#FFB547']
function avatarFor(name, idx = 0) {
  const init = (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return { initials: init || '?', color: AVATAR_COLORS[idx % AVATAR_COLORS.length] }
}

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function dayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()
}

function pickFocalChapter(hotspots, classHealth) {
  // Prefer the chapter with the most struggling concepts in hotspots.
  const counts = new Map()
  for (const h of hotspots) {
    const ch = h.concept?.chapter_name
    if (!ch) continue
    counts.set(ch, (counts.get(ch) || 0) + 1)
  }
  let pick = null, max = 0
  for (const [ch, n] of counts.entries()) {
    if (n > max) { pick = ch; max = n }
  }
  return pick
}

export default function TeacherDashboardScreenV4() {
  const user = useUser()
  const { token } = useAuth()
  const navigate = useNavigate()
  const firstName = (user?.studentName || 'Teacher').split(' ')[0]

  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activityWindow, setActivityWindow] = useState('24h')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    getTeacherDashboard(token).then(res => {
      if (cancelled) return
      setLoading(false)
      if (!res.error) setDash(res)
    })
    return () => { cancelled = true }
  }, [token])

  const stats = dash?.stats
  const alerts = dash?.alerts || []
  const hotspots = dash?.hotspots || []
  const classHealth = dash?.classHealth || []
  const recentActivity = dash?.recentActivity || []

  // Hero counts: alerts (red+amber) + flagged pending — what actually needs the teacher's eye
  const needsEyeCount = (stats?.alertsByType?.red || 0) + (stats?.alertsByType?.amber || 0) + (stats?.flaggedPending || 0)

  // Class pulse: pick the chapter with the most struggling concepts
  const focalChapter = useMemo(() => pickFocalChapter(hotspots, classHealth), [hotspots, classHealth])
  const pulseConcepts = useMemo(() => {
    if (!focalChapter) {
      // Fallback: top 6 concepts class-wide (mix of strong + weak)
      return hotspots.slice(0, 6)
    }
    return hotspots.filter(h => h.concept?.chapter_name === focalChapter).slice(0, 8)
  }, [hotspots, focalChapter])

  const focalSubject = pulseConcepts[0]?.concept?.subject || classHealth[0]?.subject || 'Multi-subject'
  const eyebrowLine = `${dayLabel()} · CLASS ${dash?.classLevel || '—'} ${focalSubject.toUpperCase()}`

  // Needs attention: amber alerts (per-student) take priority, then red (class-level)
  const studentAlerts = alerts.filter(a => a.student_id && a.student).slice(0, 4)

  // Activity filter
  const filteredActivity = useMemo(() => {
    if (!recentActivity.length) return []
    const now = Date.now()
    const cutoff = activityWindow === '24h' ? now - 24 * 3600 * 1000 : now - 7 * 86400 * 1000
    return recentActivity.filter(a => a.timestamp && new Date(a.timestamp).getTime() > cutoff).slice(0, 5)
  }, [recentActivity, activityWindow])

  // Today's numbers — derived
  const todayActive = stats?.students || 0
  const hwToday = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000
    return recentActivity.filter(a => (a.type === 'practice' || a.type === 'test') && a.timestamp && new Date(a.timestamp).getTime() > cutoff).length
  }, [recentActivity])
  const flaggedToday = stats?.flaggedPending || 0
  const masteryAvg = useMemo(() => {
    if (!classHealth.length) return null
    const sum = classHealth.reduce((s, c) => s + (c.accuracy || 0), 0)
    return Math.round(sum / classHealth.length)
  }, [classHealth])

  // Pa's Read summary — pull from hotspots if any class-level red alerts exist
  const paReadCard = useMemo(() => {
    const redAlerts = alerts.filter(a => a.alert_type === 'red')
    if (redAlerts.length > 0) {
      const a = redAlerts[0]
      return { headline: a.title, body: a.message, action: a.action_label || 'Open class plan' }
    }
    if (hotspots.length > 0) {
      const top = hotspots[0]
      const concept = top.concept?.concept_name || 'a concept'
      const struggling = top.struggling_students || 0
      return {
        headline: 'Class focus today',
        body: `${struggling} students struggled on ${concept}. Pa drafted a 5-min recap to open class with.`,
        action: 'Open class plan',
      }
    }
    return null
  }, [alerts, hotspots])

  return (
    <div className="teacher-v4">
      <TeacherTopNav badges={{ flagged: stats?.flaggedPending || 0 }} />

      <div className="pd-page">
        {/* Page head */}
        <div className="page-head">
          <div className="head-eyebrow">command center</div>
          <div className="head-eyebrow" style={{ color: 'var(--c-muted-2)' }}>class pulse · attention · activity</div>
        </div>

        {/* Hero block */}
        <section className="cmd-hero">
          <div className="t-eyebrow" style={{ marginTop: 18 }}>{eyebrowLine}</div>
          <h1>
            {greet()}, {firstName}.{' '}
            {loading ? (
              <span className="accent">…</span>
            ) : needsEyeCount === 0 ? (
              <span style={{ color: 'var(--c-green)' }}>All caught up.</span>
            ) : (
              <><span className="accent">{needsEyeCount} {needsEyeCount === 1 ? 'thing' : 'things'}</span> need your eye.</>
            )}
          </h1>
          <p>{loading
            ? 'Loading today\'s class signals…'
            : needsEyeCount === 0
              ? 'No pending alerts or flagged answers. Pa is watching the class. New signals will surface here when they appear.'
              : alerts.slice(0, 1).map(a => a.message).join(' ') || 'Pa drafted next steps for each — review below.'}
          </p>
        </section>

        {/* Two-column grid: left main / right rail */}
        <div className="cmd-grid">
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Class pulse */}
            <ClassPulseCard
              loading={loading}
              chapter={focalChapter}
              subject={focalSubject}
              concepts={pulseConcepts}
              onFullAnalytics={() => navigate('/teacher/students')}
            />

            <div className="cmd-bottom-row">
              {/* Needs attention */}
              <NeedsAttentionCard
                loading={loading}
                alerts={studentAlerts}
                onOpen={(studentId) => studentId && navigate(`/teacher/student/${studentId}`)}
              />

              {/* Recent activity */}
              <RecentActivityCard
                loading={loading}
                items={filteredActivity}
                window={activityWindow}
                onWindow={setActivityWindow}
                onOpen={(it) => it.student_id && navigate(`/teacher/student/${it.student_id}`)}
              />
            </div>
          </div>

          {/* ── RIGHT RAIL ── */}
          <div className="rail-stack">
            {paReadCard && (
              <div className="rail-pa-read">
                <div className="eyebrow">Pa's read on Class {dash?.classLevel || ''}</div>
                <p>{paReadCard.body}</p>
                <button className="open-plan" onClick={() => navigate('/teacher/worksheet')}>
                  {paReadCard.action} →
                </button>
              </div>
            )}

            <div className="rail-quick">
              <div className="eyebrow">Quick create</div>
              <QuickRow icon={<DocIcon />}    title="Worksheet"   sub="15Q · 40 min" onClick={() => navigate('/teacher/worksheet')} />
              <QuickRow icon={<CopyIcon />}   title="Paper mimic" sub="CBSE 2023"    onClick={() => navigate('/teacher/mimic')} />
              <QuickRow icon={<CheckIcon />}  title="Test paper"  sub="Weekly"       onClick={() => navigate('/teacher/test')} />
              <QuickRow icon={<RadioIcon />}  title="Live class"  sub="Poll + AI"    onClick={() => navigate('/teacher/live')} />
            </div>

            <div className="rail-numbers">
              <div className="eyebrow">Today's numbers</div>
              <div className="grid">
                <div>
                  <div className="num">{loading ? '—' : todayActive}</div>
                  <div className="label">Active</div>
                </div>
                <div>
                  <div className="num">{loading ? '—' : hwToday}</div>
                  <div className="label">HW done</div>
                </div>
                <div>
                  <div className="num amber">{loading ? '—' : flaggedToday}</div>
                  <div className="label">Flagged</div>
                </div>
                <div>
                  <div className="num green">{loading ? '—' : masteryAvg != null ? `${masteryAvg}%` : '—'}</div>
                  <div className="label">Mastery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// ── Sub-components ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────

function ClassPulseCard({ loading, chapter, subject, concepts, onFullAnalytics }) {
  return (
    <div className="pd-card pulse-card">
      <div className="pulse-head">
        <div>
          <div className="t-eyebrow" style={{ color: 'var(--c-accent)', marginBottom: 4 }}>Class pulse</div>
          <h3 className="pulse-title">
            {loading ? 'Loading…' : (chapter ? `${subject} · ${chapter}` : `${subject} health`)}
          </h3>
        </div>
        <button className="full-link" onClick={onFullAnalytics}>Full analytics →</button>
      </div>

      {loading && (
        <div>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="pulse-row" style={{ gridTemplateColumns: '180px 1fr 60px' }}>
              <div className="skeleton" style={{ height: 12, width: 130 }} />
              <div className="skeleton" style={{ height: 9 }} />
              <div className="skeleton" style={{ height: 12, width: 40, marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && concepts.length === 0 && (
        <div className="empty-state">
          <div className="icon">📊</div>
          <h3>No concept data yet</h3>
          <p>As students practise, concept-level mastery will surface here. Make sure migration 008 is applied and concepts are published.</p>
        </div>
      )}

      {!loading && concepts.map((c, idx) => {
        const pct = Math.round((c.class_avg_score || 0) * 100)
        const total = c.total_students || 0
        const struggling = c.struggling_students || 0
        const tone = pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'pink'
        const showFocus = pct < 70
        return (
          <div key={idx} className="pulse-row">
            <div className="label">{c.concept?.concept_name || 'Concept'}</div>
            <div className="bar-wrap">
              <div className={`bar-fill ${tone}`} style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
            <div className="pct">{pct}%</div>
            <div className="ratio">{total - struggling}/{total}</div>
            {showFocus
              ? <span className="focus-tag">⚠ Focus</span>
              : <span style={{ width: 0 }} />}
          </div>
        )
      })}
    </div>
  )
}

function NeedsAttentionCard({ loading, alerts, onOpen }) {
  return (
    <div className="pd-card needs-card">
      <div className="needs-head">
        <h2>Needs attention</h2>
        <span className="count-pill">{loading ? '—' : alerts.length}</span>
      </div>

      {loading && [0, 1, 2].map(i => (
        <div key={i} className="needs-row">
          <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: '40%', height: 10 }} />
          </div>
        </div>
      ))}

      {!loading && alerts.length === 0 && (
        <div className="empty-state" style={{ padding: '24px 12px' }}>
          <div className="icon" style={{ fontSize: 24 }}>✅</div>
          <h3>All clear</h3>
          <p>No flagged students this hour.</p>
        </div>
      )}

      {!loading && alerts.map((a, idx) => {
        const name = a.student?.name || 'Student'
        const av = avatarFor(name, idx)
        return (
          <div key={a.id} className="needs-row">
            <div className="avatar" style={{ background: av.color }}>{av.initials}</div>
            <div className="who">
              <div className="name">{name}</div>
              <div className="why">{a.title || a.message?.slice(0, 60) || 'Needs review'}</div>
            </div>
            <button className="open-btn" onClick={() => onOpen(a.student_id)}>Open</button>
          </div>
        )
      })}
    </div>
  )
}

function RecentActivityCard({ loading, items, window, onWindow, onOpen }) {
  return (
    <div className="pd-card activity-card">
      <div className="act-head">
        <h2>Recent activity</h2>
        <div className="seg">
          <button className={window === '24h' ? 'active' : ''} onClick={() => onWindow('24h')}>24h</button>
          <button className={window === 'week' ? 'active' : ''} onClick={() => onWindow('week')}>Week</button>
        </div>
      </div>

      {loading && [0, 1, 2, 3].map(i => (
        <div key={i} className="activity-row">
          <div className="skeleton" style={{ width: 30, height: 12 }} />
          <div className="skeleton" style={{ width: 60, height: 12 }} />
          <div className="skeleton" style={{ height: 12 }} />
          <div className="skeleton" style={{ width: 40, height: 16, borderRadius: 99 }} />
        </div>
      ))}

      {!loading && items.length === 0 && (
        <div className="empty-state" style={{ padding: '24px 12px' }}>
          <div className="icon" style={{ fontSize: 24 }}>👀</div>
          <h3>Nothing yet</h3>
          <p>Student doubts, practice, and tests show up here as they happen.</p>
        </div>
      )}

      {!loading && items.map(it => {
        const initials = (it.student_name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('.').toUpperCase() + '.'
        const verb = it.type === 'doubt' ? 'asked Pa:' : it.type === 'practice' ? 'practised' : 'took test'
        let scoreClass = 'score-chip'
        let scoreLabel = ''
        if (it.score) {
          const pct = parseInt(it.score.match(/(\d+)%/)?.[1] || '0')
          scoreLabel = it.score.replace(/\s*\(.*?\)\s*/, '').trim() || it.score
          scoreClass = pct >= 75 ? 'score-chip' : pct >= 50 ? 'score-chip amber' : 'score-chip pink'
        }
        return (
          <div key={`${it.type}-${it.id}`} className="activity-row" onClick={() => onOpen(it)} style={{ cursor: 'pointer' }}>
            <div className="ago">{timeAgo(it.timestamp)}</div>
            <div className="who">{initials}</div>
            <div className="what">
              <span className="subdued">{verb}</span> {it.type === 'doubt' ? `"${it.summary?.slice(0, 40)}${it.summary?.length > 40 ? '…' : ''}"` : it.summary}
            </div>
            {it.score
              ? <div className={scoreClass}>{scoreLabel}</div>
              : it.type === 'doubt'
                ? <div className="icon-circle muted">💬</div>
                : <div style={{ width: 28 }} />}
          </div>
        )
      })}
    </div>
  )
}

function QuickRow({ icon, title, sub, onClick }) {
  return (
    <button className="quick-row" onClick={onClick}>
      <div className="quick-icon">{icon}</div>
      <div className="quick-text">
        <div className="title">{title}</div>
        <div className="sub">{sub}</div>
      </div>
      <span className="arrow">›</span>
    </button>
  )
}

function DocIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function CopyIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> }
function CheckIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> }
function RadioIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/></svg> }
