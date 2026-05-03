// ═══════════════════════════════════════════════════════════════════════════
// InlineQuiz — single-MCQ widget shown under an AI answer when "Quiz me" is
// clicked. Hits POST /api/ai/practice with count=1 and the AI answer as
// context, then renders an interactive A/B/C/D widget with feedback.
// ═══════════════════════════════════════════════════════════════════════════
// Ported from the v3 implementation in DoubtSolverScreen.jsx, restyled to
// the v4 amber/coral palette and Lexend Deca typography. MathText handles
// LaTeX in question + options.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import MathText from '../ui/MathText'

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null } catch { return null }
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function InlineQuiz({ context, subject, className, onClose }) {
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(''); setQuiz(null); setSelected(null); setSubmitted(false)
      const token = getToken()
      if (!token) { setError('Not signed in'); setLoading(false); return }
      try {
        const r = await fetch('/api/ai/practice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: context || '',
            subject: subject || 'Physics',
            className: className || 10,
            count: 1,
          }),
        })
        const data = await r.json()
        if (cancelled) return
        if (!r.ok) { setError(data.error || 'Failed to generate quiz'); setLoading(false); return }
        if (data.questions?.[0]) setQuiz(data.questions[0])
        else setError('No quiz returned')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Quiz failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [context, reloadKey])

  const isCorrect = submitted && selected === quiz?.correctIndex

  return (
    <div className="inline-quiz">
      <div className="inline-quiz-head">
        <span className="inline-quiz-eyebrow">⚡ Quick quiz</span>
        <button className="inline-quiz-close" onClick={onClose}>Close ×</button>
      </div>

      {loading && (
        <p className="inline-quiz-loading">Generating a question on this topic…</p>
      )}

      {!loading && error && (
        <div className="inline-quiz-error">
          <p>{error}</p>
          <button className="inline-quiz-retry" onClick={() => setReloadKey(k => k + 1)}>
            Try again ↻
          </button>
        </div>
      )}

      {!loading && quiz && (
        <>
          <h4 className="inline-quiz-question">
            <MathText text={quiz.question} inlineOnly />
          </h4>
          <div className="inline-quiz-options">
            {(quiz.options || []).map((opt, i) => {
              const state = !submitted
                ? (selected === i ? 'selected' : 'idle')
                : i === quiz.correctIndex
                  ? 'correct'
                  : selected === i ? 'wrong' : 'idle'
              return (
                <button key={i} disabled={submitted}
                  onClick={() => !submitted && setSelected(i)}
                  className={`inline-quiz-option state-${state}`}>
                  <span className="inline-quiz-letter">{LETTERS[i]}</span>
                  <span className="inline-quiz-opt-text">
                    <MathText text={opt} inlineOnly />
                  </span>
                </button>
              )
            })}
          </div>

          {!submitted ? (
            <button className="inline-quiz-check" disabled={selected === null}
              onClick={() => setSubmitted(true)}>
              Check answer
            </button>
          ) : (
            <>
              <div className={`inline-quiz-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                {isCorrect
                  ? <><b>✓ Correct!</b> <MathText text={quiz.explanation || ''} inlineOnly /></>
                  : <><b>Not quite.</b> The answer is <b>{LETTERS[quiz.correctIndex]}</b>. <MathText text={quiz.explanation || ''} inlineOnly /></>
                }
              </div>
              <div className="inline-quiz-actions">
                <button className="inline-quiz-retry" onClick={() => setReloadKey(k => k + 1)}>
                  Try another ↻
                </button>
                <button className="inline-quiz-done" onClick={onClose}>Done</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
