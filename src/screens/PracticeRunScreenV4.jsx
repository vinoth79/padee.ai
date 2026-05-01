// ═══════════════════════════════════════════════════════════════════════════
// PracticeRunScreenV4 — MCQ in progress (mockup 07A).
// ═══════════════════════════════════════════════════════════════════════════
// Entry points:
//   • Home → Daily Challenge  ⇒ { subject }
//   • Home → Weak Spots        ⇒ { subject, concept }
//   • Home → Revise            ⇒ { subject, concept }
// No Practice hub in this phase. Exit returns to Home.
//
// Flow: loading → quiz (with per-question submit+reveal) → results
// Features:
//   • Question progress strip (correct/wrong/skipped/current/upcoming)
//   • Per-question difficulty + XP chips
//   • Per-question timer (shown, no limit)
//   • Always-visible hint box (no XP cost — kept at-your-fingertips per design)
//   • Skip button counts as wrong, 0 XP, advances
//   • Report modal writes to flagged_responses
//   • Exit shows confirmation before discarding
//   • Responsive: desktop = 2-col with right rail; mobile = single column
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../context/UserContext'
import '../styles/home-v4.css'
import '../styles/practice-v4.css'

import HomeTopNav from '../components/home-v4/HomeTopNav'
import FooterStrip from '../components/home-v4/FooterStrip'
import Ico from '../components/home-v4/Ico'
import PaMascot from '../components/home-v4/PaMascot'
import { PaStatusCard, AskPaSuggestions } from '../components/home-v4/RailWidgets'

import QuestionStrip from '../components/practice-v4/QuestionStrip'
import OptionCard from '../components/practice-v4/OptionCard'
import HintBox from '../components/practice-v4/HintBox'
import ReportModal from '../components/practice-v4/ReportModal'
import ExitConfirm from '../components/practice-v4/ExitConfirm'
import ListenButton from '../components/ui/ListenButton'
import MathText from '../components/ui/MathText'

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null } catch { return null }
}

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DIFF_LABEL = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }

// Subject colour palette (mirrors SUBJECT_META in StudentHomeScreenV4 — kept
// here as a flat lookup so the FooterStrip mastery row is colour-consistent
// across screens without importing across screen modules).
const SUBJECT_COLOR = {
  Maths: 'var(--c-violet)',
  Mathematics: 'var(--c-violet)',
  Physics: 'var(--c-blue)',
  Chemistry: 'var(--c-accent)',
  Biology: 'var(--c-green)',
  Science: 'var(--c-accent)',
  English: 'var(--c-green)',
  'Computer Science': 'var(--c-cyan)',
  Hindi: 'var(--c-pink)',
  'Social Science': 'var(--c-amber)',
  'Social Studies': 'var(--c-amber)',
}

