// ═══════════════════════════════════════════════════════════════════════════
// ChallengeView — renders the AI's challenge-mode response with the solution
// hidden behind a "Show solution" reveal so the student attempts the problem
// before peeking.
// ═══════════════════════════════════════════════════════════════════════════
// Contract: the LLM is prompted to format challenge replies as
//
//   [problem statement]
//
//   ---SOLUTION---
//
//   [step-by-step solution]
//
// We split on `---SOLUTION---` (case + whitespace tolerant). If the marker
// is missing (LLM occasionally forgets the format), we render the whole text
// as plain MathText with no reveal — graceful fallback.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import MathText from '../ui/MathText'

const SOLUTION_RE = /\n?-{2,}\s*SOLUTION\s*-{2,}\n?/i

export default function ChallengeView({ text }) {
  const [revealed, setRevealed] = useState(false)
  if (!text) return null

  const idx = text.search(SOLUTION_RE)
  const hasMarker = idx !== -1
  const problem = hasMarker ? text.slice(0, idx).trim() : text
  const solution = hasMarker
    ? text.slice(idx).replace(SOLUTION_RE, '').trim()
    : ''

  return (
    <div className="challenge-block">
      <div className="challenge-eyebrow">
        <span className="challenge-icon">🧗</span>
        <span>Challenge problem</span>
        <span className="challenge-hint">Try it before revealing the solution</span>
      </div>

      <div className="challenge-problem">
        <MathText text={problem} />
      </div>

      {hasMarker && solution && (
        <div className="challenge-solution-wrap">
          <button
            className={`challenge-reveal-btn ${revealed ? 'is-open' : ''}`}
            onClick={() => setRevealed(v => !v)}
            aria-expanded={revealed}>
            {revealed ? 'Hide solution ↑' : 'Show solution ↓'}
          </button>
          {revealed && (
            <div className="challenge-solution">
              <div className="challenge-solution-eyebrow">Solution</div>
              <MathText text={solution} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
