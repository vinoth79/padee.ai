// ═══════════════════════════════════════════════════════════════════════════
// ChildProgressDetail — modal overlay shown when a parent clicks a ChildCard.
// ═══════════════════════════════════════════════════════════════════════════
// What's INSIDE per PRD v5 §F5:
//   - Hero: name, class, total XP, current streak, longest streak
//   - Subject mastery summary (count + average %)
//   - Weakest subject callout
//   - "Last active" timestamp
//
// What's NOT here (deliberate, v5 read-only floor):
//   - Full doubt question text
//   - Test answer breakdowns
//   - Per-concept names (only counts and averages)
// These come in v5.1 after a privacy review pass.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react'

const SUBJECT_PRETTY = {
  maths: 'Maths',
  mathematics: 'Maths',
  science: 'Science',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  english: 'English',
  hindi: 'Hindi',
  social_science: 'Social Studies',
  social_studies: 'Social Studies',
  computer_science: 'Computer Science',
}

function prettySubject(code) {
  if (!code) return ''
  return SUBJECT_PRETTY[code.toLowerCase()] || code
}

function formatActiveAt(iso) {
  if (!iso) return 'Hasn\'t studied yet'
  const date = new Date(iso)
  const now = Date.now()
  const diffH = (now - date.getTime()) / 3600_000
  if (diffH < 24) return `Active ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
  if (diffH < 48) return 'Active yesterday'
  return `Active ${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
}

export default function ChildProgressDetail({ child, onClose }) {
  // ESC closes the modal — keyboard accessibility
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    // Lock background scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (!child) return null

  const {
    name,
    classLevel,
    board,
    totalXP,
    streak,
    longestStreak,
    weakestSubject,
    lastActiveAt,
    masterySummary,
  } = child

  return (
    <div className="child-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="child-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="child-modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >×</button>

        <div className="child-modal-head">
          <h2 className="child-modal-name">{name || 'Your child'}</h2>
          <div className="child-modal-meta">
            {classLevel && <span>Class {classLevel}</span>}
            {board && <span> · {board}</span>}
            {' · '}{formatActiveAt(lastActiveAt)}
          </div>
        </div>

        <div className="child-modal-stats">
          <div className="child-modal-stat">
            <div className="child-modal-stat-num tabular">{totalXP.toLocaleString('en-IN')}</div>
            <div className="child-modal-stat-lbl">Total XP earned</div>
          </div>
          <div className="child-modal-stat">
            <div className="child-modal-stat-num tabular">
              {streak} <span aria-hidden>🔥</span>
            </div>
            <div className="child-modal-stat-lbl">Current streak</div>
          </div>
          <div className="child-modal-stat">
            <div className="child-modal-stat-num tabular">{longestStreak}</div>
            <div className="child-modal-stat-lbl">Longest streak</div>
          </div>
        </div>

        <section className="child-modal-section">
          <div className="child-modal-section-head">Subject mastery</div>
          {masterySummary && masterySummary.subjects > 0 ? (
            <div className="child-modal-mastery">
              <div className="mastery-bar">
                <div
                  className="mastery-bar-fill"
                  style={{ width: `${Math.max(2, masterySummary.avgPct || 0)}%` }}
                />
              </div>
              <div className="mastery-meta">
                <span><b>{masterySummary.avgPct ?? 0}%</b> average across {masterySummary.subjects} {masterySummary.subjects === 1 ? 'subject' : 'subjects'}</span>
              </div>
            </div>
          ) : (
            <p className="t-sm">No mastery data yet — your child will start building this as they answer practice questions and tests.</p>
          )}
        </section>

        {weakestSubject && (
          <section className="child-modal-section child-modal-weak">
            <div className="child-modal-section-head">Where you can help</div>
            <p>
              <b>{prettySubject(weakestSubject.code)}</b> is the weakest area
              right now ({weakestSubject.masteryPct}% mastery). A short review
              session together — even 10 minutes — usually moves the needle.
            </p>
          </section>
        )}

        <section className="child-modal-section child-modal-privacy">
          <div className="child-modal-section-head">What you can see here</div>
          <ul className="child-modal-privacy-list">
            <li>Lifetime XP and study streaks</li>
            <li>Subject-level mastery (averaged)</li>
            <li>The subject your child finds hardest</li>
          </ul>
          <div className="child-modal-section-head" style={{ marginTop: 14 }}>What we keep private</div>
          <ul className="child-modal-privacy-list">
            <li>Exact questions your child has asked Pa</li>
            <li>Individual test answers</li>
            <li>Live session activity</li>
          </ul>
          <p className="t-xs" style={{ marginTop: 10 }}>
            We're starting careful — your child needs to feel safe asking Pa
            anything. We'll expand what you see in future updates if Padee
            students and parents tell us they want it.
          </p>
        </section>
      </div>
    </div>
  )
}
