// ReplanCheckInBanner — soft check-in surface for students who've drifted
// off their daily pledge. Renders only when streak.pledged_days_missed >= 3.
//
// Two actions:
//   • Re-plan → routes to /settings (the Settings/Plan page; falls back to
//     /progress if Settings isn't built yet).
//   • Got it  → POSTs to /api/user/replan-acknowledged which zeros the
//     counter server-side. Banner disappears until the next 3-miss cycle.
//
// Visual: amber-on-cream pill matching StreakAtRiskBanner's tone, but with
// the Pa mascot leading and slightly higher visual weight (it's a real
// nudge, not a status alert).
import { useState } from 'react'
import PaMascot from './PaMascot'
import Ico from './Ico'

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { return JSON.parse(localStorage.getItem(key))?.access_token || null } catch { return null }
}

export default function ReplanCheckInBanner({ missed = 0, onReplan, onDismissed }) {
  const [dismissing, setDismissing] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (hidden || missed < 3) return null

  async function handleGotIt() {
    setDismissing(true)
    try {
      const token = getToken()
      if (token) {
        await fetch('/api/user/replan-acknowledged', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch { /* non-blocking — UI hides regardless */ }
    setHidden(true)
    onDismissed?.()
  }

  return (
    <div className="replan-banner" role="status" aria-live="polite">
      <div className="replan-banner-mascot">
        <PaMascot size={42} mood="speaking" />
      </div>
      <div className="replan-banner-copy">
        <div className="replan-banner-eyebrow">Pa wants to check in</div>
        <p>
          You've missed <b>{missed} pledged day{missed === 1 ? '' : 's'}</b>. No judgement —
          let's re-plan your week so the streak feels good again.
        </p>
      </div>
      <div className="replan-banner-actions">
        <button className="replan-btn-primary" onClick={onReplan}>
          Re-plan my week <Ico name="arrow" size={13} />
        </button>
        <button className="replan-btn-ghost" onClick={handleGotIt} disabled={dismissing}>
          {dismissing ? 'Saving…' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
