// ═══════════════════════════════════════════════════════════════════════════
// TestListScreenV4 — Tests list (v4 design)
// ═══════════════════════════════════════════════════════════════════════════
// Option A scope: visual refresh only. Same /api/test/list endpoint as v3.
// Zero backend changes.
//
// Layout:
//   [v4 dark top nav]
//   [body grid: main | 280px rail]
//     Main: tab row (Upcoming/Past/JEE-NEET) → urgent prep banner (if <=3d)
//           → Upcoming rows OR Past cards grid OR JEE/NEET empty-state
//     Rail: Pa status → Quick quest → Try asking Pa → Pick up where you left off
//   [v4 footer strip — desktop only]
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../context/UserContext'
import HomeTopNav from '../components/home-v4/HomeTopNav'
import FooterStrip from '../components/home-v4/FooterStrip'
import {
  PaStatusCard, QuickQuestCard, AskPaSuggestions, ResumeCard,
} from '../components/home-v4/RailWidgets'
import TabRow from '../components/tests-v4/TabRow'
import UrgentPrepBanner from '../components/tests-v4/UrgentPrepBanner'
import UpcomingTestRow from '../components/tests-v4/UpcomingTestRow'
import PastTestCard from '../components/tests-v4/PastTestCard'
import PaRecommendsCard from '../components/tests-v4/PaRecommendsCard'
import SelfPickTestCard from '../components/tests-v4/SelfPickTestCard'
import '../styles/tests-v4.css'

