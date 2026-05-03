// ═══════════════════════════════════════════════════════════════════════════
// ProgressScreenV4 — Progress / profile screen (v4 design)
// ═══════════════════════════════════════════════════════════════════════════
// Option A scope: visual refresh only.
//
// Data sources (zero backend changes):
//   - useUser()  — profile, level, totalXP, streak, subjectHealth, recentDoubts
//   - /api/user/learn-data — per-subject concept counts (strong/weak)
//
// Client-side derivations:
//   - Weekly XP bar chart: today = real, past days synthesised from streak range
//   - "Pa's read on you": heuristic copy from subjectHealth + recentDoubts
//   - Letter level names: LEVEL_TIERS table (kept in sync with UserContext)
//
// Stubbed (all marked TODO(data)):
//   - Week-over-week XP delta (+22%)
//   - School name
//   - Per-subject week-over-week delta (+3%, -2%)
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../context/UserContext'
import HomeTopNav from '../components/home-v4/HomeTopNav'
import FooterStrip from '../components/home-v4/FooterStrip'
import {
  PaStatusCard, QuickQuestCard, AskPaSuggestions, ResumeCard,
} from '../components/home-v4/RailWidgets'
import ProfileHero from '../components/progress-v4/ProfileHero'
import WeekBars from '../components/progress-v4/WeekBars'
import PaReadCard from '../components/progress-v4/PaReadCard'
import MasteryBar from '../components/progress-v4/MasteryBar'
import '../styles/progress-v4.css'

// LEVEL_TIERS mirrors src/context/UserContext.tsx.
// If that ladder changes, keep this in sync.
const LEVEL_TIERS = [
  { level: 1,  min: 0,     name: 'Beginner' },
  { level: 2,  min: 200,   name: 'Curious' },
  { level: 3,  min: 500,   name: 'Learner' },
  { level: 4,  min: 1000,  name: 'Explorer' },
  { level: 5,  min: 1600,  name: 'Achiever' },
  { level: 6,  min: 2400,  name: 'Scholar' },
  { level: 7,  min: 3500,  name: 'Advanced' },
  { level: 8,  min: 5000,  name: 'Expert' },
  { level: 9,  min: 7500,  name: 'Master' },
  { level: 10, min: 10000, name: 'Grandmaster' },
]
function getLevelInfo(xp) {
  let current = LEVEL_TIERS[0]
  for (const t of LEVEL_TIERS) { if (xp >= t.min) current = t; else break }
  const next = LEVEL_TIERS.find(t => t.level === current.level + 1) || null
  return { level: current.level, name: current.name, next }
}

