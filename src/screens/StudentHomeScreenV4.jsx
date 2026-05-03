// ═══════════════════════════════════════════════════════════════════════════
// StudentHomeScreenV4 — rebuilt to match the reference HTML prototype exactly.
// ═══════════════════════════════════════════════════════════════════════════
// Layout matches `design_handoff_home_screen/reference/padee-flagship.jsx`:
//   [Dark top nav]
//   [Page header: eyebrow + title + right meta]
//   [2-column body]
//     Main:  Greeting + study-time pill  → Boss Quest (with Pa mascot)
//            → 3-up QuestCard row (Continue / Daily / Revise)
//            → 2-up row (Weak Spots 1.5fr + Upcoming Tests 1fr)
//     Rail:  PaStatusCard → QuickQuest → AskPaSuggestions → ResumeCard
//   [Footer strip: XP ring + subject mastery dots + badges]
//
// Data flows only here — all child components are presentational.
// Same data sources as v3 Home (useUser + /api/recommendations/today).
// Missing backend fields stubbed with TODO(data): comments.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../context/UserContext'
import '../styles/home-v4.css'

import HomeTopNav from '../components/home-v4/HomeTopNav'
import BossQuestCard from '../components/home-v4/BossQuestCard'
import QuestCard from '../components/home-v4/QuestCard'
import YourProgressCard from '../components/home-v4/YourProgressCard'
import {
  PaStatusCard, AskPaSuggestions,
} from '../components/home-v4/RailWidgets'
import FooterStrip from '../components/home-v4/FooterStrip'
import Ico from '../components/home-v4/Ico'
import StreakAtRiskBanner from '../components/home-v4/StreakAtRiskBanner'
import ReplanCheckInBanner from '../components/home-v4/ReplanCheckInBanner'
import RecentDoubts from '../components/home-v4/RecentDoubts'
import TodayActivity from '../components/home-v4/TodayActivity'
import RecentWins from '../components/home-v4/RecentWins'

