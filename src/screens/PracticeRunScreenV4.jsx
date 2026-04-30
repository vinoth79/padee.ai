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
      ? [...answers, { questionIdx: currentIdx, selectedIdx: selected, correct: selected === current.correctIndex, skipped: false }]
      : answers
    const correct = allAnswers.filter(a => a.correct).length

    setPhase('results')
    if (!sessionId) {
      // Defensive: no session means we can't ask the server to grade. Show
      // local-only stats so the student isn't dropped off a cliff.
      setResults({ accuracy: Math.round((correct / totalQuestions) * 100), xpAwarded: 0, correctCount: correct })
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
    } catch {
      setResults({ accuracy: Math.round((correct / totalQuestions) * 100), xpAwarded: 0, correctCount: correct })
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
  if (phase === 'loading') {
    return (
      <div className="home-v4 practice-v4">
        <HomeTopNav user={homeData?.profile} streak={homeData?.streak?.current_streak || 0} onNavigate={onNavigate} />
        <div className="pd-page">
          <div className="practice-loading">
            <div className="practice-eyebrow">GENERATING QUESTIONS</div>
            <div className="t-h2" style={{ marginTop: 6 }}>{concept ? 'Preparing your targeted practice…' : `${subject} practice in progress…`}</div>
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
    return (
      <div className="home-v4 practice-v4">
        <HomeTopNav user={homeData?.profile} streak={homeData?.streak?.current_streak || 0} onNavigate={onNavigate} />
        <div className="pd-page">
          <div className="practice-results">
            <div className="practice-eyebrow">PRACTICE COMPLETE</div>
            <div className="t-h1" style={{ marginTop: 4 }}>You got {correct} of {total} right</div>
            <div className="results-stats">
              <div className="stat">
                <div className="stat-value tabular">{accuracy}%</div>
                <div className="stat-label">Accuracy</div>
              </div>
              <div className="stat">
                <div className="stat-value tabular">+{xp} XP</div>
                <div className="stat-label">Earned</div>
              </div>
              <div className="stat">
                <div className="stat-value tabular">{correct}/{total}</div>
                <div className="stat-label">Correct</div>
              </div>
            </div>
            <div className="results-actions">
              <button className="pd-btn ghost" onClick={() => onNavigate?.('home')}>Back to home</button>
              <button className="pd-btn primary" onClick={() => {
                setPhase('loading'); setQuestions([]); setCurrentIdx(0); setAnswers([]); setResults(null); setSelected(null); setSubmitted(false)
              }}>Practice again</button>
            </div>
          </div>
        </div>
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