const SUBJECT_ACCENT = {
  Physics: 'var(--c-blue)',
  Chemistry: 'var(--c-accent)',
  Biology: 'var(--c-green)',
  Mathematics: 'var(--c-violet)',
  Maths: 'var(--c-violet)',
  English: 'var(--c-green)',
  Hindi: 'var(--c-pink)',
  Science: 'var(--c-accent)',
  'Social Science': 'var(--c-amber)',
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

// Compute prep% per upcoming test — subject_mastery.accuracy_percent as proxy.
// TODO(data): replace with a real /api/test/prep-readiness/:id endpoint that
// intersects concept_mastery with the test's implied concepts.
function computePrepPct(test, subjectHealth) {
  const m = (subjectHealth || []).find(s => s.subject === test.subject)
  if (m?.accuracy != null) return m.accuracy
  return 30  // fallback per Q2
}

export default function TestListScreenV4({ onNavigate }) {
  const user = useUser()
  const homeData = user.homeData

  // ─── Data fetch (same endpoint as v3 TestListScreen) ───
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    setLoading(true)
    fetch('/api/test/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || 'Failed')
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [user.xp])

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState('upcoming')
  const showJeeNeet = user.activeTrack === 'jee' || user.activeTrack === 'neet'

  // ─── Shape upcoming + past lists ───
  const { upcoming, past } = useMemo(() => {
    if (!data) return { upcoming: [], past: [] }
    const subjectHealth = homeData?.subjectHealth || []
    const up = (data.assignments || [])
      .filter(a => !a.completed)
      .map(a => ({
        ...a,
        class_level: data.classLevel,
        prepPct: computePrepPct(a, subjectHealth),
      }))
      .sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0))
    const pa = (data.completedTests || []).slice(0, 6)
    return { upcoming: up, past: pa }
  }, [data, homeData])

  // Most-urgent upcoming test → powers the prep banner
  const mostUrgent = useMemo(() => {
    if (!upcoming.length) return null
    const first = upcoming[0]
    if (!first.deadline) return null
    const days = Math.ceil((new Date(first.deadline).getTime() - Date.now()) / 86400000)
    if (days > 3) return null
    const sprintMinutes = Math.round((first.question_count * (first.seconds_per_question || 60)) / 60) || 30
    return { ...first, sprintMinutes }
  }, [upcoming])

  // ─── Rail + footer data (shared with other v4 screens) ───
  const recentDoubt = homeData?.recentDoubts?.[0]
  const resume = recentDoubt ? {
    subject: recentDoubt.subject,
    chapter: (recentDoubt.question_text || '').slice(0, 32),
    progress: 60,      // TODO(data)
    color: SUBJECT_ACCENT[recentDoubt.subject] || 'var(--c-accent)',
  } : null

  const quickQuest = data?.aiRecommendation ? {
    title: `${data.aiRecommendation.subject} — ${data.aiRecommendation.questionCount} questions`,
    min: 5, xp: 30,
    target: { screen: 'practice', subject: data.aiRecommendation.subject },
  } : null

  const askPaItems = [
    'How does osmosis work?',
    "Explain Newton's 3rd law",
    'Quiz me on fractions',
  ]

  const mastery = (homeData?.subjectHealth || []).slice(0, 5).map(s => ({
    name: s.subject,
    pct: s.accuracy || 0,
    color: SUBJECT_ACCENT[s.subject] || 'var(--c-muted)',
    delta: null,
  }))
  const week = Array(7).fill(0)
  week[6] = homeData?.todayXP || 0

  // ─── Click handlers ───
  // Take test: stash params in sessionStorage (TestActiveScreen reads them
  // on mount) and route to /tests/active. Same protocol as v3.
  function onStartTest(test) {
    sessionStorage.setItem('padee-test-start', JSON.stringify({
      mode: 'teacher',
      assignmentId: test.id,
    }))
    onNavigate?.('test')
  }
  // Prep: warm up via the practice screen (same subject, similar count).
  function onPrepTest(test) {
    onNavigate?.('practice', { subject: test.subject, count: test.question_count })
  }
  function onOpenUpcoming(test) {
    // Tapping the row defaults to Prep. The student picks Take test explicitly.
    onPrepTest(test)
  }
  function onClickPast(session) {
    onNavigate?.('test-results', { sessionId: session.id })
  }
  function onStartPrepSprint() {
    if (mostUrgent) onPrepTest(mostUrgent)
  }
  // AI-recommended test (Type 2) — Pa picks the weakest subject, auto-tunes
  // difficulty + question count. Goes through /api/test/start as a real
  // timed test (mode='ai_recommended').
  function onStartAiRec(rec) {
    const r = rec || data?.aiRecommendation
    if (!r) return
    sessionStorage.setItem('padee-test-start', JSON.stringify({
      mode: 'ai_recommended',
      subject: r.subject,
      classLevel: data?.classLevel,
      questionCount: r.questionCount || 10,
      difficulty: r.difficulty || 'medium',
    }))
    onNavigate?.('test')
  }

  // Self-pick test (Type 3) — student chooses subject + length + difficulty.
  function onStartSelfPick({ subject, questionCount, difficulty }) {
    sessionStorage.setItem('padee-test-start', JSON.stringify({
      mode: 'self',
      subject,
      classLevel: data?.classLevel,
      questionCount,
      difficulty,
    }))
    onNavigate?.('test')
  }

  // ─── Render ───
  return (
    <div className="tests-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...(homeData?.profile || {}), level: user.level || 1 }}
        streak={homeData?.streak?.current_streak || 0}
        active="tests"
        onNavigate={onNavigate}
      />

      <div className="tests-page">
        <div className="tests-body-grid">
          <main className="tests-main">
            <TabRow active={activeTab} onChange={setActiveTab} showJeeNeet={showJeeNeet} />

            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-muted)' }}>
                Loading tests…
              </div>
            )}
            {err && (
              <div style={{ padding: 16, background: '#FEE', color: '#C00', borderRadius: 12 }}>
                ⚠ {err}
              </div>
            )}

            {!loading && !err && activeTab === 'upcoming' && (
              <>
                {mostUrgent && (
                  <UrgentPrepBanner test={mostUrgent} onStart={onStartPrepSprint} />
                )}

                {upcoming.length > 0 ? (
                  <>
                    <div className="section-eyebrow">TEACHER-ASSIGNED · {upcoming.length}</div>
                    {upcoming.map(t => (
                      <UpcomingTestRow key={t.id} test={t}
                        onPrep={onPrepTest}
                        onStart={onStartTest}
                        onOpen={() => onOpenUpcoming(t)} />
                    ))}
                  </>
                ) : (
                  <div className="empty-state">
                    <p style={{ fontSize: 14, color: 'var(--c-ink)', marginBottom: 6 }}>
                      No teacher-assigned tests right now.
                    </p>
                    <p style={{ fontSize: 13 }}>
                      Pa has an AI-picked test ready, or you can build your own below.
                    </p>
                  </div>
                )}

                {/* Type 2 — Pa-recommended AI test */}
                {data?.aiRecommendation && (
                  <>
                    <div className="section-eyebrow" style={{ marginTop: 26 }}>PA RECOMMENDS</div>
                    <PaRecommendsCard rec={data.aiRecommendation} onStart={onStartAiRec} />
                  </>
                )}

                {/* Type 3 — student-picked test */}
                <div className="section-eyebrow" style={{ marginTop: 22 }}>BUILD YOUR OWN</div>
                <SelfPickTestCard
                  subjects={data?.selectedSubjects || []}
                  onStart={onStartSelfPick}
                />

                {past.length > 0 && (
                  <>
                    <div className="section-eyebrow" style={{ marginTop: 26 }}>
                      PAST · LAST {Math.min(3, past.length)}
                    </div>
                    <div className="past-grid">
                      {past.slice(0, 3).map(p => (
                        <PastTestCard key={p.id} test={p} onClick={() => onClickPast(p)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {!loading && !err && activeTab === 'past' && (
              <>
                <div className="section-eyebrow">ALL PAST · {past.length}</div>
                {past.length === 0 ? (
                  <div className="empty-state">
                    <p style={{ fontSize: 14, color: 'var(--c-ink)', marginBottom: 6 }}>
                      No past tests yet.
                    </p>
                    <p style={{ fontSize: 13 }}>
                      Complete a test and it'll show up here with your score and AI insights.
                    </p>
                  </div>
                ) : (
                  <div className="past-grid">
                    {past.map(p => (
                      <PastTestCard key={p.id} test={p} onClick={() => onClickPast(p)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {!loading && !err && activeTab === 'jeeneet' && (
              <div className="empty-state">
                <p style={{ fontSize: 14, color: 'var(--c-ink)', marginBottom: 6 }}>
                  JEE / NEET tests
                </p>
                <p style={{ fontSize: 13 }}>
                  JEE/NEET-specific mock tests are coming soon. For now, your foundation practice is building the base you'll need.
                </p>
              </div>
            )}
          </main>

          <aside className="tests-rail">
            <PaStatusCard />
            {quickQuest && (
              <QuickQuestCard
                title={quickQuest.title}
                min={quickQuest.min}
                xp={quickQuest.xp}
                onStart={() => onNavigate?.(quickQuest.target.screen, { subject: quickQuest.target.subject })}
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
        week={week}
        mastery={mastery}
        badges={(homeData?.badges || []).slice(0, 5).map(b => b.icon || b.emoji || '🏆')}
        totalBadges={homeData?.totalBadges || 15}
      />
    </div>
  )
}