const SUBJECT_META = {
  Maths:            { color: 'var(--c-violet)',  bg: 'var(--c-purple-l)', fg: 'var(--c-purple)' },
  Mathematics:      { color: 'var(--c-violet)',  bg: 'var(--c-purple-l)', fg: 'var(--c-purple)' },
  Physics:          { color: 'var(--c-blue)',    bg: 'var(--c-blue-l)',   fg: '#1D47C4' },
  Chemistry:        { color: 'var(--c-accent)',  bg: 'var(--c-accent-l)', fg: 'var(--c-accent-d)' },
  Biology:          { color: 'var(--c-green)',   bg: 'var(--c-green-l)',  fg: '#0F7A4F' },
  Science:          { color: 'var(--c-accent)',  bg: 'var(--c-accent-l)', fg: 'var(--c-accent-d)' },
  English:          { color: 'var(--c-green)',   bg: 'var(--c-green-l)',  fg: '#0F7A4F' },
  'Computer Science': { color: 'var(--c-cyan)',  bg: 'var(--c-cyan-l)',   fg: '#0E6A82' },
  Hindi:            { color: 'var(--c-pink)',    bg: 'var(--c-pink-l)',   fg: '#A61E57' },
  'Social Science': { color: 'var(--c-amber)',   bg: 'var(--c-amber-l)',  fg: '#8A5A00' },
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

export default function StudentHomeScreenV4({ onNavigate }) {
  const user = useUser()
  const homeData = user.homeData
  const loading = !user.profileLoaded

  const [recommendation, setRecommendation] = useState(null)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch('/api/recommendations/today', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRecommendation(data) })
      .catch(() => {})
  }, [user.xp])

  // ─── Learn-data (subject → chapter → concept hierarchy) ───
  // Same endpoint Learn v4 and Progress v4 use. Powers the SubjectsGrid card
  // that surfaces the 3-layer recommendation engine model on the Home screen.
  const [learnData, setLearnData] = useState(null)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch('/api/user/learn-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLearnData(data) })
      .catch(() => {})
  }, [user.xp])

  const shaped = useMemo(() => {
    const profile = homeData?.profile || {}
    const firstName = (profile.name || 'Student').split(' ')[0]
    const xpToday = homeData?.todayXP ?? 0
    const xpGoal = homeData?.dailyGoal ?? 50
    const xpGap = Math.max(0, xpGoal - xpToday)
    const streakDays = homeData?.streak?.current_streak ?? 0
    const pledgedDaysMissed = homeData?.streak?.pledged_days_missed ?? 0

    // ─── Boss Quest ───
    // Pass the full recommendation object through to BossQuestCard so it can
    // do its own hero_type branching (fix_critical / fix_attention / revise /
    // next_chapter / none). This matches v3 HeroCard's data contract exactly
    // — no more synthesized fields. Real chips are rendered from hero_detail:
    // failure_count, exam_weight, composite_score.
    const hd = recommendation?.hero_detail || {}

    // ─── 3-up cards ───
    // Card 1: "Continue" — last started doubt/practice
    // TODO(data): add real session progress to practice_sessions
    const lastDoubt = homeData?.recentDoubts?.[0]
    const continueCard = lastDoubt ? {
      subject: lastDoubt.subject,
      title: `Continue: ${(lastDoubt.question_text || 'Last question').slice(0, 32)}`,
      meta: `${lastDoubt.subject} · Earlier today`,
      progress: 0.55,               // TODO(data)
      color: SUBJECT_META[lastDoubt.subject]?.color || 'var(--c-purple)',
      targetScreen: 'ask-ai',
    } : null

    // Card 2: "Daily challenge" — real from homeData.dailyChallenge
    const daily = homeData?.dailyChallenge
    const dailyCard = daily ? {
      subject: daily.subject,
      count: daily.questionCount,
      xp: daily.xpReward || 50,
    } : null

    // Card 3: "Revise" — pulled from backend supporting_cards (same source v3 uses).
    // Backend returns `supporting_cards: [{ type: 'weak'|'revise', concept_name,
    // subject, concept_slug, failure_count?, days_since_practice? }]`
    const supportingCards = recommendation?.supporting_cards || []
    const revisionSupport = supportingCards.find(c => c.type === 'revise')
    const reviseCard = revisionSupport ? {
      subject: revisionSupport.subject,
      title: `Revise: ${revisionSupport.concept_name}`,
      meta: `${revisionSupport.subject} · ${revisionSupport.days_since_practice != null ? `${revisionSupport.days_since_practice} days ago` : 'a while ago'}`,
      color: SUBJECT_META[revisionSupport.subject]?.color || 'var(--c-blue)',
      concept_slug: revisionSupport.concept_slug,
    } : null

    // ─── Weak spots ───
    // Use supporting_cards filtered by type='weak' (v3 parity). Fallback to
    // subject-level weakness only when no concept-level data exists yet.
    const weakSupport = supportingCards.filter(c => c.type === 'weak')
    const weakSpots = weakSupport.slice(0, 3).map(w => ({
      topic: w.concept_name,
      subject: w.subject,
      mastery: w.composite_score != null ? Math.round(w.composite_score * 100) : null,
      delta: null,                  // TODO(data): expose week-over-week delta
      color: SUBJECT_META[w.subject]?.color || 'var(--c-accent)',
      reason: w.failure_count != null
        ? `Failed ${w.failure_count} time${w.failure_count !== 1 ? 's' : ''}`
        : null,
      concept_slug: w.concept_slug,
    }))
    // Fallback: subject-level weaknesses when no concept data has accumulated
    if (weakSpots.length === 0 && homeData?.subjectHealth) {
      const weakThreshold = homeData.weakTopicThreshold || 70
      const weakSubjects = homeData.subjectHealth
        .filter(s => s.accuracy !== null && s.accuracy < weakThreshold)
        .slice(0, 3)
        .map(s => ({
          topic: s.subject,
          subject: s.subject,
          mastery: s.accuracy,
          delta: null,
          color: SUBJECT_META[s.subject]?.color || 'var(--c-accent)',
          reason: `${s.totalQuestions} questions practiced`,
        }))
      weakSpots.push(...weakSubjects)
    }

    // ─── Upcoming tests ───
    // TODO(data): add upcomingTests to /api/user/home-data (join from test_assignments)
    const upcomingTests = homeData?.upcomingTests || []

    // ─── Strengths (PRD 8C "on track" band: composite_score ≥ 0.70 AND attempts ≥ 3) ───
    // Surfaces the student's WINS alongside their weak spots. Balanced UX.
    // Source: concept_mastery via /api/user/learn-data (already fetched).
    const strengths = []
    const learnSubjectsAll = learnData?.subjects || []
    for (const subj of learnSubjectsAll) {
      for (const ch of subj.chapters || []) {
        for (const c of ch.concepts || []) {
          if ((c.composite_score ?? 0) >= 0.70 && (c.attempt_count ?? 0) >= 3) {
            strengths.push({
              concept_slug: c.concept_slug,
              concept_name: c.concept_name,
              subject: subj.subject,
              mastery: Math.round((c.composite_score || 0) * 100),
            })
          }
        }
      }
    }
    // Sort by highest mastery first, cap at 3 (per plan Q3)
    strengths.sort((a, b) => b.mastery - a.mastery)
    const topStrengths = strengths.slice(0, 3)

    // ─── Weak spots shaped for YourProgressCard (subject + concept_slug + mastery as %) ───
    const progressWeakSpots = weakSpots.map(w => ({
      concept_slug: w.concept_slug,
      concept_name: w.topic,
      subject: w.subject,
      mastery: w.mastery,
    }))

    // ─── "Next test" card — goes into the 3-up row's 3rd slot when any
    // upcoming test exists (any time horizon, per plan Q1).
    // Priority for 3rd slot: next-test > revise > null.
    const nextTest = (upcomingTests || [])
      .filter(t => t.deadline && new Date(t.deadline) > new Date())
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0]
    let nextTestCard = null
    if (nextTest) {
      const days = Math.max(0, Math.ceil((new Date(nextTest.deadline) - Date.now()) / 86400000))
      const urgent = days <= 3
      nextTestCard = {
        title: `Next test: ${nextTest.title || 'Scheduled test'}`,
        meta: `${nextTest.subject} · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
        subject: nextTest.subject,
        assignmentId: nextTest.id,
        urgent,
      }
    }

    // ─── Rail: Quick quest (secondary priority) ───
    // TODO(data): backend doesn't yet expose a secondary recommendation;
    // fallback to daily challenge for now.
    const quickQuest = dailyCard ? {
      title: `${dailyCard.subject} — ${dailyCard.count} questions`,
      min: 4,
      xp: dailyCard.xp,
      target: { screen: 'practice', subject: dailyCard.subject },
    } : null

    // ─── Rail: Ask Pa suggestions ───
    // TODO(data): would be nice to have a backend endpoint that returns
    // "likely next questions for this student" based on their weak concepts.
    // For now, seed from weak-spot topics + classic prompts.
    const askPaItems = []
    if (weakSpots.length > 0) askPaItems.push(`Help me understand ${weakSpots[0].topic}`)
    if (weakSpots.length > 1) askPaItems.push(`Quiz me on ${weakSpots[1].topic}`)
    if (askPaItems.length < 3) askPaItems.push('Explain my last wrong answer')

    // ─── Rail: Resume card ───
    const resume = lastDoubt ? {
      subject: lastDoubt.subject,
      chapter: (lastDoubt.question_text || 'Last question').slice(0, 32),
      progress: 62,                 // TODO(data): real progress
      color: SUBJECT_META[lastDoubt.subject]?.color || 'var(--c-accent)',
    } : null

    // ─── Footer data ───
    const mastery = (homeData?.subjectHealth || [])
      .filter(s => s.accuracy !== null)
      .slice(0, 5)
      .map(s => ({
        name: s.subject,
        pct: s.accuracy,
        color: SUBJECT_META[s.subject]?.color || 'var(--c-muted)',
        delta: null,                // TODO(data): expose week-over-week delta
      }))

    // Synthetic 7-day spark until backend exposes per-day XP
    // TODO(data): GROUP BY date on student_xp events
    const week = Array(7).fill(0)
    week[6] = xpToday
    // Fill previous days with 10s if within streak range (visual only)
    for (let i = 5; i >= 0; i--) {
      if (6 - i <= streakDays) week[i] = 10
    }

    // Backend returns ONLY unlocked badges (from config.badges where condition met).
    // Each row has shape: { id, name, icon }. Normalise to the frontend shape
    // { id, name, emoji, unlocked } so the FooterStrip + RecentWins components
    // work without needing backend changes.
    const allBadges = (homeData?.badges || []).map(b => ({
      id: b.id,
      name: b.name,
      emoji: b.icon || b.emoji || '🏆',
      unlocked: true,
    }))
    const badges = allBadges.slice(0, 5).map(b => b.emoji)

    // ─── Subjects hierarchy (subject → weakest chapter → weakest concept) ───
    // PRD v4.3 Section 8B: 3-layer model.
    // Layer 1 (subject): pct from subjectHealth
    // Layer 2 (chapter): find chapter with lowest avg concept mastery within the subject
    // Layer 3 (concept): within that weakest chapter, the lowest-scoring concept
    const learnSubjects = learnData?.subjects || []
    const subjectsForGrid = (homeData?.subjectHealth || []).map(sh => {
      const meta = SUBJECT_META[sh.subject] || {}
      const learnSubj = learnSubjects.find(ls => ls.subject === sh.subject)
      // Has data = either subject mastery has any total_questions OR concept mastery exists
      const hasStarted = (sh.totalQuestions || 0) > 0
        || (learnSubj && (learnSubj.counts?.mastered + learnSubj.counts?.weak + learnSubj.counts?.learning) > 0)

      let weakestChapter = null, weakestConcept = null
      if (learnSubj?.chapters?.length) {
        // Chapter with lowest avg concept composite_score (only chapters with attempts)
        let worstChapter = null, worstAvg = Infinity
        for (const ch of learnSubj.chapters) {
          const scored = (ch.concepts || []).filter(c => c.composite_score != null)
          if (!scored.length) continue
          const avg = scored.reduce((s, c) => s + c.composite_score, 0) / scored.length
          if (avg < worstAvg) { worstAvg = avg; worstChapter = ch }
        }
        if (worstChapter) {
          weakestChapter = worstChapter.chapter_name
          const weakestConceptObj = (worstChapter.concepts || [])
            .filter(c => c.composite_score != null)
            .sort((a, b) => a.composite_score - b.composite_score)[0]
          if (weakestConceptObj) weakestConcept = weakestConceptObj.concept_name
        }
      }
      return {
        name: sh.subject,
        color: meta.color || 'var(--c-muted)',
        masteryPct: sh.accuracy || 0,
        hasStarted,
        strongCount: learnSubj?.counts?.mastered ?? null,
        weakCount: learnSubj?.counts?.weak ?? null,
        weakestChapter,
        weakestConcept,
        trend: (sh.accuracy ?? 0) < 45 ? 'down' : (sh.accuracy ?? 0) >= 75 ? 'up' : 'stable',
      }
    })

    // ─── Recent doubts (last 3) ───
    const recentDoubts = (homeData?.recentDoubts || []).slice(0, 3)

    // ─── Today's activity breakdown ───
    const todayActivity = homeData?.todayActivity || {}
    const xpBreakdown = homeData?.xpBreakdown || {}

    // ─── Badges (with names, not just emojis) ───
    // Use the already-normalised allBadges so RecentWins sees { unlocked, emoji, name }.
    const badgesWithNames = allBadges

    return {
      profile, firstName,
      xpToday, xpGoal, xpGap,
      streakDays,
      pledgedDaysMissed,
      studyMinutes: homeData?.todayActivity?.studyMinutes ?? 0,
      recommendation,          // full object — BossQuestCard branches internally
      heroDetail: hd,
      continueCard, dailyCard, reviseCard, nextTestCard,
      weakSpots,
      upcomingTests,
      topStrengths,
      progressWeakSpots,
      quickQuest,
      askPaItems,
      resume,
      mastery,
      week,
      badges,
      // Backend now returns totalBadges from config.badges.length; the fallback
      // here only applies if home-data hasn't loaded yet.
      totalBadges: homeData?.totalBadges || 15,
      level: user.level || 1,
      // New in Apr 23 top-up
      subjectsForGrid,
      recentDoubts,
      todayActivity,
      xpBreakdown,
      badgesWithNames,
    }
  }, [homeData, recommendation, learnData, user.xp, user.level])

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="home-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <HomeTopNav user={null} streak={0} onNavigate={onNavigate} />
        <div className="pd-page">
          <div style={{ padding: 28 }}>
            <div style={{ height: 120, background: 'var(--c-hair-2)', borderRadius: 20, marginBottom: 18 }} />
            <div style={{ height: 180, background: 'var(--c-hair-2)', borderRadius: 20 }} />
          </div>
        </div>
      </div>
    )
  }

  // ─── Composition ───
  return (
    <div className="home-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...shaped.profile, level: shaped.level }}
        streak={shaped.streakDays}
        onNavigate={onNavigate}
      />

      <div className="pd-page">
        <div className="pd-body-grid" style={{ overflow: 'auto' }}>
          {/* ─── MAIN COLUMN ─── */}
          <div className="pd-body-main">
            {/* Greeting block */}
            <div style={{ marginBottom: 18 }}>
              <div className="t-eyebrow" style={{ marginBottom: 6 }}>{greeting()}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div className="t-h1">
                    Hey {shaped.firstName}, ready to level up? <span style={{ fontSize: 22 }}>🎯</span>
                  </div>
                  {shaped.xpGap <= 0 && (
                    <div className="t-sm" style={{ marginTop: 6 }}>Daily goal complete. Keep the momentum going.</div>
                  )}
                </div>
                <div className="pd-card flat" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ico name="clock" size={14} />
                  <div className="t-xs" style={{ display: 'flex', gap: 6 }}>
                    <span>Study time today</span>
                    <b className="tabular" style={{ color: 'var(--c-ink)' }}>{shaped.studyMinutes}m</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Re-plan check-in — fires when student has missed 3+ pledged days.
                Outranks streak-at-risk visually because it's a "let's renegotiate
                the whole week" prompt, not a "finish today's goal" nudge. */}
            <ReplanCheckInBanner
              missed={shaped.pledgedDaysMissed}
              onReplan={() => onNavigate?.('settings')}
            />

            {/* Streak-at-risk alert — only when today's goal not met */}
            {shaped.xpGap > 0 && (
              <StreakAtRiskBanner
                xpRemaining={shaped.xpGap}
                streakDays={shaped.streakDays}
                onAct={() => onNavigate?.('practice')}
              />
            )}

            {/* Boss Quest — v3 data contract (matches HeroCard), v4 visual */}
            <BossQuestCard
              recommendation={shaped.recommendation}
              onStart={() => {
                if (!shaped.recommendation) return
                const d = shaped.heroDetail || {}
                const slug = shaped.recommendation.hero_concept_slug
                if (shaped.recommendation.hero_type === 'next_chapter') {
                  // Start the next chapter → Learn flow with subject context
                  onNavigate?.('learn', d.subject ? { subject: d.subject } : undefined)
                } else {
                  // Fix / revise types → practice on the concept
                  onNavigate?.('practice', d.subject ? { subject: d.subject, concept: slug } : undefined)
                }
                // Fire-and-forget: mark the recommendation as consumed (v3 parity)
                fetch('/api/recommendations/acted-on', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${getToken()}` },
                }).catch(() => {})
              }}
              onSeePlan={() => onNavigate?.('learn', shaped.heroDetail?.subject ? { subject: shaped.heroDetail.subject } : undefined)}
            />

            {/* 3-up row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
              {shaped.continueCard && (
                <QuestCard
                  icon="play"
                  iconBg="var(--c-purple-l)"
                  iconFg="var(--c-purple)"
                  xp={15}
                  xpColor="var(--c-purple)"
                  title={shaped.continueCard.title}
                  meta={shaped.continueCard.meta}
                  progress={shaped.continueCard.progress}
                  progressColor={shaped.continueCard.color}
                  onClick={() => onNavigate?.(shaped.continueCard.targetScreen)}
                />
              )}
              {shaped.dailyCard && (
                <QuestCard
                  icon="sparkle"
                  iconBg="var(--c-amber-l)"
                  iconFg="var(--c-amber)"
                  xp={shaped.dailyCard.xp}
                  xpColor="var(--c-amber)"
                  title="Daily challenge"
                  meta={`${shaped.dailyCard.subject} · ${shaped.dailyCard.count} MCQs`}
                  cta="Start →"
                  onClick={() => onNavigate?.('practice', { subject: shaped.dailyCard.subject })}
                />
              )}
              {/* Third slot: Next test > Revise > null (per plan: show next-test whenever one exists) */}
              {shaped.nextTestCard ? (
                <QuestCard
                  icon="tests"
                  iconBg={shaped.nextTestCard.urgent ? 'var(--c-amber-l)' : 'var(--c-blue-l)'}
                  iconFg={shaped.nextTestCard.urgent ? '#8A5A00' : 'var(--c-blue)'}
                  xp={null}
                  xpColor={shaped.nextTestCard.urgent ? 'var(--c-accent)' : 'var(--c-blue)'}
                  title={shaped.nextTestCard.title}
                  meta={shaped.nextTestCard.meta}
                  cta="Prep →"
                  onClick={() => onNavigate?.('tests')}
                />
              ) : shaped.reviseCard ? (
                <QuestCard
                  icon="learn"
                  iconBg="var(--c-blue-l)"
                  iconFg="var(--c-blue)"
                  xp={10}
                  xpColor="var(--c-blue)"
                  title={shaped.reviseCard.title}
                  meta={shaped.reviseCard.meta}
                  cta="Review →"
                  onClick={() => onNavigate?.('practice', shaped.reviseCard.concept_slug
                    ? { subject: shaped.reviseCard.subject, concept: shaped.reviseCard.concept_slug }
                    : { subject: shaped.reviseCard.subject }
                  )}
                />
              ) : null}
            </div>

            {/* Your Progress — strengths + weak spots, kid-friendly balanced view */}
            <YourProgressCard
              strengths={shaped.topStrengths}
              weakSpots={shaped.progressWeakSpots}
              onWeakSpotClick={w => onNavigate?.('practice', w.concept_slug
                ? { concept: w.concept_slug, subject: w.subject }
                : { subject: w.subject })}
              onSeeAll={() => onNavigate?.('me')}
            />
          </div>

          {/* ─── RIGHT RAIL ─── */}
          <aside className="pd-body-rail">
            <PaStatusCard
              mood={
                shaped.xpGap === 0 && shaped.xpToday > 0 ? 'celebrate'
                : shaped.xpToday === 0 ? 'speaking'
                : 'idle'
              }
              glow={shaped.streakDays >= 3}
            />
            <TodayActivity
              activity={shaped.todayActivity}
              xpBreakdown={shaped.xpBreakdown}
            />
            <RecentDoubts
              doubts={shaped.recentDoubts}
              onClick={d => onNavigate?.('ask-ai', {
                question: d.topic || d.question_text || '',
                subject: d.subject,
              })}
            />
            <AskPaSuggestions
              items={shaped.askPaItems}
              onAsk={q => onNavigate?.('ask-ai', { question: q })}
            />
            <RecentWins
              badges={shaped.badgesWithNames}
              onViewAll={() => onNavigate?.('me')}
            />
          </aside>
        </div>
      </div>

      <FooterStrip
        xpToday={shaped.xpToday}
        xpGoal={shaped.xpGoal}
        week={shaped.week}
        mastery={shaped.mastery}
        badges={shaped.badges}
        totalBadges={shaped.totalBadges}
      />
    </div>
  )
}
