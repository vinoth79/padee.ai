// WeekBars — 7 vertical bars (Mon..Sun) showing XP per day.
// Today's bar gets an outlined emphasis. "N of 7 days" subtitle derives from non-zero days.
// TODO(data): replace synthesised data with real per-day XP from backend.

export default function WeekBars({ week = [], delta = null, totalThisWeek = 0 }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const safe = Array.from({ length: 7 }).map((_, i) => week[i] ?? 0)
  const max = Math.max(...safe, 50)
  const activeDays = safe.filter(v => v > 0).length

  // Today's column index (0=Mon..6=Sun). JS getDay() returns 0=Sun..6=Sat.
  const today = new Date().getDay()
  const todayIdx = today === 0 ? 6 : today - 1

  const deltaClass = delta == null ? 'flat'
                   : delta > 0 ? 'up'
                   : delta < 0 ? 'down' : 'flat'
  const deltaLabel = delta == null ? null
                   : delta > 0 ? `+${delta}% vs last week`
                   : delta < 0 ? `${delta}% vs last week`
                   : 'same as last week'

  return (
    <div className="week-card">
      <div className="header">
        <div className="title-block">
          <div className="t-eyebrow">This week</div>
          <div className="title tabular">
            {totalThisWeek} XP · {activeDays} of 7 days
          </div>
        </div>
        {deltaLabel && (
          <div className={`delta-chip ${deltaClass}`}>{deltaLabel}</div>
        )}
      </div>

      <div className="week-bars">
        {safe.map((xp, i) => {
          const isToday = i === todayIdx
          const isEmpty = xp === 0
          const heightPct = isEmpty ? 24 : Math.max(30, (xp / max) * 110)
          return (
            <div key={i} className={`week-bar-col ${isToday ? 'today' : ''}`}>
              <div
                className={`week-bar ${isEmpty ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                style={{ height: heightPct }}
                title={`${days[i]}: ${xp} XP`}>
                {!isEmpty && xp}
              </div>
              <span className="day-label">{days[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
