// FeedbackIcons — thumbs-up, thumbs-down, flag. Right-aligned next to NCERT chip.
// Thumbs-down opens an inline reason drawer below the AI bubble.
// Flag opens the Report modal (handled by parent).
// Preserves v3 feedback semantics 1:1 (same endpoints, same DB writes).
import { useState } from 'react'

const REASONS = ['Unclear', 'Inaccurate', 'Not NCERT', 'Skip']

export default function FeedbackIcons({ msgId, feedback, onFeedback, onReport }) {
  const [showReasons, setShowReasons] = useState(false)

  const helpfulState = feedback?.helpful === true ? 'active-up'
                     : feedback?.helpful === false ? 'active-down'
                     : ''

  return (
    <>
      <div className="feedback-row">
        <button
          className={`feedback-btn ${helpfulState === 'active-up' ? 'active-up' : ''}`}
          onClick={() => onFeedback(msgId, true)}
          title="This was helpful"
          aria-label="Thumbs up">
          <svg className="ico" width="16" height="16" viewBox="0 0 24 24">
            <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm2-1l5-7c1.5 0 2.5 1 2.5 2.5V8h4.2a1.8 1.8 0 0 1 1.8 2.1l-1.5 8.2a2 2 0 0 1-2 1.7H9V10z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          className={`feedback-btn ${helpfulState === 'active-down' ? 'active-down' : ''}`}
          onClick={() => { setShowReasons(v => !v); if (!showReasons) onFeedback(msgId, false) }}
          title="This wasn't helpful"
          aria-label="Thumbs down">
          <svg className="ico" width="16" height="16" viewBox="0 0 24 24">
            <path d="M7 13V4h3v9H7zm2 1l5 7c1.5 0 2.5-1 2.5-2.5V16h4.2a1.8 1.8 0 0 0 1.8-2.1l-1.5-8.2a2 2 0 0 0-2-1.7H9v10z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          className="feedback-btn"
          onClick={() => onReport(msgId)}
          title="Report as incorrect"
          aria-label="Report">
          <svg className="ico" width="16" height="16" viewBox="0 0 24 24">
            <path d="M4 4v17M4 5h13l-2.5 4L17 13H4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {showReasons && feedback?.helpful === false && !feedback?.reason && (
        <div className="reason-drawer" style={{ width: '100%', marginTop: 10 }}>
          <span className="reason-label">What's wrong? (optional)</span>
          {REASONS.map(r => (
            <button key={r} className="reason-chip"
              onClick={() => { onFeedback(msgId, false, r); setShowReasons(false) }}>
              {r}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
