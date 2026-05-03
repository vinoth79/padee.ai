// TodayActivity — compact rail card: doubts / practice / tests counts today,
// with XP contribution from each source.
export default function TodayActivity({ activity = {}, xpBreakdown = {} }) {
  const rows = [
    { key: 'doubts',   label: 'Doubts asked',   count: activity.doubts    ?? 0, xp: xpBreakdown.doubts   ?? 0, color: 'var(--c-accent)' },
    { key: 'practice', label: 'Practice',       count: activity.questions ?? 0, xp: xpBreakdown.practice ?? 0, color: 'var(--c-purple)' },
    { key: 'tests',    label: 'Tests taken',    count: activity.tests     ?? 0, xp: xpBreakdown.test     ?? 0, color: 'var(--c-blue)' },
    { key: 'streak',   label: 'Streak bonus',   count: xpBreakdown.streak > 0 ? 1 : 0, xp: xpBreakdown.streak ?? 0, color: 'var(--c-amber)' },
  ]
  return (
    <div className="today-activity">
      <div className="ta-eyebrow">Today's activity</div>
      {rows.map(r => (
        <div key={r.key} className="ta-row">
          <span className="ta-label">
            <span className="dot" style={{ background: r.color }} />
            {r.label}
          </span>
          <span>
            <span className="ta-value tabular">{r.count}</span>
            {r.xp > 0 && <span className="ta-xp tabular">· +{r.xp} XP</span>}
          </span>
        </div>
      ))}
    </div>
  )
}