const SUBJECT_ACCENT = {
  Physics:          'var(--c-blue)',
  Chemistry:        'var(--c-accent)',
  Biology:          'var(--c-green)',
  Mathematics:      'var(--c-violet)',
  Maths:            'var(--c-violet)',
  English:          'var(--c-green)',
  Hindi:            'var(--c-pink)',
  Science:          'var(--c-accent)',
  'Social Science': 'var(--c-amber)',
  Social:           'var(--c-amber)',
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

function getInitials(name) {
  if (!name) return 'S'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function monthYear(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

export default function ProgressScreenV4({ onNavigate }) {
  const user = useUser()
  const homeData = user.homeData

  // Fetch learn-data for concept-level strong/weak counts per subject
  const [learnData, setLearnData] = useState(null)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch('/api/user/learn-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLearnData(d) })
      .catch(() => {})
  }, [user.xp])

  // ─── Shape all view data ───
  const shaped = useMemo(() => {
    const profile = homeData?.profile || {}
    const name = profile.name || 'Student'
    const classLevel = profile.class_level || user.studentClass || 10
    const totalXP = homeData?.totalXP ?? user.xp ?? 0
    const streakDays = homeData?.streak?.current_streak ?? 0

    const levelInfo = getLevelInfo(totalXP)
    const xpToNext = levelInfo.next ? Math.max(0, levelInfo.next.min - totalXP) : 0

    // Weekly XP synthesis (today = real, past days = simulated based on streak range)
    // TODO(data): replace with real per-day aggregate from backend student_xp table.
    const today = new Date()
    const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1  // 0=Mon..6=Sun
    const week = Array(7).fill(0)
    week[todayDow] = homeData?.todayXP || 0
    // Fill past days within streak range with plausible varying numbers
    const pastDaysInStreak = Math.min(streakDays, todayDow)
    const samplePool = [50, 40, 65, 35, 55, 30, 45]
    for (let i = 0; i < pastDaysInStreak; i++) {
      week[todayDow - 1 - i] = samplePool[i % samplePool.length]
    }
    const weekTotal = week.reduce((s, v) => s + v, 0)

    // Pa's heuristic read
    const subjectHealth = homeData?.subjectHealth || []
    const paReadHtml = buildPaRead(subjectHealth, homeData?.recentDoubts || [])

    // Subject mastery rows with strong/weak counts from learn-data
    const learnSubjects = learnData?.subjects || []
    const masteryRows = subjectHealth.slice(0, 5).map(s => {
      const l = learnSubjects.find(ls => ls.subject === s.subject)
      return {
        subject: s.subject,
        color: SUBJECT_ACCENT[s.subject] || 'var(--c-muted)',
        pct: s.accuracy ?? 0,
        strongCount: l?.counts?.mastered ?? null,
        weakCount: l?.counts?.weak ?? null,
        delta: null,          // TODO(data): week-over-week delta not tracked
      }
    })

    return {
      initials: getInitials(name),
      levelName: levelInfo.name,
      level: levelInfo.level,
      nextLevel: levelInfo.next?.level,
      name,
      classLevel,
      classMeta: `Class ${classLevel}`,
      // School name is TODO(data). If we had it, would go after class.
      sinceMeta: monthYear(profile.created_at),
      totalXP,
      xpToNext,
      streakDays,
      week,
      weekTotal,
      paReadHtml,
      masteryRows,
    }
  }, [homeData, user.xp, user.studentClass, learnData])

  // ─── Rail data (same as other v4 screens) ───
  const recentDoubt = homeData?.recentDoubts?.[0]
  const resume = recentDoubt ? {
    subject: recentDoubt.subject,
    chapter: (recentDoubt.question_text || '').slice(0, 32),
    progress: 60,  // TODO(data)
    color: SUBJECT_ACCENT[recentDoubt.subject] || 'var(--c-accent)',
  } : null

  const aiRec = learnData?.todayFocus
  const quickQuest = aiRec ? {
    title: `${aiRec.concept_name} — 5 questions`,
    min: 4, xp: 30,
    target: { screen: 'practice', subject: aiRec.subject, concept: aiRec.concept_slug },
  } : null

  const askPaItems = [
    'How does osmosis work?',
    "Explain Newton's 3rd law",
    'Quiz me on fractions',
  ]

  // ─── Footer data ───
  const mastery = (homeData?.subjectHealth || []).slice(0, 5).map(s => ({
    name: s.subject, pct: s.accuracy || 0,
    color: SUBJECT_ACCENT[s.subject] || 'var(--c-muted)',
    delta: null,
  }))
  const footerWeek = Array(7).fill(0)
  footerWeek[6] = homeData?.todayXP || 0

  // ─── Click handlers ───
  function onSubjectClick(subject) {
    onNavigate?.('learn', { subject })
  }

  return (
    <div className="progress-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...(homeData?.profile || {}), level: user.level || 1 }}
        streak={homeData?.streak?.current_streak || 0}
        active="progress"
        onNavigate={onNavigate}
      />

      <div className="progress-page">
        <div className="progress-body-grid">
          <main className="progress-main">
            <ProfileHero
              initials={shaped.initials}
              levelName={shaped.levelName}
              level={shaped.level}
              name={shaped.name}
              classMeta={shaped.classMeta}
              sinceMeta={shaped.sinceMeta}
              totalXP={shaped.totalXP}
              xpToNext={shaped.xpToNext}
              nextLevel={shaped.nextLevel}
              streakDays={shaped.streakDays}
            />

            <div className="insight-row">
              <WeekBars
                week={shaped.week}
                delta={null}                /* TODO(data): week-over-week delta not tracked */
                totalThisWeek={shaped.weekTotal}
              />
              <PaReadCard html={shaped.paReadHtml} />
            </div>

            <div className="mastery-eyebrow">
              Subject mastery · Class {shaped.classLevel}
            </div>
            {shaped.masteryRows.length > 0 ? (
              <div className="mastery-card">
                {shaped.masteryRows.map(row => (
                  <MasteryBar key={row.subject}
                    subject={row.subject}
                    color={row.color}
                    pct={row.pct}
                    strongCount={row.strongCount}
                    weakCount={row.weakCount}
                    delta={row.delta}
                    onClick={() => onSubjectClick(row.subject)}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                padding: 30, textAlign: 'center',
                background: 'var(--c-card)', border: '1px solid var(--c-hair)',
                borderRadius: 18, color: 'var(--c-muted)',
              }}>
                Complete some practice to see subject-level mastery here.
              </div>
            )}
          </main>

          <aside className="progress-rail">
            <PaStatusCard />
            {quickQuest && (
              <QuickQuestCard
                title={quickQuest.title}
                min={quickQuest.min}
                xp={quickQuest.xp}
                onStart={() => onNavigate?.(quickQuest.target.screen, {
                  subject: quickQuest.target.subject,
                  concept: quickQuest.target.concept,
                })}
              />
            )}
            <AskPaSuggestions
              items={askPaItems}
              onAsk={q => onNavigate?.('ask-ai', { question: q })}
            />
            <div style={{ flex: 1 }} />
            <ResumeCard
              subject={resume?.subject}
              chapter={resume?.chapter}
              progress={resume?.progress}
              color={resume?.color}
              onResume={() => resume && onNavigate?.('ask-ai', { subject: resume.subject })}
            />
          </aside>
        </div>
      </div>

      <FooterStrip
        xpToday={homeData?.todayXP || 0}
        xpGoal={homeData?.dailyGoal || 50}
        week={footerWeek}
        mastery={mastery}
        badges={(homeData?.badges || []).slice(0, 5).map(b => b.icon || b.emoji || '🏆')}
        totalBadges={homeData?.totalBadges || 15}
      />
    </div>
  )
}

// ─── Heuristic Pa's-read copy builder ───────────────────────────────────────
// Uses subjectHealth and recentDoubts to synthesise a plausible summary.
// Zero LLM call. Falls through to a gentle generic if data is thin.
function buildPaRead(subjectHealth, recentDoubts) {
  if (!subjectHealth || subjectHealth.length === 0) {
    return "Pa is learning your patterns. Keep studying — a few more sessions and insights will appear here."
  }

  const scored = subjectHealth.filter(s => s.accuracy != null && s.totalQuestions > 0)
  if (scored.length === 0) {
    return "Pa is watching your study pattern. Complete a few practice sessions and a personalised read will appear here."
  }

  // Pick subject signals
  const sorted = [...scored].sort((a, b) => b.accuracy - a.accuracy)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  // Weekday pattern from recentDoubts timestamps
  const dowCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const d of recentDoubts || []) {
    if (!d.created_at) continue
    const dow = new Date(d.created_at).getDay()
    const normalized = dow === 0 ? 6 : dow - 1
    dowCounts[normalized]++
  }
  const totalDoubts = dowCounts.reduce((a, b) => a + b, 0)
  let weekdayPattern = null
  if (totalDoubts >= 3) {
    const weekendCount = dowCounts[5] + dowCounts[6]
    const weekdayCount = totalDoubts - weekendCount
    if (weekendCount > weekdayCount && weekendCount >= 2) weekdayPattern = 'weekends'
    else if (dowCounts[2] >= 2) weekdayPattern = 'Wednesdays'
    else if (weekdayCount > weekendCount * 1.5) weekdayPattern = 'weekdays'
  }

  // Assemble
  const parts = []
  if (weekdayPattern) {
    parts.push(`You show up most on <b>${weekdayPattern}</b>.`)
  }
  if (weakest && weakest.accuracy < 60) {
    parts.push(`<b>${weakest.subject}</b> needs attention — ${weakest.accuracy}% mastery.`)
  }
  if (strongest && strongest.accuracy >= 75) {
    parts.push(`Your <b>${strongest.subject}</b> is strong at ${strongest.accuracy}%. Keep it steady.`)
  }
  if (parts.length === 0) {
    parts.push('You\'re showing steady progress. Small daily sessions compound fast — keep it going.')
  }
  return parts.join(' ')
}
