// ═══════════════════════════════════════════════════════════════════════════
// LiveClassScreenV4 — fullscreen dark live-class console.
// ═══════════════════════════════════════════════════════════════════════════
// Phase 1 build is a high-fidelity demo (no live-class backend yet). It shows
// the visual treatment for: active poll with vote bars + correct/swap call-
// outs, class engagement spark, Pa Co-pilot intervention card, raised-hands
// queue, and a sticky lesson plan that crosses items off as time advances.
//
// When the live-class backend lands, swap the mock state for real-time data
// (websocket from /api/live/:sessionId). The component shape stays the same.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeacherTopNav from '../components/teacher-v4/TeacherTopNav'
import '../styles/home-v4.css'
import '../styles/teacher-v4.css'

const POLL = {
  number: 3,
  total: 5,
  question: 'A 2 kg block accelerates at 4 m/s². What is the net force?',
  source: 'NCERT Ch 9 · 9.4',
  options: [
    { letter: 'A', label: '2 N',   votes: 4,  pct: 11 },
    { letter: 'B', label: '6 N',   votes: 7,  pct: 20, warn: 'swapped m and a' },
    { letter: 'C', label: '8 N',   votes: 21, pct: 62, correct: true },
    { letter: 'D', label: '0.5 N', votes: 2,  pct: 7 },
  ],
  totalStudents: 34,
}

const HANDS = [
  { id: 'h1', initials: 'AK', color: '#7C5CFF', name: 'Aarav Kumar',     ago: '1m',  q: 'Why don\'t we feel Earth\'s pull on us?' },
  { id: 'h2', initials: 'DP', color: '#36D399', name: 'Diya Patel',      ago: '30s', q: 'What\'s the unit again?' },
  { id: 'h3', initials: 'IS', color: '#4C7CFF', name: 'Ishaan Sharma',   ago: '10s', q: 'Can F be negative?' },
]

const LESSON_PLAN = [
  { id: 'lp1', label: 'Recap Newton 1',         time: '4m', state: 'done' },
  { id: 'lp2', label: 'Worked F=ma',            time: '7m', state: 'done' },
  { id: 'lp3', label: 'Poll Q1: inertia',       time: '3m', state: 'done' },
  { id: 'lp4', label: 'Poll Q3: net force',     time: '3m', state: 'active' },
  { id: 'lp5', label: 'Pa explains B trap',     time: '4m', state: 'pending', paTagged: true },
  { id: 'lp6', label: 'Numerical · momentum',   time: '8m', state: 'pending' },
  { id: 'lp7', label: 'Wrap + HW preview',      time: '3m', state: 'pending' },
]

