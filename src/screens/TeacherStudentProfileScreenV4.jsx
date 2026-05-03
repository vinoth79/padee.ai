// ═══════════════════════════════════════════════════════════════════════════
// TeacherStudentProfileScreenV4 — drill-down on a single student.
// ═══════════════════════════════════════════════════════════════════════════
// One call to /api/teacher/student/:id returns: profile, streak, xp totals,
// subject_mastery, concept_mastery, doubts, practice, tests, activity_30d.
// Layout:
//   - Dark hero card: avatar + name + 4 KPI stats + Pa mascot
//   - Pa's Read banner (synthesised from streak + recent activity signals)
//   - 3-col grid:
//     · Concept mastery (color-coded bars by composite_score)
//     · Recent timeline (merged doubts/practice/tests, color-toned dot)
//     · Right rail: XP last 30d sparkline + parent contact stub
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStudentProfile } from '../services/api'
import TeacherTopNav from '../components/teacher-v4/TeacherTopNav'
import '../styles/home-v4.css'
import '../styles/teacher-v4.css'

function avatarInit(name) {
  return (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return '1d ago'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function shortAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d === 0) return 'today'
  return `${d}d ago`
}

export default function TeacherStudentProfileScreenV4() {
  const { id: studentId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !studentId) return
    let cancelled = false
    setLoading(true)
    getStudentProfile(token, studentId).then(res => {
      if (cancelled) return
      setLoading(false)
      if (res.error) setError(res.error)
      else setData(res)
    })
    return () => { cancelled = true }
  }, [token, studentId])

  const student = data?.student
  const streak = data?.streak
  const xp = data?.xp
  const conceptMastery = data?.concept_mastery || []
  const subjectMastery = data?.subject_mastery || []
  const stats = data?.stats || {}
  const activity30d = data?.activity_30d || []

  const hwThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    return (data?.practice || []).filter(p => p.created_at && new Date(p.created_at).getTime() > cutoff && p.completed).length
  }, [data])

  // Concept mastery rows (top 6 from any subject, ordered by composite_score)
  const focalConcepts = useMemo(() => {
    return [...conceptMastery]
      .sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0))
      .slice(0, 6)
  }, [conceptMastery])

  // Mastery-delta — best-effort: avg of subject_mastery accuracy_percent
  const masteryAvg = useMemo(() => {
    if (subjectMastery.length === 0) return null
    const sum = subjectMastery.reduce((s, sm) => s + (sm.accuracy_percent || 0), 0)
    return Math.round(sum / subjectMastery.length)
  }, [subjectMastery])

  // Days since broken streak
  const streakBrokenDays = useMemo(() => {
    if (!streak?.last_active_date || streak.current_streak !== 0) return null
    const last = new Date(streak.last_active_date)
    const days = Math.floor((Date.now() - last.getTime()) / 86400000)
    return days > 0 ? days : null
  }, [streak])

  // Merged recent timeline (doubts + practice + tests)
  const timeline = useMemo(() => {
    const items = []
    for (const d of (data?.doubts || []).slice(0, 5)) {
      items.push({ id: 'd' + d.id, ts: d.created_at, type: 'doubt', tone: 'violet',
        what: `Asked Pa ${d.subject ? `about ${d.subject.toLowerCase()}` : ''}`,
        why: (d.question_text || '').slice(0, 80) })
    }
    for (const p of (data?.practice || []).slice(0, 4)) {
      const pct = p.total_questions ? Math.round((p.correct_count / p.total_questions) * 100) : null
      const tone = pct == null ? 'amber' : pct >= 70 ? 'green' : 'pink'
      items.push({ id: 'p' + p.id, ts: p.created_at, type: 'practice', tone,
        what: `Practised ${p.subject || 'practice'}${p.chapter ? ' · ' + p.chapter : ''}`,
        why: pct != null ? `Scored ${p.correct_count}/${p.total_questions} (${pct}%)` : 'In progress' })
    }
    for (const t of (data?.tests || []).slice(0, 4)) {
      const pct = t.score != null && t.total_marks ? Math.round((t.score / t.total_marks) * 100) : null
      const tone = pct == null ? 'amber' : pct >= 70 ? 'green' : 'pink'
      items.push({ id: 't' + t.id, ts: t.completed_at || t.created_at, type: 'test', tone,
        what: t.title || 'Test',
        why: pct != null ? `Scored ${pct}% — ${pct >= 75 ? 'strong' : pct >= 50 ? 'mid' : 'weak'}` : 'In progress' })
    }
    return items
      .filter(it => it.ts)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 6)
  }, [data])

  // Pa's Read — synthesised. Fires only when there's a clear pattern.
  const paRead = useMemo(() => {
    if (!data) return null
    const recentDoubts = data.doubts || []
    const recentTests = (data.tests || []).filter(t => t.completed && t.score != null && t.total_marks)
    const lowestTest = recentTests.find(t => (t.score / t.total_marks) < 0.5)
    const skipPattern = streak?.current_streak === 0 && streakBrokenDays != null && streakBrokenDays >= 2

    if (lowestTest && skipPattern) {
      const tName = lowestTest.subject || lowestTest.title
      return {
        body: <>Confidence dropped after the {tName} test on <i>{new Date(lowestTest.completed_at || lowestTest.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</i>. Skipped activity since. {recentDoubts.slice(0, 2).some(d => /catch up|behind|hard|don\'t understand/i.test(d.question_text || '')) ? <>Recent Pa chats hint at <i>"how do I catch up"</i>. </> : ''}This pattern usually precedes disengagement — reversible with a 1-on-1.</>,
      }
    }
    if (skipPattern) {
      return { body: <>Streak broken {streakBrokenDays}d ago and no activity since. Pa flagged this as an early-disengagement signal — a short 1-on-1 usually flips it.</> }
    }
    if (lowestTest) {
      return { body: <>Last assessment was a low-scorer on {lowestTest.subject || 'a recent test'}. Worth checking the underlying concept gap before the next quiz.</> }
    }
    return null
  }, [data, streak, streakBrokenDays])

  // XP sparkline path (uses activity_30d as proxy: count per day → XP estimate)
  const sparkline = useMemo(() => {
    if (!activity30d.length) return null
    const days = activity30d.slice(-21)
    const max = Math.max(...days.map(d => d.count), 1)
    const w = 240, h = 60, pad = 4
    const step = (w - pad * 2) / Math.max(1, days.length - 1)
    const points = days.map((d, i) => {
      const x = pad + i * step
      const y = h - pad - ((d.count / max) * (h - pad * 2))
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return { d: 'M' + points.join(' L'), w, h, last: days[days.length - 1]?.count || 0, first: days[0]?.count || 0 }
  }, [activity30d])

  if (loading) {
    return (
      <div className="teacher-v4">
        <TeacherTopNav />
        <div className="pd-page">
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--c-muted)' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid var(--c-accent)', borderTopColor: 'transparent',
              margin: '0 auto 12px', animation: 'skel 1s linear infinite',
            }} />
            <div style={{ fontSize: 13 }}>Loading student profile…</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="teacher-v4">
        <TeacherTopNav />
        <div className="pd-page">
          <div style={{ padding: 60, textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Student not found</h2>
            <p style={{ color: 'var(--c-muted)', marginBottom: 16 }}>{error || 'This student doesn\'t exist or you don\'t have access.'}</p>
            <button className="pd-btn primary" onClick={() => navigate('/teacher/students')}>← Back to students</button>
          </div>
        </div>
      </div>
    )
  }

  const masteryDeltaLabel = (() => {
    if (masteryAvg == null) return ''
    // Simple direction proxy from concept_mastery composite trend isn't available;
    // we show a neutral arrow when we can't compute a real delta.
    return ''
  })()

  return (
    <div className="teacher-v4">
      <TeacherTopNav />
      <div className="pd-page">
        {/* Page head */}
        <div className="page-head">
          <div>
            <div className="head-eyebrow">05 — desktop</div>
            <h2 className="t-h1" style={{ marginTop: 4 }}>Student profile <span style={{ color: 'var(--c-muted)', fontWeight: 600 }}>· {student.name}</span></h2>
          </div>
          <div className="head-eyebrow" style={{ color: 'var(--c-muted-2)' }}>timeline · concepts · nudges</div>
        </div>

        {/* Hero */}
        <section className="sp-hero" style={{ marginTop: 14 }}>
          <div className="sp-av">{avatarInit(student.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sp-meta-eyebrow">
              {xp?.level_name || 'Beginner'} · Class {student.class_level}{student.section ? `-${student.section}` : ''}{student.school ? ` · ${student.school}` : ''}
            </div>
            <h1>{student.name}</h1>
            <div className="sp-stats">
              <div className="sp-stat">
                <div className="num">{xp?.total_xp ?? 0}</div>
                <div className="label">Total XP</div>
              </div>
              <div className="sp-stat">
                <div className={`num ${streak?.current_streak === 0 ? 'muted' : ''}`}>{streak?.current_streak ?? 0} <span style={{ fontSize: 14 }}>{streak?.current_streak ? '🔥' : ''}</span></div>
                <div className="label">{streakBrokenDays ? `Day streak (broken ${streakBrokenDays}d ago)` : 'Day streak'}</div>
              </div>
              <div className="sp-stat">
                <div className={`num ${masteryAvg != null && masteryAvg < 60 ? 'pink' : ''}`}>{masteryAvg != null ? `${masteryAvg}%` : '—'}</div>
                <div className="label">Mastery {masteryDeltaLabel}</div>
              </div>
              <div className="sp-stat">
                <div className={`num ${hwThisWeek === 0 ? 'amber' : ''}`}>{hwThisWeek}/4</div>
                <div className="label">HWs done this week</div>
              </div>
            </div>
          </div>
          <div className="pa-corner">{streak?.current_streak === 0 || (masteryAvg != null && masteryAvg < 60) ? '🥲' : '😀'}</div>
        </section>

        {/* Pa's Read banner */}
        {paRead && (
          <div className="sp-pa-read">
            <span className="icon">💡</span>
            <div className="body">
              <div className="eyebrow">Pa's read on {student.name?.split(' ')[0]}</div>
              <p>{paRead.body}</p>
            </div>
            <div className="actions">
              <button className="nudge-btn">Send nudge</button>
              <button className="schedule-btn">Schedule 1:1</button>
            </div>
          </div>
        )}

        {/* 3-column grid */}
        <div className="sp-grid">
          {/* Concept mastery */}
          <div className="sp-card">
            <h3>Concept mastery {focalConcepts[0]?.concept?.subject ? `· ${focalConcepts[0].concept.subject}${focalConcepts[0].concept?.chapter_name ? ' ' + focalConcepts[0].concept.chapter_name.split(/\s+/).slice(0, 2).join(' ') : ''}` : ''}</h3>
            {focalConcepts.length === 0 && (
              <div className="empty-state" style={{ padding: 16 }}>
                <div className="icon" style={{ fontSize: 22 }}>📊</div>
                <h3>No concept activity yet</h3>
                <p>Will populate as the student practises.</p>
              </div>
            )}
            {focalConcepts.map((c, i) => {
              const pct = Math.round((c.composite_score || 0) * 100)
              const tone = pct >= 80 ? 'green' : pct >= 60 ? 'amber' : pct >= 40 ? 'pink' : 'rose'
              const dotColor = pct >= 80 ? 'var(--c-green)' : pct >= 60 ? 'var(--c-amber)' : pct >= 40 ? 'var(--c-pink)' : 'var(--c-rose)'
              const fillColor = pct >= 80 ? 'var(--c-green)' : pct >= 60 ? 'var(--c-amber)' : pct >= 40 ? 'var(--c-pink)' : 'var(--c-rose)'
              return (
                <div key={c.concept_slug || i} className="sp-concept">
                  <div className="dot" style={{ background: dotColor }} />
                  <div className="label">{c.concept?.concept_name || c.concept_slug}</div>
                  <div className="bar-wrap">
                    <div className="bar-fill" style={{ width: `${Math.max(pct, 2)}%`, background: fillColor }} />
                  </div>
                  <div className="pct">{pct}%</div>
                </div>
              )
            })}
          </div>

          {/* Recent timeline */}
          <div className="sp-card">
            <h3>Recent timeline</h3>
            {timeline.length === 0 && (
              <div className="empty-state" style={{ padding: 16 }}>
                <div className="icon" style={{ fontSize: 22 }}>👀</div>
                <h3>No recent activity</h3>
                <p>Activity surfaces here as the student engages.</p>
              </div>
            )}
            <div className="sp-tl">
              {timeline.map(it => (
                <div key={it.id} className={`sp-tl-row tone-${it.tone}`}>
                  <div className="ago">{shortAgo(it.ts)} ago</div>
                  <div className="what">{it.what}</div>
                  <div className="why">{it.why}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right rail */}
          <div className="sp-rail">
            <div className="sp-card sp-xp">
              <div className="xp-head">
                <h3>XP · last 30 days</h3>
                <div className="xp-now">{xp?.total_xp ?? 0}</div>
              </div>
              {sparkline ? (
                <svg viewBox={`0 0 ${sparkline.w} ${sparkline.h}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#E85D3A" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#E85D3A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${sparkline.d} L ${sparkline.w - 4},${sparkline.h - 4} L 4,${sparkline.h - 4} Z`} fill="url(#xpGrad)" />
                  <path d={sparkline.d} fill="none" stroke="#E85D3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)', fontSize: 12 }}>No activity yet</div>
              )}
              {sparkline && (
                <div className={`xp-trend ${sparkline.last < sparkline.first ? 'down' : 'up'}`}>
                  {sparkline.last < sparkline.first
                    ? '↓ Trending down'
                    : sparkline.last > sparkline.first
                      ? '↑ Trending up'
                      : '→ Steady'}
                  {streakBrokenDays ? ` since streak broke` : ''}
                </div>
              )}
            </div>

            <div className="sp-card sp-parent">
              <h3>Parent contact</h3>
              <div className="parent-line">
                <div className="parent-av">{avatarInit('Parent ' + (student.name || ''))}</div>
                <div>
                  <div className="parent-name">Parent of {student.name?.split(' ')[0]}</div>
                  <div className="parent-seen">Not yet linked · invite via app</div>
                </div>
              </div>
              <button className="msg-btn" onClick={() => alert('Parent linking lands in the parent v4 build.')}>
                Message via Padee
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
