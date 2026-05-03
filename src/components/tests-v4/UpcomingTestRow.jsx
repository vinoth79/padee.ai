// UpcomingTestRow — single row in the Upcoming list.
// Day badge (left) + title/meta + prep bar + Prep / Take test buttons.
// Rows ≤ 2 days away get the amber "urgent" treatment (background tint).
import Ico from '../home-v4/Ico'

export default function UpcomingTestRow({ test, onPrep, onStart, onOpen }) {
  const deadline = test.deadline ? new Date(test.deadline) : null
  const days = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000)) : null
  const isUrgent = days != null && days <= 2
  const durationMin = Math.round((test.question_count * (test.seconds_per_question || 60)) / 60)
  const { dayLabel, daysAwayLabel } = formatDay(deadline, days)

  return (
    <div className={`upcoming-row ${isUrgent ? 'urgent' : ''}`} onClick={onOpen}>
      <div className="day-col">
        <div className="day-label">{dayLabel}</div>
        <div className="days-away">{daysAwayLabel}</div>
      </div>
      <div className="info">
        <div className="ttl">{test.title}</div>
        <div className="meta">
          {test.subject} · Class {test.class_level || '—'} · {test.question_count * 2} marks · {durationMin} min
        </div>
      </div>
      <div className="prep-col">
        <div className={`prep-bar ${isUrgent ? '' : 'calm'}`}>
          <span style={{ width: `${test.prepPct}%` }} />
        </div>
        <div className="prep-label tabular">{test.prepPct}% prepped</div>
      </div>
      <div className="row-actions">
        <button className="prep-btn ghost"
          onClick={e => { e.stopPropagation(); onPrep?.(test) }}>
          Prep
        </button>
        <button className="prep-btn primary"
          onClick={e => { e.stopPropagation(); onStart?.(test) }}>
          Take test
        </button>
      </div>
      <Ico name="chevronR" size={16} color="var(--c-muted-2)" />
    </div>
  )
}

function formatDay(deadline, days) {
  if (!deadline) return { dayLabel: '—', daysAwayLabel: '' }
  const now = new Date()
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / 86400000)

  // Within this week → day-of-week (FRI, MON). Otherwise → DD MMM.
  let dayLabel
  if (diffDays < 7) {
    dayLabel = deadline.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  } else {
    dayLabel = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }

  let daysAwayLabel
  if (days === 0) daysAwayLabel = 'Today'
  else if (days === 1) daysAwayLabel = '1 day'
  else if (days < 14) daysAwayLabel = `${days} days`
  else daysAwayLabel = `${days} d`

  return { dayLabel, daysAwayLabel }
}