export default function LiveClassScreenV4() {
  const navigate = useNavigate()
  const [secondsLeft, setSecondsLeft] = useState(42)
  const [paDismissed, setPaDismissed] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [elapsedMin, setElapsedMin] = useState(23)

  // Tick the poll countdown
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  const correctOpt = POLL.options.find(o => o.correct)
  const swapOpt = POLL.options.find(o => o.warn)
  const correctPct = correctOpt?.pct || 0
  const swapPct = swapOpt?.pct || 0

  // Engagement chart path
  const engagement = useMemo(() => {
    const samples = [55, 60, 72, 78, 70, 75, 82, 88, 85, 80, 78, 85, 90, 87, 84, 86, 89, 92, 88, 86, 90]
    const w = 600, h = 60, pad = 4
    const step = (w - pad * 2) / Math.max(1, samples.length - 1)
    const max = 100
    const points = samples.map((v, i) => `${(pad + i * step).toFixed(1)},${(h - pad - (v / max) * (h - pad * 2)).toFixed(1)}`)
    return { d: 'M' + points.join(' L'), w, h, samples }
  }, [])

  const totalLp = LESSON_PLAN.length
  const doneLp = LESSON_PLAN.filter(l => l.state === 'done').length
  const remainingMin = LESSON_PLAN.filter(l => l.state !== 'done').reduce((s, l) => s + parseInt(l.time), 0)

  function handleEndClass() {
    if (window.confirm('End the live class? Students will be disconnected.')) {
      navigate('/teacher')
    }
  }

  return (
    <div className="teacher-v4 live">
      <header className="pd-topnav teacher" style={{ position: 'relative' }}>
        <button
          className="brand"
          onClick={() => navigate('/teacher')}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 22 }}>🐤</span>
          <span className="logo-text">Padee<span className="logo-ai">.ai</span></span>
          <span className="live-pill">TEACHER · LIVE</span>
        </button>

        <span className="live-status">
          <span className="live-dot" />
          <span>LIVE · {elapsedMin} MIN IN</span>
        </span>

        <span className="ch-title">
          Ch 9 · Force &amp; Laws · Class 9-B
          <span className="joined">{POLL.totalStudents} of {POLL.totalStudents} joined</span>
        </span>

        <div className="topnav-actions">
          <button className="ghost-btn">
            <MicOffIcon /> Mute all
          </button>
          <button className="end-btn" onClick={handleEndClass}>End class</button>
        </div>
      </header>

      <div className="pd-page">
        <div className="live-grid">
          {/* ─── LEFT: Active poll + engagement ─── */}
          <div>
            <div className="dark-card">
              <div className="head">
                <div>
                  <div className="poll-eyebrow">★ Now · Poll Q{POLL.number} of {POLL.total} · 0:{secondsLeft.toString().padStart(2, '0')} left</div>
                  <h3 className="poll-q">{POLL.question}</h3>
                </div>
                <div className="poll-actions">
                  <button className="light-btn">End poll</button>
                  <button className="reveal-btn" onClick={() => setRevealed(v => !v)}>
                    {revealed ? 'Hide answer' : 'Reveal answer'}
                  </button>
                </div>
              </div>

              {POLL.options.map(o => (
                <div key={o.letter}
                  className={`poll-opt ${o.correct ? 'correct' : ''} ${o.warn ? 'warn' : ''}`}>
                  <div className="fill" style={{ width: `${o.pct}%` }} />
                  <div className="letter">{o.letter}</div>
                  <div className="opt-label">{o.label}</div>
                  {o.correct && (revealed || true) && (
                    <span className="correct-tag">★ CORRECT</span>
                  )}
                  <div>
                    <span className="pct">{o.pct}%</span>
                    <span className="ratio">{o.votes}/{POLL.totalStudents}</span>
                  </div>
                </div>
              ))}

              <div className="poll-meta">
                <div>
                  <b>{POLL.totalStudents}/{POLL.totalStudents} voted</b>
                  &nbsp;&nbsp;<span style={{ color: 'var(--c-green)' }}><b>{correctPct}%</b> correct</span>
                  &nbsp;&nbsp;<span className="swap"><b>{swapPct}%</b> swapped m and a</span>
                </div>
                <div>Source: {POLL.source}</div>
              </div>
            </div>

            <div className="dark-card engagement-card">
              <div className="head" style={{ marginBottom: 4 }}>
                <div>
                  <div className="e-eyebrow">Class engagement · live</div>
                </div>
                <div className="e-time">last 23 min</div>
              </div>
              <svg viewBox={`0 0 ${engagement.w} ${engagement.h}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E85D3A" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#E85D3A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${engagement.d} L ${engagement.w - 4},${engagement.h - 4} L 4,${engagement.h - 4} Z`} fill="url(#engagementGrad)" />
                <path d={engagement.d} fill="none" stroke="#E85D3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                {/* Q markers */}
                {[5, 11, 18].map((idx, i) => {
                  const step = (engagement.w - 8) / Math.max(1, engagement.samples.length - 1)
                  const x = 4 + idx * step
                  return (
                    <g key={i}>
                      <line x1={x} y1="4" x2={x} y2={engagement.h - 4} stroke="rgba(255,255,255,0.18)" strokeDasharray="2,3" />
                      <text x={x + 3} y="14" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="Lexend Deca">Q{i + 1}{i === 2 ? ' · now' : ''}</text>
                    </g>
                  )
                })}
              </svg>
              <div className="e-stats">
                <span>Avg attention: <b>87%</b></span>
                <span>Voted: <b>34/34</b></span>
                <span>✋ Hands raised: <span className="amber">3</span></span>
                <span>💬 Backchannel: <b>12 msgs</b></span>
                <span>📷 Cams off: <span className="pink">2</span></span>
              </div>
            </div>
          </div>

          {/* ─── RIGHT RAIL ─── */}
          <div className="live-rail">
            {!paDismissed && (
              <div className="pa-copilot">
                <div className="eyebrow">★ Pa Co-pilot</div>
                <div className="pa-line"><b>{swapPct}% picked B (6 N).</b> They're swapping mass and acceleration.</div>
                <div className="pa-secondary">Want me to throw up a quick worked example before Q4?</div>
                <div className="pa-actions">
                  <button className="yes" onClick={() => setPaDismissed(true)}>Yes, do it</button>
                  <button className="skip" onClick={() => setPaDismissed(true)}>Skip</button>
                </div>
                <div className="pa-mascot-r">🐤</div>
              </div>
            )}

            <div className="dark-card hands-card">
              <div className="hands-head">
                <span className="h-eyebrow">✋ Raised hands</span>
                <span className="h-count">{HANDS.length}</span>
              </div>
              {HANDS.map(h => (
                <div key={h.id} className="hand-row">
                  <div className="av" style={{ background: h.color }}>{h.initials}</div>
                  <div>
                    <div className="name">{h.name}</div>
                    <div className="q">"{h.q}"</div>
                  </div>
                  <div className="ago">{h.ago}</div>
                </div>
              ))}
              <div className="hand-actions">
                <button>Unmute next</button>
                <button className="primary">Pa answers all</button>
              </div>
            </div>

            <div className="dark-card lesson-card">
              <div className="lp-head">
                <span className="lp-eyebrow">Lesson plan</span>
                <span className="lp-meta">{doneLp}/{totalLp} done · {remainingMin} min left</span>
              </div>
              {LESSON_PLAN.map(l => (
                <div key={l.id} className={`lp-row ${l.state}`}>
                  <span className="lp-dot" />
                  <span className="lp-text">
                    {l.paTagged && <span className="pa-tag">PA</span>}
                    {l.label}
                  </span>
                  <span className="lp-time">{l.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MicOffIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
  </svg>
}
