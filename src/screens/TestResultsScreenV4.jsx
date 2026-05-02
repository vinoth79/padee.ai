// ═══════════════════════════════════════════════════════════════════════════
// TestResultsScreenV4 — post-submit results, redesigned (Apr 26 mockup).
// ═══════════════════════════════════════════════════════════════════════════
// Sections (anchor-linked):
//   #score      — Hero: ring + tone-aware headline + comparison line + reward
//   #breakdown  — Question-by-question grid + What went wrong + Concept mastery
//   #debrief    — Pa's debrief sidebar (right column on desktop)
//
// Same data flow as before: read sessionStorage['padee-test-result'] for a
// fresh submit, OR fetch /api/test/session/:id for review of a past test.
// Class-rank / class-avg / last-attempt fields are rendered conditionally —
// they degrade to absent without breaking layout. Backend can extend later.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronRight, MessageCircle, X } from 'lucide-react'
import MathText from '../components/ui/MathText'
import ListenButton from '../components/ui/ListenButton'
import PaMascot from '../components/home-v4/PaMascot'
import HomeTopNav from '../components/home-v4/HomeTopNav'
import FooterStrip from '../components/home-v4/FooterStrip'
import { useUser } from '../context/UserContext'

// Split summary text into paragraphs on blank lines (LLM produces \n\n separators)
function splitParagraphs(text) {
  if (!text) return []
  return String(text).split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
}

function ListenDebriefButton({ text }) {
  if (!text || text.length < 30) return null
  return (
    <div className="debrief-listen">
      <ListenButton text={text} variant="labeled" size="sm" title="Listen to Pa's debrief" />
    </div>
  )
}
import '../styles/home-v4.css'
import '../styles/test-results-v4.css'

const LETTERS = ['A', 'B', 'C', 'D']

// Tone-aware grade label rendered as the hero headline.
function toneHeadline(accuracy) {
  if (accuracy >= 95) return { tag: 'A+', text: 'Outstanding. Nearly perfect.' }
  if (accuracy >= 90) return { tag: 'A',  text: 'Excellent — clear command of the material.' }
  if (accuracy >= 80) return { tag: 'B+', text: 'Solid work. A few small gaps to firm up.' }
  if (accuracy >= 70) return { tag: 'B',  text: 'Good baseline. Let\'s tighten a couple of concepts.' }
  if (accuracy >= 50) return { tag: 'C',  text: 'On the right track — but real revision needed.' }
  return                      { tag: 'D',  text: 'Tough one. Let\'s go back to basics together.' }
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

function fmtDuration(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m} min ${s > 0 ? `${s}s` : ''}`.trim()
}

function fmtSubmittedDate(d) {
  if (!d) return null
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()
  } catch { return null }
}

export default function TestResultsScreenV4({ onNavigate }) {
  const user = useUser()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('sessionId')

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    async function load() {
      const stored = sessionStorage.getItem('padee-test-result')
      if (stored && !sessionIdFromUrl) {
        try {
          const r = JSON.parse(stored)
          r.submittedAt = r.submittedAt || new Date().toISOString()
          if (cancelled) return
          setResult(r); setLoading(false)
          // Clear sessionStorage AFTER a successful read (was previously
          // in the effect cleanup, which fired in React 18 StrictMode
          // between mount and re-mount — wiping the data before the
          // second mount could read it, leaving the screen stuck on
          // "No test result to show" in dev).
          sessionStorage.removeItem('padee-test-result')
          return
        } catch {}
      }
      if (sessionIdFromUrl) {
        const token = getToken()
        if (!token) { setError('Not signed in'); setLoading(false); return }
        try {
          const r = await fetch(`/api/test/session/${sessionIdFromUrl}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
          })
          const data = await r.json()
          if (cancelled) return
          if (!r.ok) throw new Error(data.error || 'Not found')
          // Use ?? not || so a legitimate 0-question test (edge case)
          // doesn't fall through to questions.length — and a score of 0
          // is preserved rather than treated as missing.
          const totalQuestions = data.total_marks ?? data.questions?.length ?? 0
          const correctCount = data.score ?? 0
          const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
          setResult({
            sessionId: data.id,
            accuracy, correctCount, totalQuestions,
            xpAwarded: 0, bonusAwarded: false,
            aiInsights: data.ai_insights || {},
            questions: data.questions || [],
            subject: data.subject, title: data.title,
            timeTakenSeconds: data.time_taken_seconds,
            submittedAt: data.completed_at || data.created_at,
            autoSubmitted: false, isReview: true,
          })
        } catch (err) {
          if (cancelled || err?.name === 'AbortError') return
          setError(err.message || 'Failed to load')
        }
        if (!cancelled) setLoading(false)
        return
      }
      if (!cancelled) { setError('No test result to show'); setLoading(false) }
    }
    load()
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [sessionIdFromUrl])

  // ─── Stages ───
  if (loading || error || !result) {
    return (
      <div className="home-v4 test-results-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <HomeTopNav user={user.homeData?.profile} streak={user.homeData?.streak?.current_streak || 0} active="tests" onNavigate={onNavigate} />
        <div className="results-stage">
          <PaMascot size={56} mood="thinking" />
          <h1 className="t-h2" style={{ marginTop: 14 }}>{loading ? 'Loading your results…' : (error || 'No result')}</h1>
          {!loading && (
            <button className="pd-btn primary" onClick={() => onNavigate?.('tests')} style={{ marginTop: 18 }}>
              Back to tests
            </button>
          )}
        </div>
      </div>
    )
  }

  return <ResultsBody result={result} user={user} onNavigate={onNavigate} />
}

