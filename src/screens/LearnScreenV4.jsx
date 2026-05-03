// ═══════════════════════════════════════════════════════════════════════════
// LearnScreenV4 — Learn / chapter list screen (v4 design)
// ═══════════════════════════════════════════════════════════════════════════
// Option A scope: visual refresh only. Same endpoint (/api/user/learn-data),
// same data shape, zero backend changes.
//
// Layout mirrors the reference target:
//   [v4 dark top nav]
//   [body grid: main | 280px rail]
//     Main: subject pills → subject hero card → Pa cue banner → chapters list
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
import SubjectPills from '../components/learn-v4/SubjectPills'
import SubjectHeroCard from '../components/learn-v4/SubjectHeroCard'
import PaCueCard from '../components/learn-v4/PaCueCard'
import ChapterRow, { computeChapterState } from '../components/learn-v4/ChapterRow'
import ChapterConceptList from '../components/learn-v4/ChapterConceptList'
import '../styles/learn-v4.css'

const SUBJECT_ACCENT = {
  'Science':          'var(--c-accent)',
  'Physics':          'var(--c-blue)',
  'Chemistry':        'var(--c-accent)',
  'Biology':          'var(--c-green)',
  'Mathematics':      'var(--c-violet)',
  'Maths':            'var(--c-violet)',
  'English':          'var(--c-green)',
  'Hindi':            'var(--c-pink)',
  'Social Science':   'var(--c-amber)',
  'Social':           'var(--c-amber)',
  'Computer Science': '#2BD3F5',
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

export default function LearnScreenV4({ onNavigate, initialSubject }) {
  const user = useUser()
  const homeData = user.homeData

  // ─── Data fetch (same endpoint as v3 Learn) ───
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    fetch('/api/user/learn-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || 'Failed')
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [user.xp])  // refetch when XP changes (post-practice/test)

  // ─── Subject tab state (resets on each mount per plan Q3) ───
  const allSubjects = useMemo(() => data?.subjects || [], [data])
  const [activeSubject, setActiveSubject] = useState(null)

  useEffect(() => {
    if (!activeSubject && allSubjects.length > 0) {
      const first = initialSubject && allSubjects.find(s => s.subject === initialSubject)
        ? initialSubject
        : allSubjects[0].subject
      setActiveSubject(first)
    }
  }, [allSubjects, initialSubject, activeSubject])

  // ─── Chapter expansion state (only one open at a time) ───
  const [expandedChapter, setExpandedChapter] = useState(null)
  useEffect(() => { setExpandedChapter(null) }, [activeSubject])

  // ─── Active subject's data ───
  const subjectData = useMemo(() => {
    if (!data || !activeSubject) return null
    return data.subjects.find(s => s.subject === activeSubject) || null
  }, [data, activeSubject])

  // ─── Derived values ───
  const todayFocus = data?.todayFocus || null
  const recentConcepts = data?.recentConcepts || []

  // overall_mastery is already a 0-100 percentage from the backend
  // (server/routes/user.ts:483 multiplies composite_score × 100). Don't double it.
  const subjectMasteryPct = subjectData ? Math.round(subjectData.overall_mastery || 0) : 0
  const chaptersTotal = subjectData?.chapters?.length || 0
  const chaptersCompleted = subjectData?.chapters?.filter(ch => {
    const { avgMastery } = computeChapterState(ch)
    return avgMastery >= 70
  }).length || 0
  const weakConceptCount = subjectData?.counts?.weak || 0

  // ─── Quick Quest (right rail) — use top weak concept if available ───
  const weakQuickConcept = subjectData?.chapters
    ?.flatMap(ch => ch.concepts || [])
    .find(c => c.mastery_status === 'weak')

  const quickQuest = weakQuickConcept ? {
    title: `${weakQuickConcept.concept_name} — 5 questions`,
    min: 4, xp: 30,
    target: { screen: 'practice', subject: activeSubject, concept: weakQuickConcept.concept_slug },
  } : null

  // ─── Try Asking Pa suggestions (seed from weak topics + classics) ───
  const askPaItems = []
  const weakConcepts = subjectData?.chapters
    ?.flatMap(ch => ch.concepts || [])
    .filter(c => c.mastery_status === 'weak')
    .slice(0, 2) || []
  for (const c of weakConcepts) askPaItems.push(`Help me understand ${c.concept_name}`)
  if (askPaItems.length < 3) askPaItems.push('Explain my last wrong answer')

  // ─── Pick Up card (rail) — derive from recentConcepts ───
  const lastPracticed = recentConcepts[0] || null
  const resume = lastPracticed ? {
    subject: lastPracticed.subject,
    chapter: lastPracticed.chapter_name || lastPracticed.concept_name,
    progress: 60,    // TODO(data): real chapter progress
    color: SUBJECT_ACCENT[lastPracticed.subject] || 'var(--c-accent)',
    concept_slug: lastPracticed.concept_slug,
  } : null

  // ─── Footer data (same as Home v4) ───
  const mastery = (homeData?.subjectHealth || []).slice(0, 5).map(s => ({
    name: s.subject,
    pct: s.accuracy || 0,
    color: SUBJECT_ACCENT[s.subject] || 'var(--c-muted)',
    delta: null,
  }))
  const week = Array(7).fill(0)
  week[6] = homeData?.todayXP || 0

  // ─── Click handlers ───
  function onStartPaCue() {
    if (!todayFocus) return
    onNavigate?.('practice', {
      subject: todayFocus.subject,
      concept: todayFocus.concept_slug,
    })
  }
  function onPlanWeek() {
    if (!activeSubject) return
    onNavigate?.('ask-ai', {
      question: `Pa, plan my week in ${activeSubject}. What should I focus on to improve my weak concepts?`,
      subject: activeSubject,
    })
  }
  function onConceptClick(concept) {
    const q = `Explain ${concept.concept_name} in detail with an example I can follow as a Class ${user.studentClass || 10} student.`
    onNavigate?.('ask-ai', { question: q, subject: activeSubject })
  }
  function onChapterWideAsk(chapter) {
    // Used when a chapter has no concepts yet (content indexed but not curated)
    const q = `Explain Chapter ${chapter.chapter_no}: ${chapter.chapter_name} in overview — what should I focus on?`
    onNavigate?.('ask-ai', { question: q, subject: activeSubject })
  }

  // ─── Render ───
  return (
    <div className="learn-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...(homeData?.profile || {}), level: user.level || 1 }}
        streak={homeData?.streak?.current_streak || 0}
        active="learn"
        onNavigate={onNavigate}
      />

      <div className="learn-page">
        <div className="learn-body-grid">
          <main className="learn-main">
            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-muted)' }}>
                Loading your syllabus…
              </div>
            )}
            {err && (
              <div style={{ padding: 16, background: '#FEE', color: '#C00', borderRadius: 12 }}>
                ⚠ {err}
              </div>
            )}

            {!loading && !err && allSubjects.length > 0 && (
              <>
                <SubjectPills
                  subjects={allSubjects.map(s => s.subject)}
                  active={activeSubject}
                  onChange={setActiveSubject}
                />

                {subjectData && (
                  <>
                    {subjectData.no_content ? (
                      <div className="subj-hero">
                        <div className="copy">
                          <div className="meta">{activeSubject} · Class {user.studentClass || 10}</div>
                          <div className="title" style={{ fontSize: 19 }}>Content not uploaded yet</div>
                          <div className="sub">
                            Your teacher hasn't uploaded NCERT content for this subject yet. Check back soon.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <SubjectHeroCard
                          subject={activeSubject}
                          classLevel={user.studentClass || 10}
                          masteryPct={subjectMasteryPct}
                          chaptersCompleted={chaptersCompleted}
                          chaptersTotal={chaptersTotal}
                          weakConcepts={weakConceptCount}
                          onPlanWeek={onPlanWeek}
                        />

                        {/* Pa cue banner — only when todayFocus matches active subject */}
                        {todayFocus && todayFocus.subject === activeSubject && (
                          <PaCueCard focus={todayFocus} onStart={onStartPaCue} />
                        )}

                        {/* Chapter list */}
                        {subjectData.chapters?.length > 0 && (
                          <>
                            <div className="chapters-eyebrow">Chapters</div>
                            {subjectData.chapters.map(ch => {
                              const isOpen = expandedChapter === ch.chapter_no
                              return (
                                <div key={ch.chapter_no}>
                                  <ChapterRow
                                    chapter={ch}
                                    expanded={isOpen}
                                    onToggle={() => {
                                      if (ch.concepts?.length === 0) {
                                        // No curated concepts — go straight to Ask AI chapter-wide
                                        onChapterWideAsk(ch)
                                        return
                                      }
                                      setExpandedChapter(isOpen ? null : ch.chapter_no)
                                    }}
                                  />
                                  {isOpen && (
                                    <ChapterConceptList
                                      concepts={ch.concepts || []}
                                      onConceptClick={onConceptClick}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </>
                        )}

                        {subjectData.chapters?.length === 0 && (
                          <div style={{ padding: 20, background: 'var(--c-card)', border: '1px solid var(--c-hair)', borderRadius: 12, color: 'var(--c-muted)' }}>
                            No chapters available for {activeSubject} yet.
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {!loading && !err && allSubjects.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ marginBottom: 14 }}>No subjects enrolled yet.</p>
                <button
                  onClick={() => onNavigate?.('home')}
                  style={{
                    padding: '10px 20px', borderRadius: 12, fontFamily: 'inherit',
                    background: 'var(--c-accent)', color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Go home
                </button>
              </div>
            )}
          </main>

          <aside className="learn-rail">
            <PaStatusCard subject={activeSubject} />
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
              onAsk={q => onNavigate?.('ask-ai', { question: q, subject: activeSubject })}
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
