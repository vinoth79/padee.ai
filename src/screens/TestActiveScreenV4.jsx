// ═══════════════════════════════════════════════════════════════════════════
// TestActiveScreenV4 — timed exam mode (v4 redesign).
// ═══════════════════════════════════════════════════════════════════════════
// Same end-to-end flow as v3 TestActiveScreen.jsx — calls /api/test/start,
// runs a countdown, lets the student answer/flag/navigate, calls
// /api/test/complete on submit. Visual layer rebuilt to match v4 (Lexend
// Deca, coral primary, ink-shadow buttons, MathText for KaTeX in questions
// and options).
//
// Phase machine: loading → active → submitting → results (via navigation).
// Test params come from sessionStorage['padee-test-start'] — set by the
// list screen before navigating here.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useUser } from '../context/UserContext'
import { ArrowLeft, ArrowRight, Flag, Menu, X } from 'lucide-react'
import MathText from '../components/ui/MathText'
import PaMascot from '../components/home-v4/PaMascot'
import '../styles/home-v4.css'
import '../styles/test-v4.css'

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null }
  catch { return null }
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function TestActiveScreenV4({ onNavigate }) {
  const user = useUser()

  // ─── Test state ───
  const [phase, setPhase] = useState('loading')   // loading | active | submitting | error
  const [testMeta, setTestMeta] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selections, setSelections] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [remainingSecs, setRemainingSecs] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [error, setError] = useState('')

  const startTimeRef = useRef(null)
  const submittedRef = useRef(false)

  // ─── Mount: read params from sessionStorage, hit /api/test/start ───
  useEffect(() => {
    let cancelled = false
    async function load() {
      const stored = sessionStorage.getItem('padee-test-start')
      if (!stored) {
        setError('No test parameters. Go back and pick a test.')
        setPhase('error')
        return
      }
      const params = JSON.parse(stored)
      const token = getToken()
      if (!token) { setError('Not signed in'); setPhase('error'); return }
      try {
        const r = await fetch('/api/test/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        })
        const data = await r.json()
        if (cancelled) return
        if (!r.ok) { setError(data.error || 'Failed to start'); setPhase('error'); return }
        if (!data.questions?.length || !data.sessionId) {
          setError(data.sessionId ? 'No questions returned' : 'Missing test session')
          setPhase('error')
          return
        }
        setTestMeta({
          sessionId: data.sessionId,
          mode: data.mode,
          title: data.title,
          subject: data.subject,
          classLevel: data.classLevel,
          difficulty: data.difficulty,
          secondsPerQuestion: data.secondsPerQuestion,
          assignmentId: data.assignmentId,
        })
        setQuestions(data.questions)
        setRemainingSecs(data.totalSeconds)
        startTimeRef.current = Date.now()
        setPhase('active')
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed'); setPhase('error') }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ─── Countdown timer ───
  useEffect(() => {
    if (phase !== 'active') return
    if (remainingSecs <= 0) { handleSubmit(true); return }
    const timer = setInterval(() => {
      setRemainingSecs(s => {
        if (s <= 1) {
          clearInterval(timer)
          setTimeout(() => handleSubmit(true), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ─── Warn-on-unload while active ───
  useEffect(() => {
    if (phase !== 'active') return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  // ─── Handlers ───
  function selectOption(optIdx) {
    setSelections(prev => ({ ...prev, [currentIdx]: optIdx }))
  }
  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev)
      if (next.has(currentIdx)) next.delete(currentIdx)
      else next.add(currentIdx)
      return next
    })
  }
  function goTo(idx) {
    if (idx < 0 || idx >= questions.length) return
    setCurrentIdx(idx)
    setDrawerOpen(false)
  }
  function goPrev() { goTo(currentIdx - 1) }
  function goNext() { goTo(currentIdx + 1) }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return
    submittedRef.current = true
    setPhase('submitting')

    const timeTakenSeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0
    // Server-side grading: send only the sessionId + selectedIdx per question.
    // The canonical correctIndex never reached the browser (stripped by /start),
    // so we can't (and don't need to) compute correctness client-side.
    const answers = questions.map((_, i) => ({
      questionIdx: i,
      selectedIdx: selections[i] ?? null,
    }))

    const token = getToken()
    try {
      const r = await fetch('/api/test/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: testMeta.sessionId,
          answers,
          timeTakenSeconds,
        }),
      })
      const data = await r.json()
      sessionStorage.removeItem('padee-test-start')
      if (!r.ok) throw new Error(data.error || 'Submit failed')
      user.refreshUser?.()
      sessionStorage.setItem('padee-test-result', JSON.stringify({
        sessionId: data.sessionId,
        accuracy: data.accuracy,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        xpAwarded: data.xpAwarded,
        bonusAwarded: data.bonusAwarded,
        aiInsights: data.aiInsights,
        questions: data.questions,
        subject: testMeta.subject,
        title: testMeta.title,
        timeTakenSeconds,
        autoSubmitted: auto,
      }))
      onNavigate('test-results')
    } catch (err) {
      console.error('[Test] submit error:', err)
      setError(err.message || 'Submission failed')
      setPhase('error')
    }
  }

  // ═══ LOADING / SUBMITTING ═══
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="home-v4 test-v4">
        <Header minimal />
        <div className="test-stage-msg">
          <PaMascot size={56} mood="thinking" />
          <h1 className="t-h2" style={{ marginTop: 14 }}>
            {phase === 'loading' ? 'Preparing your test…' : 'Scoring your answers…'}
          </h1>
          <div className="test-loading-dots">
            {[0, 1, 2].map(i => <span key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}
          </div>
          {phase === 'submitting' && (
            <p className="t-sm" style={{ marginTop: 10 }}>Pa is reviewing each question.</p>
          )}
        </div>
      </div>
    )
  }

  // ═══ ERROR ═══
  if (phase === 'error') {
    return (
      <div className="home-v4 test-v4">
        <Header minimal />
        <div className="test-stage-msg">
          <PaMascot size={56} mood="thinking" />
          <h1 className="t-h2" style={{ marginTop: 14 }}>Something went wrong</h1>
          <p className="t-sm" style={{ marginTop: 6 }}>{error}</p>
          <div className="test-error-actions">
            <button className="pd-btn ghost" onClick={() => onNavigate('tests')}>Back to tests</button>
            <button className="pd-btn primary" onClick={() => onNavigate('home')}>Home</button>
          </div>
        </div>
      </div>
    )
  }

  // ═══ ACTIVE ═══
  const current = questions[currentIdx]
  const answeredCount = Object.keys(selections).length
  const flaggedCount = flagged.size
  const progressPct = Math.round((answeredCount / questions.length) * 100)
  const isLow = remainingSecs < 60
  const isUrgent = remainingSecs < 180
  const timerColor = isLow ? '#E85D75' : isUrgent ? '#FFB547' : 'var(--c-green)'

  return (
    <div className="home-v4 test-v4">
      <Header
        title={testMeta?.title}
        timeText={fmtTime(remainingSecs)}
        timerColor={timerColor}
        timerLabel={isLow ? 'Hurry!' : isUrgent ? 'Almost done' : 'Time left'}
        onMenu={() => setDrawerOpen(true)}
        onExit={() => setConfirmExit(true)}
        progressPct={progressPct}
      />

      <div className="test-page">
        <div className="test-strip-row">
          <QuestionStrip total={questions.length} currentIdx={currentIdx}
            selections={selections} flagged={flagged} onJump={goTo} />
          <div className="test-strip-meta">
            <span className="t-xs">
              <b className="tabular" style={{ color: 'var(--c-ink)' }}>{answeredCount}</b>/{questions.length} answered
              {flaggedCount > 0 && <> · <b style={{ color: '#FFB547' }}>{flaggedCount}</b> flagged</>}
            </span>
          </div>
        </div>

        <article className="test-card">
          <header className="test-card-head">
            <div className="chips">
              <span className="pd-chip ink">Q{currentIdx + 1} of {questions.length}</span>
              {current.difficulty && (
                <span className="pd-chip diff">{String(current.difficulty).toUpperCase()}</span>
              )}
            </div>
            <button
              className={`flag-btn ${flagged.has(currentIdx) ? 'is-flagged' : ''}`}
              onClick={toggleFlag}
              title={flagged.has(currentIdx) ? 'Unflag this question' : 'Flag for review'}>
              <Flag size={14} />
              {flagged.has(currentIdx) ? 'Flagged' : 'Flag'}
            </button>
          </header>

          <h2 className="test-question">
            <MathText text={current.question || ''} />
          </h2>

          <div className="test-options">
            {(current.options || []).map((opt, i) => {
              const isSelected = selections[currentIdx] === i
              return (
                <button key={i}
                  className={`test-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => selectOption(i)}>
                  <span className="opt-letter">{LETTERS[i]}</span>
                  <span className="opt-text"><MathText text={opt} inlineOnly /></span>
                  {isSelected && <span className="opt-mark">✓</span>}
                </button>
              )
            })}
          </div>
        </article>

        <div className="test-actions">
          <button className="pd-btn ghost" onClick={goPrev} disabled={currentIdx === 0}>
            <ArrowLeft size={14} /> Previous
          </button>
          {currentIdx < questions.length - 1 ? (
            <button className="pd-btn primary" onClick={goNext}>
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button className="pd-btn primary" onClick={() => setConfirmSubmit(true)}>
              Submit test <ArrowRight size={14} />
            </button>
          )}
          <button className="pd-btn ghost mobile-submit" onClick={() => setConfirmSubmit(true)}>
            Submit
          </button>
        </div>
      </div>

      {/* ─── Drawer with all questions ─── */}
      {drawerOpen && (
        <Modal onClose={() => setDrawerOpen(false)}>
          <div className="modal-head">
            <h3 className="modal-title">Jump to a question</h3>
            <button className="modal-close" onClick={() => setDrawerOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="modal-sub">
            <span className="legend-dot is-answered" /> answered
            <span className="legend-dot is-flagged" /> flagged
            <span className="legend-dot is-blank" /> not yet
          </p>
          <div className="drawer-grid">
            {questions.map((_, i) => {
              const answered = selections[i] != null
              const isFlag = flagged.has(i)
              const isCurrent = i === currentIdx
              const cls = [
                'drawer-cell',
                isCurrent ? 'is-current' : '',
                answered ? 'is-answered' : '',
                isFlag ? 'is-flagged' : '',
              ].filter(Boolean).join(' ')
              return (
                <button key={i} className={cls} onClick={() => goTo(i)}>
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="modal-actions">
            <button className="pd-btn ghost" onClick={() => setDrawerOpen(false)}>Close</button>
            <button className="pd-btn primary" onClick={() => { setDrawerOpen(false); setConfirmSubmit(true) }}>
              Submit test
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Submit confirm ─── */}
      {confirmSubmit && (
        <Modal onClose={() => setConfirmSubmit(false)}>
          <h3 className="modal-title">Submit your test?</h3>
          <p className="modal-sub">
            <b style={{ color: 'var(--c-ink)' }}>{answeredCount}</b> of {questions.length} answered.
            {questions.length - answeredCount > 0 && (
              <> <b style={{ color: 'var(--c-accent)' }}>{questions.length - answeredCount}</b> unanswered will be marked wrong.</>
            )}
            {flaggedCount > 0 && <> {flaggedCount} flagged for review.</>}
          </p>
          <div className="modal-actions">
            <button className="pd-btn ghost" onClick={() => setConfirmSubmit(false)}>
              Keep going
            </button>
            <button className="pd-btn primary" onClick={() => { setConfirmSubmit(false); handleSubmit(false) }}>
              Submit now
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Exit confirm ─── */}
      {confirmExit && (
        <Modal onClose={() => setConfirmExit(false)}>
          <h3 className="modal-title">Leave the test?</h3>
          <p className="modal-sub">
            Your answers will be lost — there's no auto-save mid-test. You can come back later from the Tests tab.
          </p>
          <div className="modal-actions">
            <button className="pd-btn ghost" onClick={() => setConfirmExit(false)}>
              Stay
            </button>
            <button className="pd-btn primary" onClick={() => {
              sessionStorage.removeItem('padee-test-start')
              onNavigate('tests')
            }}>
              Leave anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────
function Header({ title, timeText, timerColor, timerLabel, onMenu, onExit, progressPct, minimal }) {
  return (
    <header className="test-topnav">
      <div className="brand">
        <PaMascot size={28} mood="idle" />
        <span className="logo-text">Padee<span className="logo-ai">.ai</span></span>
      </div>
      {!minimal && (
        <>
          <div className="test-title">
            <div className="t-eyebrow">TEST IN PROGRESS</div>
            <div className="ttl-text">{title || 'Test'}</div>
          </div>
          <div className="test-timer">
            <div className="time-text tabular" style={{ color: timerColor }}>{timeText}</div>
            <div className="time-label">{timerLabel}</div>
          </div>
          <div className="test-controls">
            <button className="ctrl-btn" onClick={onMenu} title="Question list">
              <Menu size={14} /> All Qs
            </button>
            <button className="ctrl-btn ghost" onClick={onExit} title="Exit test">
              <X size={16} />
            </button>
          </div>
        </>
      )}
      {!minimal && (
        <div className="test-progress-line" style={{ width: `${progressPct}%` }} />
      )}
    </header>
  )
}

// ─── Question strip (top of card) ──────────────────────────────────────
function QuestionStrip({ total, currentIdx, selections, flagged, onJump }) {
  return (
    <div className="test-strip" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => {
        const answered = selections[i] != null
        const isFlag = flagged.has(i)
        const isCurrent = i === currentIdx
        const cls = [
          'test-strip-tile',
          isCurrent ? 'is-current' : '',
          answered ? 'is-answered' : '',
          isFlag ? 'is-flagged' : '',
        ].filter(Boolean).join(' ')
        return (
          <button key={i} className={cls} onClick={() => onJump(i)} title={`Question ${i + 1}`}>
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}

// ─── Modal primitive ──────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div className="test-modal-backdrop" onClick={onClose}>
      <div className="test-modal" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