export default function PracticeRunScreenV4({ onNavigate, initialSubject, initialConcept, initialCount }) {
  const user = useUser()
  const homeData = user.homeData

  const subject = initialSubject || homeData?.dailyChallenge?.subject || user.selectedSubjects?.[0] || 'Physics'
  const concept = initialConcept || null
  const className = user.studentClass || 10

  // Question count: nav override > daily challenge config > 5 (for concept-targeted)
  const questionCount = useMemo(() => {
    if (initialCount) return Math.max(1, Math.min(20, Number(initialCount)))
    if (!concept && homeData?.dailyChallenge?.questionCount) return homeData.dailyChallenge.questionCount
    return 5
  }, [initialCount, concept, homeData?.dailyChallenge?.questionCount])

  // ── State machine ──
  const [phase, setPhase] = useState('loading')   // loading | quiz | results | error
  const [sessionId, setSessionId] = useState(null) // server-side grading anchor
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState([])     // [{ questionIdx, selectedIdx, correct, skipped }]
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  // ── Ancillary UI state ──
  const [reportOpen, setReportOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)

  // ── Results-page enrichment (fetched after /complete) ──
  const [resultsConcepts, setResultsConcepts] = useState([]) // [{slug, name, before, after, status}]
  const [paNextMove, setPaNextMove] = useState(null)         // { copy, hero_type, concept_slug }

  // ── Subject mastery snapshot (taken at mount; used to compute the +/- delta on the results hero) ──
  const subjectAccuracyAtStartRef = useRef(null)
  useEffect(() => {
    const row = homeData?.subjectHealth?.find?.(s => s.subject === subject)
    subjectAccuracyAtStartRef.current = (typeof row?.accuracy === 'number') ? row.accuracy : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // capture once at mount, before any quiz activity

  // ── Per-question timer (resets on question change) ──
  const [qSeconds, setQSeconds] = useState(0)
  const timerRef = useRef(null)
  useEffect(() => {
    if (phase !== 'quiz' || submitted) {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => setQSeconds(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, currentIdx, submitted])

  // ── Load questions (pre-loaded cache → API) ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      setPhase('loading')
      setError('')

      // Pre-loaded localStorage cache is now a no-op: server-side grading
      // requires a sessionId that pre-loaded blobs don't carry. Evict any
      // stale cached blobs once so the slot is freed up.
      const cacheKey = `padee-preloaded-practice-v2-${subject}-${new Date().toISOString().split('T')[0]}`
      const oldKey = `padee-preloaded-practice-${subject}-${new Date().toISOString().split('T')[0]}`
      if (localStorage.getItem(cacheKey)) localStorage.removeItem(cacheKey)
      if (localStorage.getItem(oldKey)) localStorage.removeItem(oldKey)

      const token = getToken()
      if (!token) { setError('Not signed in'); setPhase('error'); return }
      try {
        const r = await fetch('/api/ai/practice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: `CBSE Class ${className} ${subject}`,
            subject, className, count: questionCount,
            concept: concept || undefined,
          }),
        })
        const data = await r.json()
        if (cancelled) return
        if (!r.ok || !data.questions?.length || !data.sessionId) {
          setError(data.error || 'Could not generate questions')
          setPhase('error')
          return
        }
        setSessionId(data.sessionId)
        setQuestions(data.questions)
        setPhase('quiz')
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Network error'); setPhase('error') }
      }
    }
    load()
    return () => { cancelled = true }
  }, [subject, concept, className, questionCount])

  // ── Reset per-question timer when the question changes ──
  useEffect(() => { setQSeconds(0) }, [currentIdx])

  const current = questions[currentIdx] || {}
  const totalQuestions = questions.length
  const isLast = currentIdx === totalQuestions - 1

  // ── Per-question XP chip (same math as backend, config is single source of truth) ──
  const diffXp = (homeData?.xpConfig?.practiceDifficulty) || { easy: 3, medium: 6, hard: 10 }
  const currentXp = diffXp[current.difficulty] || diffXp.medium || 6

  // ── Handlers ──
  function handleSelect(idx) {
    if (submitted) return
    setSelected(idx)
  }

  function handleSubmit() {
    if (selected === null || submitted) return
    setSubmitted(true)
    setAnswers(prev => [...prev, {
      questionIdx: currentIdx,
      selectedIdx: selected,
      correct: selected === current.correctIndex,
      skipped: false,
      timeSec: qSeconds,  // captured at moment of submit; used by results UI
    }])
  }

  function handleSkip() {
    if (submitted) return
    // Counts as wrong, 0 XP, advance
    setAnswers(prev => [...prev, {
      questionIdx: currentIdx,
      selectedIdx: null,
      correct: false,
      skipped: true,
      timeSec: qSeconds,
    }])
    advance()
  }

  function handleNext() {
    advance()
  }

  function advance() {
    if (isLast) {
      finishSession()
    } else {
      setCurrentIdx(i => i + 1)
      setSelected(null)
      setSubmitted(false)
    }
  }

  async function finishSession() {
    const token = getToken()
    // If currently on a question that hasn't been recorded (edge case), no-op — answers[] is source of truth
    const allAnswers = submitted && answers.find(a => a.questionIdx === currentIdx) == null
      ? [...answers, { questionIdx: currentIdx, selectedIdx: selected, correct: selected === current.correctIndex, skipped: false, timeSec: qSeconds }]
      : answers
    const correct = allAnswers.filter(a => a.correct).length

    // Show a "scoring" intermediary — keeps the results page from flickering
    // through three states (zeros → real numbers → enriched) as data lands.
    // We flip to 'results' only after grade + enrichment both settle (or
    // enrichment times out; concepts/Pa-next-move are non-essential).
    setPhase('submitting')

    if (!sessionId) {
      // Defensive: no session means we can't ask the server to grade. Show
      // local-only stats so the student isn't dropped off a cliff.
      setResults({ accuracy: Math.round((correct / totalQuestions) * 100), xpAwarded: 0, correctCount: correct })
      setPhase('results')
      return
    }
    try {
      // Server-side grading: send only sessionId + selectedIdx values. Server
      // re-derives `correct` from the canonical questions stored at /practice
      // time — `correct` here remains for the local instant-feedback display.
      const r = await fetch('/api/ai/practice/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: allAnswers.map(a => ({
            questionIdx: a.questionIdx,
            selectedIdx: a.selectedIdx,
            skipped: !!a.skipped,
          })),
          hintsUsed: 0,  // hints always visible in this version
        }),
      })
      const data = await r.json()
      const serverCorrect = typeof data.correctCount === 'number' ? data.correctCount : correct
      setResults({ accuracy: data.accuracy, xpAwarded: data.xpAwarded, correctCount: serverCorrect })
      user.refreshUser?.()

      // Wait for enrichment (concepts touched + Pa's next move) to complete
      // before rendering. Capped at 3500ms — if learn-data is slow the user
      // gets the page minus those two cards rather than sitting on a spinner.
      const enrichTimeout = new Promise(resolve => setTimeout(resolve, 3500))
      await Promise.race([enrichResultsAfterCompletion(token), enrichTimeout])
      setPhase('results')
    } catch {
      setResults({ accuracy: Math.round((correct / totalQuestions) * 100), xpAwarded: 0, correctCount: correct })
      setPhase('results')
    }
  }

  // ─── Results-page enrichment ───────────────────────────────────────────
  // Fires after /practice/complete returns. Pulls /learn-data for current
  // concept_mastery values (filtered to this round's slugs) and
  // /recommendations/today for Pa's next-move copy. Both are best-effort —
  // failures leave the matching cards out of the layout, never crash.
  async function enrichResultsAfterCompletion(token) {
    const slugsTouched = Array.from(new Set(
      questions.map(q => q?.concept_slug).filter(Boolean)
    ))
    const [learnRes, recRes] = await Promise.allSettled([
      fetch('/api/user/learn-data', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/recommendations/today', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])

    if (learnRes.status === 'fulfilled') {
      const allConcepts = (learnRes.value?.subjects || [])
        .flatMap(s => s.chapters || [])
        .flatMap(ch => ch.concepts || [])
      const matched = slugsTouched
        .map(slug => allConcepts.find(c => c.concept_slug === slug))
        .filter(Boolean)
      // Fallback: if nothing matched (concepts not yet detected on the
      // questions), fall back to whatever subject-level concepts have the
      // most recent activity, capped at 3.
      const fallback = matched.length === 0
        ? allConcepts
            .filter(c => c.last_practiced_at)
            .sort((a, b) => new Date(b.last_practiced_at) - new Date(a.last_practiced_at))
            .slice(0, 3)
        : matched.slice(0, 3)
      setResultsConcepts(fallback.map(c => ({
        slug: c.concept_slug,
        name: c.concept_name,
        accuracy: c.accuracy_percent ?? null,
        status: c.mastery_status || 'not_started',
      })))
    }

    if (recRes.status === 'fulfilled') {
      const r = recRes.value
      if (r?.hero_copy && r?.hero_concept_slug) {
        setPaNextMove({
          copy: r.hero_copy,
          conceptSlug: r.hero_concept_slug,
          subject: r.hero_subject || subject,
        })
      }
    }
  }

  function handleReport({ reason, note }) {
    const token = getToken()
    if (!token || !current?.question) return
    return fetch('/api/ai/flag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionText: current.question,
        aiResponse: `Options: ${(current.options || []).join(' | ')} | Correct: ${current.options?.[current.correctIndex]} | Explanation: ${current.explanation || ''}`,
        subject, classLevel: className,
        reportText: `[practice/${reason}] ${note || ''}`.trim(),
      }),
    }).catch(() => {})
  }

  function handleExitConfirmed() {
    setExitOpen(false)
    onNavigate?.('home')
  }

  // ══ LOADING ══
  if (phase === 'loading' || phase === 'submitting') {
    const isSubmitting = phase === 'submitting'
    return (
      <div className="home-v4 practice-v4">
        <HomeTopNav user={homeData?.profile} streak={homeData?.streak?.current_streak || 0} onNavigate={onNavigate} />
        <div className="pd-page">
          <div className="practice-loading">
            <div className="practice-eyebrow">{isSubmitting ? 'SCORING YOUR ANSWERS' : 'GENERATING QUESTIONS'}</div>
            <div className="t-h2" style={{ marginTop: 6 }}>
              {isSubmitting
                ? 'Pa is reviewing each question…'
                : concept ? 'Preparing your targeted practice…' : `${subject} practice in progress…`}
            </div>
            <div className="practice-loading-dots">
              {[0, 1, 2].map(i => <span key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══ ERROR ══
  if (phase === 'error') {
    return (
      <div className="home-v4 practice-v4">
        <HomeTopNav user={homeData?.profile} streak={homeData?.streak?.current_streak || 0} onNavigate={onNavigate} />
        <div className="pd-page">
          <div className="practice-error">
            <h2 className="t-h2">Something went wrong</h2>
            <p className="t-sm" style={{ marginTop: 6 }}>{error || 'Could not start practice.'}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="pd-btn ghost" onClick={() => onNavigate?.('home')}>Back to home</button>
              <button className="pd-btn primary" onClick={() => { setPhase('loading'); setError('') }}>Retry</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══ RESULTS ══
  if (phase === 'results') {
    const total = totalQuestions
    const correct = results?.correctCount ?? 0
    const accuracy = results?.accuracy ?? Math.round((correct / total) * 100)
    const xp = results?.xpAwarded ?? 0
    const wrongCount = total - correct  // wrong + skipped

    // Per-Q timing aggregates
    const times = answers.map(a => a.timeSec ?? 0)
    const totalSec = times.reduce((s, t) => s + t, 0)
    const avgSec = times.length ? Math.round(totalSec / times.length) : 0
    const tIdxByValue = arr => {
      let mIdx = -1, mVal = -1
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] > mVal || mIdx === -1) { mVal = arr[i]; mIdx = i }
      }
      return mIdx
    }
    const fastestIdx = times.length
      ? times.reduce((bestI, t, i) => (i === 0 || t < times[bestI]) ? i : bestI, 0)
      : -1
    const slowestIdx = times.length ? tIdxByValue(times) : -1

    // Subject mastery delta (snapshotted at quiz start vs current)
    const subjectAccBefore = subjectAccuracyAtStartRef.current
    const subjectAccAfter = homeData?.subjectHealth?.find?.(s => s.subject === subject)?.accuracy
    const masteryDelta = (typeof subjectAccBefore === 'number' && typeof subjectAccAfter === 'number')
      ? subjectAccAfter - subjectAccBefore
      : null

    // First name + tone
    const firstName = (homeData?.profile?.name || homeData?.profile?.full_name || '').split(' ')[0]
    const tone = accuracy >= 80 ? 'green' : accuracy >= 50 ? 'amber' : 'coral'
    const heroTitle = accuracy >= 80
      ? `Solid run${firstName ? `, ${firstName}` : ''}.`
      : accuracy >= 50
        ? `Good effort${firstName ? `, ${firstName}` : ''}.`
        : `Keep going${firstName ? `, ${firstName}` : ''}.`
    const pacingCopy = avgSec > 0
      ? avgSec < 30 ? `lightning-fast at ${avgSec}s per Q`
        : avgSec < 60 ? `avg ${avgSec}s per question`
        : `${avgSec}s per question — taking your time`
      : ''

    // XP breakdown — derive from server logic so totals stay honest.
    const diffXp = homeData?.xpConfig?.practiceDifficulty || { easy: 3, medium: 6, hard: 10 }
    const correctByDifficulty = answers.reduce((acc, a) => {
      if (!a.correct) return acc
      const q = questions[a.questionIdx]
      const d = q?.difficulty && ['easy','medium','hard'].includes(q.difficulty) ? q.difficulty : 'medium'
      acc[d] = (acc[d] || 0) + 1
      return acc
    }, {})
    const xpFromCorrect = Object.entries(correctByDifficulty).reduce(
      (s, [d, n]) => s + n * (diffXp[d] || diffXp.medium || 6), 0
    )
    const xpAdjustment = xp - xpFromCorrect

    // Level math (100 XP/level, simple). totalXP refresh fires via refreshUser.
    const totalXP = (homeData?.totalXP || 0)
    const xpPerLevel = 100
    const currentLevel = Math.floor(totalXP / xpPerLevel) + 1
    const xpInLevel = totalXP % xpPerLevel
    const xpToNext = xpPerLevel - xpInLevel
    const levelPct = Math.round((xpInLevel / xpPerLevel) * 100)

    return (
      <div className="home-v4 practice-v4">
        <HomeTopNav user={homeData?.profile} streak={homeData?.streak?.current_streak || 0} onNavigate={onNavigate} />
        <div className="pd-page practice-results-v2">

          <div className="prv2-titlebar">
            <div className="prv2-eyebrow">PRACTICE · SESSION COMPLETE</div>
            <h1 className="prv2-page-title">Practice · session complete</h1>
            <div className="prv2-titlebar-meta t-xs">results · retry · next</div>
          </div>

          <div className="prv2-grid">
            <div className="prv2-main">

              {/* ─── HERO ─── */}
              <section className={`prv2-hero tone-${tone}`}>
                <div className="prv2-hero-ring">
                  <ScoreRing pct={accuracy} tone={tone} />
                </div>
                <div className="prv2-hero-text">
                  <div className="prv2-hero-eyebrow">
                    SESSION COMPLETE · {(subject || '').toUpperCase()}
                    {homeData?.profile?.class_level ? ` · CLASS ${homeData.profile.class_level}` : ''}
                  </div>
                  <h2 className="prv2-hero-title">{heroTitle}</h2>
                  <p className="prv2-hero-line">
                    <b>{correct} of {total}</b> right{pacingCopy ? <> · {pacingCopy}</> : null}.
                  </p>
                  <div className="prv2-hero-chips">
                    <span className="prv2-chip xp">+{xp} XP earned</span>
                    {masteryDelta !== null && (
                      <span className={`prv2-chip mastery ${masteryDelta >= 0 ? 'pos' : 'neg'}`}>
                        {masteryDelta >= 0 ? '+' : ''}{masteryDelta}% mastery
                      </span>
                    )}
                    {(homeData?.streak?.current_streak || 0) >= 1 && (
                      <span className="prv2-chip streak">🔥 streak: {homeData.streak.current_streak} day{homeData.streak.current_streak === 1 ? '' : 's'}</span>
                    )}
                  </div>
                </div>
                <div className="prv2-hero-actions">
                  {wrongCount > 0 && (
                    <button className="pd-btn primary prv2-cta" onClick={() => {
                      onNavigate?.('practice', { subject, concept })  // fresh round on same topic
                    }}>Retry {wrongCount} wrong →</button>
                  )}
                  <button className="pd-btn ghost prv2-cta" onClick={() => {
                    onNavigate?.('home')
                  }}>Review all {total}</button>
                </div>
              </section>

              {/* ─── QUESTION-BY-QUESTION GRID ─── */}
              <section className="prv2-card prv2-grid-card">
                <header className="prv2-card-head">
                  <h3 className="prv2-card-title">Question by question</h3>
                  <span className="prv2-card-sub">click any to review</span>
                </header>
                <div className="prv2-q-grid">
                  {answers.map((a, i) => {
                    const status = a.correct ? 'correct' : a.skipped ? 'skipped' : 'wrong'
                    const qNum = a.questionIdx + 1
                    const q = questions[a.questionIdx]
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`prv2-q-tile ${status}`}
                        title={q?.question}
                        onClick={() => { /* future: open review modal */ }}
                      >
                        <div className="prv2-q-mark">{a.correct ? '✓' : a.skipped ? '○' : '×'}</div>
                        <div className="prv2-q-num">Q{qNum}</div>
                        <div className="prv2-q-time tabular">{formatMMSS(a.timeSec || 0)}</div>
                      </button>
                    )
                  })}
                </div>
                <footer className="prv2-time-strip">
                  <div className="prv2-time-cell">
                    <div className="prv2-time-label">FASTEST</div>
                    <div className="prv2-time-val">
                      {fastestIdx >= 0 ? `Q${answers[fastestIdx].questionIdx + 1} · ${formatMMSS(answers[fastestIdx].timeSec || 0)}` : '—'}
                    </div>
                  </div>
                  <div className="prv2-time-cell">
                    <div className="prv2-time-label">SLOWEST</div>
                    <div className="prv2-time-val">
                      {slowestIdx >= 0 ? `Q${answers[slowestIdx].questionIdx + 1} · ${formatMMSS(answers[slowestIdx].timeSec || 0)}` : '—'}
                    </div>
                  </div>
                  <div className="prv2-time-cell">
                    <div className="prv2-time-label">AVG</div>
                    <div className="prv2-time-val">{avgSec > 0 ? `${avgSec} sec` : '—'}</div>
                  </div>
                  <div className="prv2-time-cell prv2-time-total">
                    <div className="prv2-time-label">TOTAL TIME</div>
                    <div className="prv2-time-val tabular">{formatMMSS(totalSec)}</div>
                  </div>
                </footer>
              </section>

              {/* ─── XP EARNED BREAKDOWN ─── */}
              <section className="prv2-card prv2-xp-card">
                <header className="prv2-card-head">
                  <h3 className="prv2-card-title">XP earned · {xp}</h3>
                </header>
                <ul className="prv2-xp-lines">
                  {Object.entries(correctByDifficulty).map(([d, n]) => (
                    <li key={d}>
                      <span className="prv2-xp-dot" data-diff={d} />
                      <span className="prv2-xp-line">{n} {d} correct answer{n === 1 ? '' : 's'}</span>
                      <span className="prv2-xp-amt tabular">+{n * (diffXp[d] || diffXp.medium || 6)}</span>
                    </li>
                  ))}
                  {xpAdjustment !== 0 && (
                    <li>
                      <span className="prv2-xp-dot" />
                      <span className="prv2-xp-line">{xpAdjustment > 0 ? 'Bonus' : 'Hint penalty'}</span>
                      <span className="prv2-xp-amt tabular">{xpAdjustment > 0 ? '+' : ''}{xpAdjustment}</span>
                    </li>
                  )}
                </ul>
                <div className="prv2-xp-total">
                  <span>Added to today</span>
                  <span className="prv2-xp-total-amt tabular">+{xp} XP</span>
                </div>
                {totalXP > 0 && (
                  <div className="prv2-level-hint t-xs">
                    {xpToNext} XP to Level {currentLevel + 1} · {levelPct}% there
                  </div>
                )}
              </section>

              {/* ─── CONCEPTS TOUCHED ─── */}
              {resultsConcepts.length > 0 && (
                <section className="prv2-card prv2-concepts-card">
                  <header className="prv2-card-head">
                    <h3 className="prv2-card-title">Concepts touched</h3>
                    <span className="prv2-card-sub">current mastery</span>
                  </header>
                  <div className="prv2-concepts">
                    {resultsConcepts.map(c => {
                      const acc = c.accuracy ?? 0
                      const isWeak = c.status === 'weak' || acc < 50
                      return (
                        <div key={c.slug} className={`prv2-concept-row ${isWeak ? 'is-weak' : ''}`}>
                          <div className="prv2-concept-name">
                            {c.name}
                            {isWeak && <span className="prv2-weak-badge">WEAK</span>}
                          </div>
                          <div className="prv2-concept-bar">
                            <div className="prv2-concept-fill"
                              style={{ width: `${Math.min(100, Math.max(0, acc))}%` }} />
                          </div>
                          <div className="prv2-concept-pct tabular">{acc}%</div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ─── PA'S NEXT MOVE ─── */}
              {paNextMove && (
                <section className="prv2-card prv2-next-card">
                  <header className="prv2-next-head">
                    <PaMascot size={32} mood="thinking" />
                    <div>
                      <div className="prv2-next-eyebrow">PA'S NEXT MOVE</div>
                      <div className="prv2-next-title">{paNextMove.copy}</div>
                    </div>
                  </header>
                </section>
              )}
            </div>

            {/* ─── RIGHT RAIL ─── */}
            <aside className="prv2-rail">
              <div className="prv2-rail-card prv2-rail-pa">
                <PaMascot size={36} mood="idle" />
                <div className="prv2-rail-text">
                  <div className="prv2-rail-title">Pa</div>
                  <div className="prv2-rail-sub">● Your AI study buddy</div>
                </div>
              </div>

              {homeData?.dailyChallenge && (
                <div className="prv2-rail-card prv2-quest">
                  <div className="prv2-quest-eyebrow">QUICK QUEST</div>
                  <div className="prv2-quest-title">
                    {homeData.dailyChallenge.subject} — {homeData.dailyChallenge.questionCount} questions
                  </div>
                  <div className="prv2-quest-meta t-xs">
                    <span>⏱ {Math.max(1, Math.ceil(homeData.dailyChallenge.questionCount * 0.8))} min</span>
                    <span>✦ +{homeData.dailyChallenge.xpReward} XP</span>
                  </div>
                  <button className="pd-btn primary sm" onClick={() => onNavigate?.('practice', { subject: homeData.dailyChallenge.subject })}>
                    Start quest →
                  </button>
                </div>
              )}

              <div className="prv2-rail-card prv2-suggest">
                <div className="prv2-quest-eyebrow">TRY ASKING PA</div>
                {[
                  'How does osmosis work?',
                  "Explain Newton's 3rd law",
                  'Quiz me on fractions',
                ].map((s, i) => (
                  <button key={i} type="button" className="prv2-suggest-row"
                    onClick={() => onNavigate?.('ask', { initialPrompt: s })}>
                    💬 {s}
                  </button>
                ))}
              </div>

              {homeData?.recentDoubts?.[0] && (
                <div className="prv2-rail-card prv2-resume">
                  <div className="prv2-quest-eyebrow">PICK UP WHERE YOU LEFT OFF</div>
                  <div className="prv2-resume-title">{homeData.recentDoubts[0].subject}</div>
                  <div className="prv2-resume-sub">{(homeData.recentDoubts[0].topic || '').slice(0, 60)}</div>
                  <button type="button" className="prv2-resume-cta"
                    onClick={() => onNavigate?.('ask')}>Resume →</button>
                </div>
              )}
            </aside>
          </div>
        </div>

        <FooterStrip
          xpToday={(homeData?.todayXP || 0) + xp}
          xpGoal={homeData?.dailyGoal || 50}
          /* FooterStrip expects { name, pct, color, delta? } per subject and
             { icon-as-string } per badge. homeData ships richer rows we have
             to flatten — otherwise React tries to render objects as children.
             Same shape used by StudentHomeScreenV4. */
          mastery={(homeData?.subjectHealth || [])
            .filter(s => s?.accuracy !== null && s?.accuracy !== undefined)
            .slice(0, 5)
            .map(s => ({
              name: s.subject,
              pct: s.accuracy,
              color: SUBJECT_COLOR[s.subject] || 'var(--c-muted)',
              delta: null,
            }))}
          badges={(homeData?.badges || []).map(b => b?.icon || '🏆')}
          totalBadges={homeData?.totalBadges || 24}
        />
      </div>
    )
  }

  // ══ QUIZ ══
  const chapterMeta = current.chapter_name || current.concept_slug || concept || ''
  return (
    <div className="home-v4 practice-v4">
      <HomeTopNav user={homeData?.profile} streak={homeData?.streak?.current_streak || 0} onNavigate={onNavigate} />

      <div className="pd-page">
        <div className="practice-header">
          <div className="practice-eyebrow">PRACTICE · MCQ IN PROGRESS</div>
          <div className="practice-counter t-sm">question {currentIdx + 1} of {totalQuestions}</div>
        </div>

        <div className="practice-strip-row">
          <QuestionStrip total={totalQuestions} currentIdx={currentIdx} answers={answers} />
          <div className="practice-strip-meta">
            <span className="t-xs">{(subject || '').toUpperCase()}{chapterMeta ? ` · ${chapterMeta.toString().toUpperCase()}` : ''}</span>
            <span className="timer-dot" />
            <span className="tabular timer-text">{formatMMSS(qSeconds)}</span>
            <button className="pd-btn ghost sm" onClick={() => setExitOpen(true)}>Exit</button>
          </div>
        </div>

        <div className="practice-body-grid">
          <div className="practice-main">
            <article className="practice-card">
              <header className="practice-card-head">
                <div className="chips">
                  <span className="pd-chip diff">Q{currentIdx + 1} · {DIFF_LABEL[current.difficulty] || 'MEDIUM'}</span>
                  <span className="pd-chip xp">+{currentXp} XP</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ListenButton
                    text={[
                      current.question,
                      current.hint_subtitle,
                      ...(current.options || []).map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`),
                    ].filter(Boolean).join('. ')}
                    title="Read question and options aloud"
                  />
                  <button className="practice-report" onClick={() => setReportOpen(true)}>
                    <Ico name="flag" size={14} /> Report
                  </button>
                </div>
              </header>

              <h2 className="practice-question">
                <MathText text={current.question || ''} />
              </h2>
              {current.hint_subtitle && (
                <p className="practice-question-sub">
                  <MathText text={current.hint_subtitle} inlineOnly />
                </p>
              )}

              <div className="practice-options">
                {(current.options || []).map((text, i) => (
                  <OptionCard
                    key={i}
                    idx={i}
                    text={text}
                    selected={selected === i}
                    submitted={submitted}
                    isCorrect={i === current.correctIndex}
                    isStudentChoice={selected === i}
                    onClick={handleSelect}
                  />
                ))}
              </div>

              {/* Explanation appears after submit */}
              {submitted && current.explanation && (
                <div className="practice-explanation">
                  <div className="explanation-title">Why:</div>
                  <p><MathText text={current.explanation} /></p>
                </div>
              )}
            </article>

            <div className="practice-actions-row">
              <HintBox hint={current.hint} />
              <div className="actions-right">
                {!submitted && (
                  <>
                    <button className="pd-btn ghost" onClick={handleSkip}>Skip</button>
                    <button className="pd-btn primary" disabled={selected === null} onClick={handleSubmit}>
                      Submit answer <Ico name="arrow" size={14} />
                    </button>
                  </>
                )}
                {submitted && (
                  <button className="pd-btn primary" onClick={handleNext}>
                    {isLast ? 'See results' : 'Next question'} <Ico name="arrow" size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right rail — reused from home */}
          <aside className="practice-rail">
            <PaStatusCard mood="thinking" subject={subject} />
            <AskPaSuggestions
              items={[
                current.question ? `Explain this question step by step` : 'Explain my last wrong answer',
                current.concept_slug ? `Give me a real-life example of ${current.concept_slug.replace(/-/g, ' ')}` : `Why is this concept in ${subject}?`,
                'Quiz me on a similar question',
              ]}
              onAsk={q => onNavigate?.('ask-ai', { question: q })}
            />
          </aside>
        </div>
      </div>

      {/* Footer strip reused — same XP + mastery ring as home */}
      <FooterStrip
        xpToday={homeData?.todayXP || 0}
        xpGoal={homeData?.dailyGoal || 50}
        week={[]}
        mastery={(homeData?.subjectHealth || []).filter(s => s.accuracy !== null).slice(0, 5).map(s => ({
          name: s.subject, pct: s.accuracy, color: 'var(--c-muted)', delta: null,
        }))}
        badges={(homeData?.badges || []).slice(0, 5).map(b => b.icon || '🏆')}
        totalBadges={homeData?.totalBadges || 15}
      />

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReport} />
      <ExitConfirm open={exitOpen} onStay={() => setExitOpen(false)} onLeave={handleExitConfirmed} />
    </div>
  )
}

// ─── ScoreRing ────────────────────────────────────────────────────────────
// Small circular % indicator used on the dark hero card. Pure SVG; tone
// drives stroke colour. Inline so the results page is one cohesive file.
function ScoreRing({ pct, tone = 'green' }) {
  const size = 108
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c
  const colors = { green: '#36D399', amber: '#FFB547', coral: '#FF4D8B' }
  const colour = colors[tone] || colors.green
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${pct}% accuracy`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={colour} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle"
        fontSize={22} fill="white" fontWeight={800} fontFamily="Lexend Deca, system-ui, sans-serif">
        {pct}%
      </text>
      <text x={size / 2} y={size / 2 + 24} textAnchor="middle"
        fontSize={9} fill="rgba(255,255,255,0.6)" fontWeight={700} letterSpacing={1.4}
        fontFamily="Lexend Deca, system-ui, sans-serif">
        ACCURACY
      </text>
    </svg>
  )
}