// ═══════════════════════════════════════════════════════════════════════════
// Body — separated so we can use hooks confidently after the loading guard.
// ═══════════════════════════════════════════════════════════════════════════
function ResultsBody({ result, user, onNavigate }) {
  const {
    accuracy, correctCount, totalQuestions, xpAwarded, bonusAwarded,
    aiInsights = {}, questions = [], subject, title, timeTakenSeconds,
    submittedAt, totalAllottedSeconds, autoSubmitted, isReview, classRank, classAvg,
    lastAttemptAccuracy,
  } = result

  // Per-question stats. Trust the server-stored `correct` flag — it was
  // set authoritatively at /test/complete time (commit 1c275cd) using the
  // canonical correctIndex. Recomputing here would just duplicate the
  // server's grading logic and risk divergence (e.g., if grading rules
  // ever extend to partial credit). We still derive `skipped` locally
  // since the server doesn't surface a dedicated skipped flag — `null`
  // studentAnswer is the canonical signal.
  const perQuestion = useMemo(() => questions.map((q, i) => {
    const skipped = q.studentAnswer == null
    const correct = !skipped && q.correct === true
    return { ...q, idx: i, skipped, correct }
  }), [questions])

  const correctCnt = perQuestion.filter(q => q.correct).length
  const wrongCnt = perQuestion.filter(q => !q.correct && !q.skipped).length
  const skippedCnt = perQuestion.filter(q => q.skipped).length
  const wrongList = perQuestion.filter(q => !q.correct && !q.skipped)

  // Concept-mastery row, derived from per-question topic correctness
  const conceptRows = useMemo(() => {
    const map = new Map()
    for (const q of perQuestion) {
      const t = q.topic || 'General'
      if (!map.has(t)) map.set(t, { topic: t, total: 0, correct: 0 })
      const e = map.get(t)
      e.total++
      if (q.correct) e.correct++
    }
    return Array.from(map.values()).sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
  }, [perQuestion])

  const headline = toneHeadline(accuracy)
  const submittedLabel = fmtSubmittedDate(submittedAt)
  const timeLabel = fmtDuration(timeTakenSeconds)
  const timeOfLabel = totalAllottedSeconds ? ` of ${Math.round(totalAllottedSeconds / 60)}` : ''

  // ─── CTA handlers ───
  function relearnTopic(topic) {
    if (!topic) { onNavigate?.('learn'); return }
    onNavigate?.('learn', { subject, topic })
  }
  function explainQuestion(q) {
    // Pre-fill Ask AI with the wrong question + selected option for context.
    // Defensive on options indexing: a malformed/legacy session row could
    // have studentAnswer or correctIndex out of range; "(option missing)"
    // is preferable to "undefined" leaking into the prompt.
    const opts = Array.isArray(q.options) ? q.options : []
    const inRange = (i) => typeof i === 'number' && i >= 0 && i < opts.length
    const studentLetter = inRange(q.studentAnswer) ? LETTERS[q.studentAnswer] : null
    const studentPick = inRange(q.studentAnswer) ? opts[q.studentAnswer] : '(option missing)'
    const correctLetter = inRange(q.correctIndex) ? LETTERS[q.correctIndex] : '?'
    const ctx = `I got this test question wrong: "${q.question}"\n` +
      (studentLetter ? `I picked ${studentLetter} (${studentPick}). ` : 'I skipped it. ') +
      `The correct answer was ${correctLetter}. Can you walk me through it?`
    onNavigate?.('ask-ai', { question: ctx, subject })
  }

  return (
    <div className="home-v4 test-results-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...(user.homeData?.profile || {}), level: user.level || 1 }}
        streak={user.homeData?.streak?.current_streak || 0}
        active="tests"
        onNavigate={onNavigate}
      />

      <div className="results-page">
        {/* ─── Page header + anchor nav ─── */}
        <header className="results-page-head">
          <div>
            <p className="t-eyebrow">TEST RESULT</p>
            <h1 className="results-title">{title || 'Test'} {subject && <span className="title-sub">· {subject}</span>}</h1>
          </div>
          <nav className="results-anchors" aria-label="Result sections">
            <a href="#score">score</a>
            <span>·</span>
            <a href="#breakdown">breakdown</a>
            <span>·</span>
            <a href="#debrief">pa's debrief</a>
          </nav>
        </header>

        {/* ─── Hero ─── */}
        <section id="score" className="hero-card">
          <ScoreRing pct={accuracy} correct={correctCount} total={totalQuestions} />
          <div className="hero-mid">
            <p className="hero-eyebrow">
              {isReview ? 'REVIEWING' : 'SUBMITTED'}
              {submittedLabel && <> · {submittedLabel}</>}
              {timeLabel && <> · {timeLabel}{timeOfLabel}</>}
              {autoSubmitted && <> · TIME RAN OUT</>}
            </p>
            <h2 className="hero-headline">
              <span className="hero-grade">{headline.tag}.</span> {headline.text}
              {wrongList.length > 0 && wrongList[0].topic && (
                <> You nailed most of it but missed the {wrongList[0].topic} nuance.</>
              )}
            </h2>
            <p className="hero-subline">
              {classRank != null && totalQuestions > 0 && (
                <>Rank <b>{classRank} of {result.classSize || '—'}</b> in class</>
              )}
              {classRank != null && lastAttemptAccuracy != null && <span> · </span>}
              {lastAttemptAccuracy != null && (
                <>beats your last attempt by <b className={accuracy >= lastAttemptAccuracy ? 'pos' : 'neg'}>{accuracy >= lastAttemptAccuracy ? '+' : ''}{accuracy - lastAttemptAccuracy}%</b></>
              )}
              {(classRank != null || lastAttemptAccuracy != null) && classAvg != null && <span> · </span>}
              {classAvg != null && (
                <>{accuracy >= classAvg ? 'passes' : 'below'} class average of <b>{classAvg}%</b></>
              )}
              {classRank == null && lastAttemptAccuracy == null && classAvg == null && (
                <>{correctCnt} correct, {wrongCnt} wrong{skippedCnt ? `, ${skippedCnt} skipped` : ''}.</>
              )}
            </p>
          </div>
          <div className="hero-rewards">
            {!isReview && xpAwarded > 0 && (
              <div className="reward-pill">
                <span className="rp-spark">✦</span>
                <span className="rp-num">+{xpAwarded} XP</span>
                {bonusAwarded && <span className="rp-bonus">(+20 bonus)</span>}
              </div>
            )}
            {!isReview && bonusAwarded && (
              <div className="badge-unlock">
                <span className="bu-icon">🎯</span>
                <span>New badge unlocked · <b>Sharpshooter</b></span>
              </div>
            )}
          </div>
        </section>

        {/* ─── Two-col: breakdown + Pa debrief ─── */}
        <div className="results-grid">
          <main className="results-main">
            {/* Question-by-question breakdown */}
            <section id="breakdown" className="breakdown-card">
              <header className="breakdown-head">
                <p className="t-eyebrow">QUESTION-BY-QUESTION</p>
                <p className="breakdown-counts">
                  <span className="cc-correct">{correctCnt} correct</span> ·
                  <span className="cc-wrong"> {wrongCnt} wrong</span>
                  {skippedCnt > 0 && <> · <span className="cc-skip">{skippedCnt} skipped</span></>}
                </p>
                <button className="review-all" onClick={() => document.getElementById('full-review')?.scrollIntoView({ behavior: 'smooth' })}>
                  Review all {totalQuestions} <ChevronRight size={14} />
                </button>
              </header>
              <div className="q-grid">
                {perQuestion.map(q => (
                  <QuestionTile key={q.idx} q={q} onClick={() => explainQuestion(q)} />
                ))}
              </div>
            </section>

            {/* What went wrong */}
            {wrongList.length > 0 && (
              <section className="went-wrong-section">
                <p className="t-eyebrow">WHAT WENT WRONG</p>
                <div className="went-wrong-list">
                  {wrongList.slice(0, 4).map(q => (
                    <WentWrongRow key={q.idx} q={q} onRelearn={() => relearnTopic(q.topic)} onExplain={() => explainQuestion(q)} />
                  ))}
                </div>
              </section>
            )}

            {/* Concept mastery updated */}
            {conceptRows.length > 0 && (
              <section className="concept-mastery-section">
                <p className="t-eyebrow">CONCEPT MASTERY UPDATED · {conceptRows.length} CONCEPTS TOUCHED</p>
                <div className="concept-grid">
                  {conceptRows.slice(0, 6).map(c => (
                    <ConceptMasteryCard key={c.topic} concept={c} onClick={() => relearnTopic(c.topic)} />
                  ))}
                </div>
              </section>
            )}

            {/* Full review (anchor target for "Review all 15 →") */}
            <section id="full-review" className="full-review-section">
              <details className="full-review">
                <summary>Show all {totalQuestions} questions with answers + explanations</summary>
                <div className="review-list">
                  {perQuestion.map(q => <ReviewItem key={q.idx} q={q} />)}
                </div>
              </details>
            </section>
          </main>

          {/* Pa's debrief sidebar */}
          <aside id="debrief" className="debrief-card">
            <header className="debrief-head">
              <PaMascot size={40} mood="speaking" syncWithSpeech />
              <div>
                <p className="t-eyebrow" style={{ color: '#8A5A00' }}>PA'S DEBRIEF</p>
                <h3 className="debrief-title">Here's what I noticed</h3>
              </div>
            </header>

            {/* Per-topic stat strip — visible summary of which topics aced vs slipped */}
            {aiInsights.topicStats?.length > 0 && (
              <div className="debrief-stats">
                {aiInsights.topicStats.map(s => {
                  const ratio = s.total > 0 ? s.correct / s.total : 0
                  const tone = ratio === 1 ? 'aced' : ratio >= 0.5 ? 'mid' : 'slipped'
                  return (
                    <span key={s.topic} className={`ds-chip ds-${tone}`}>
                      {s.topic} <b>{s.correct}/{s.total}</b>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Multi-paragraph debrief — split on blank lines */}
            <div className="debrief-body">
              {aiInsights.summary
                ? splitParagraphs(aiInsights.summary).map((para, i) => (
                    <p key={i}><MathText text={para} inlineOnly /></p>
                  ))
                : <p>You got <b>{correctCnt}</b> out of {totalQuestions} right. Open the breakdown on the left to see which concepts to revisit.</p>
              }
            </div>

            <ListenDebriefButton text={aiInsights.summary} />

            <div className="debrief-cta-row">
              {wrongList.length > 0 ? (
                <>
                  <button className="debrief-cta primary" onClick={() => explainQuestion(wrongList[0])}>
                    <MessageCircle size={14} /> Explain Q{wrongList[0].idx + 1}
                  </button>
                  {aiInsights.weakTopics?.[0] && (
                    <button className="debrief-cta ghost" onClick={() => relearnTopic(aiInsights.weakTopics[0])} title={`Re-learn ${aiInsights.weakTopics[0]}`}>
                      Re-learn
                    </button>
                  )}
                </>
              ) : (
                <button className="debrief-cta primary" onClick={() => onNavigate?.('home')}>
                  Back home <ArrowRight size={14} />
                </button>
              )}
            </div>
          </aside>
        </div>

        {/* Bottom action row */}
        <div className="results-bottom-actions">
          <button className="pd-btn ghost" onClick={() => onNavigate?.('tests')}>
            <ArrowLeft size={14} /> Back to tests
          </button>
          {(aiInsights.weakTopics?.length > 0 || accuracy < 70) && (
            <button className="pd-btn primary" onClick={() => onNavigate?.('practice', { subject })}>
              Practice weak spots <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      <FooterStrip
        xpToday={user.homeData?.todayXP || 0}
        xpGoal={user.homeData?.dailyGoal || 50}
        week={[]}
        mastery={(user.homeData?.subjectHealth || []).filter(s => s.accuracy !== null).slice(0, 5).map(s => ({
          name: s.subject, pct: s.accuracy, color: 'var(--c-muted)', delta: null,
        }))}
        badges={(user.homeData?.badges || []).slice(0, 5).map(b => b.icon || '🏆')}
        totalBadges={user.homeData?.totalBadges || 15}
      />
    </div>
  )
}

// ─── Score ring (used in hero) ────────────────────────────────────────
function ScoreRing({ pct, correct, total }) {
  const r = 58
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100)
  const color = pct >= 80 ? '#36D399' : pct >= 50 ? '#FFB547' : '#FF4D8B'
  return (
    <div className="hero-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
      </svg>
      <div className="hero-ring-text tabular">
        <div className="hr-pct">{pct}%</div>
        <div className="hr-frac">{correct}/{total}</div>
      </div>
    </div>
  )
}

// ─── Question tile in the breakdown grid ──────────────────────────────
function QuestionTile({ q, onClick }) {
  const status = q.skipped ? 'skipped' : q.correct ? 'correct' : 'wrong'
  return (
    <button className={`q-tile state-${status}`} onClick={onClick} title={q.topic || `Question ${q.idx + 1}`}>
      <div className="qt-head">
        <span className="qt-num">Q{q.idx + 1}</span>
        <span className="qt-mark">
          {status === 'correct' && <Check size={12} />}
          {status === 'wrong' && <X size={12} />}
          {status === 'skipped' && '—'}
        </span>
      </div>
      <div className="qt-topic">{q.topic || '—'}</div>
    </button>
  )
}

// ─── What-went-wrong row ──────────────────────────────────────────────
function WentWrongRow({ q, onRelearn, onExplain }) {
  const opts = Array.isArray(q.options) ? q.options : []
  const inRange = (i) => typeof i === 'number' && i >= 0 && i < opts.length
  const studentLetter = inRange(q.studentAnswer) ? LETTERS[q.studentAnswer] : null
  const studentPick = inRange(q.studentAnswer) ? opts[q.studentAnswer] : '(option missing)'
  const correctLetter = inRange(q.correctIndex) ? LETTERS[q.correctIndex] : '?'
  const correctText = q.explanation || (inRange(q.correctIndex) ? opts[q.correctIndex] : '')
  return (
    <div className="ww-row">
      <span className="ww-num">Q{q.idx + 1}</span>
      <div className="ww-body">
        <div className="ww-title">
          <span className="ww-topic">{q.topic || 'Concept'}</span>
          <span className="ww-q-snippet">· "<MathText text={(q.question || '').slice(0, 60)} inlineOnly />{q.question?.length > 60 ? '…' : ''}"</span>
        </div>
        <p className="ww-explain">
          {studentLetter
            ? <>You picked <b>{studentLetter}</b> ("{studentPick}"). </>
            : <>You skipped this. </>}
          Correct answer: <b>{correctLetter}</b> — <MathText text={correctText} inlineOnly />
        </p>
      </div>
      <div className="ww-actions">
        <button className="ww-btn primary" onClick={onRelearn}>Re-learn</button>
        <button className="ww-btn ghost" onClick={onExplain} title="Ask Pa about this">
          <MessageCircle size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Concept mastery card (updated post-test) ────────────────────────
function ConceptMasteryCard({ concept, onClick }) {
  const ratio = concept.correct / concept.total
  const tone = ratio >= 0.8 ? 'mastered' : ratio >= 0.5 ? 'learning' : 'weak'
  const label = ratio >= 0.8 ? '✓ Mastered' : ratio >= 0.5 ? 'Almost there' : '⚠ Needs work'
  return (
    <button className={`concept-card state-${tone}`} onClick={onClick}>
      <div className="cm-frac tabular">{concept.correct}/{concept.total}</div>
      <div className="cm-info">
        <div className="cm-topic">{concept.topic}</div>
        <div className="cm-label">{label}</div>
      </div>
      <ChevronRight size={16} className="cm-chev" />
    </button>
  )
}

// ─── Inline review item (collapsed by default) ───────────────────────
function ReviewItem({ q }) {
  return (
    <div className={`fr-item ${q.correct ? 'is-correct' : q.skipped ? 'is-skipped' : 'is-wrong'}`}>
      <div className="fr-head">
        <span className="fr-num">Q{q.idx + 1}</span>
        <span className="fr-status">
          {q.correct ? <Check size={12} /> : q.skipped ? '—' : <X size={12} />}
        </span>
        <span className="fr-q"><MathText text={q.question || ''} inlineOnly /></span>
      </div>
      <div className="fr-body">
        {(q.options || []).map((opt, i) => {
          const isStudent = q.studentAnswer === i
          const isCorrect = q.correctIndex === i
          const cls = ['fr-opt',
            isCorrect ? 'is-answer' : '',
            isStudent && !isCorrect ? 'is-wrong-pick' : '',
            isStudent && isCorrect ? 'is-correct-pick' : ''].filter(Boolean).join(' ')
          return (
            <div key={i} className={cls}>
              <span className="fr-letter">{LETTERS[i]}</span>
              <span className="fr-opt-text"><MathText text={opt} inlineOnly /></span>
              {isCorrect && <span className="fr-tag answer">CORRECT</span>}
              {isStudent && !isCorrect && <span className="fr-tag wrong">YOUR PICK</span>}
            </div>
          )
        })}
        {q.explanation && (
          <div className="fr-why">
            <span className="fr-why-label">WHY</span>
            <p><MathText text={q.explanation} /></p>
          </div>
        )}
      </div>
    </div>
  )
}
