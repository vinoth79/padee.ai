// UrgentPrepBanner — dark banner with lightning icon.
// Shown only when the most-urgent upcoming test is ≤ 3 days away (Q3).
import Ico from '../home-v4/Ico'

// Inline SVG lightning bolt (no dep on home-v4 Ico set)
function Bolt({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" stroke="none">
      <polygon points="13 2 3 14 11 14 10 22 21 10 13 10 14 2" />
    </svg>
  )
}

export default function UrgentPrepBanner({ test, onStart }) {
  if (!test) return null
  const days = Math.max(0, Math.ceil((new Date(test.deadline).getTime() - Date.now()) / 86400000))
  const dayName = new Date(test.deadline).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const eyebrow = days === 0
    ? 'DUE TODAY'
    : days === 1
      ? 'DUE TOMORROW'
      : `${dayName} IS ${days} DAYS AWAY`

  return (
    <div className="urgent-banner">
      <div className="bolt-wrap"><Bolt /></div>
      <div className="copy">
        <div className="eyebrow">{eyebrow}</div>
        <div className="title">
          Your <b style={{ color: '#fff' }}>{test.title}</b> prep is at {test.prepPct}%.
          {' '}Pa planned a {test.sprintMinutes}-min sprint.
        </div>
      </div>
      <button className="btn" onClick={onStart}>
        Start prep sprint <Ico name="arrow" size={14} color="#fff" />
      </button>
    </div>
  )
}
