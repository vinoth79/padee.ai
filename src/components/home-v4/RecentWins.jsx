// RecentWins — rail card listing recently earned badges with labels.
// Falls back to a friendly empty state when no badges unlocked yet.
export default function RecentWins({ badges = [], onViewAll }) {
  const earned = badges.filter(b => b.unlocked).slice(0, 5)
  return (
    <div className="recent-wins">
      <div className="rw-header">
        <span className="rw-eyebrow">Recent wins</span>
        {onViewAll && (
          <button className="rw-link" onClick={onViewAll}>All badges →</button>
        )}
      </div>
      {earned.length === 0 ? (
        <div className="rw-empty">No badges yet — ask your first doubt to unlock one.</div>
      ) : (
        <div className="rw-list">
          {earned.map(b => (
            <div key={b.id || b.name} className="rw-badge">
              <span className="emoji">{b.emoji || '🏆'}</span>
              <span>{b.name || 'Badge'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
