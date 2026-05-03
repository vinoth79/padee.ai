// YourProgressCard — kid-friendly balanced view: STRENGTHS (celebrate) +
// WEAK SPOTS (fix these). Replaces the old stand-alone WeakSpotsCard.
// Psychologically important: pair every weak-spot with visible wins so
// students don't see only red flags on their dashboard.
export default function YourProgressCard({
  strengths = [],
  weakSpots = [],
  onWeakSpotClick,
  onStrengthClick,   // optional — if provided, strengths become clickable
  onSeeAll,
}) {
  const hasAny = strengths.length > 0 || weakSpots.length > 0
  return (
    <div className="progress-card">
      <div className="pc-header">
        <div>
          <div className="pc-title">Your progress</div>
          <div className="pc-subtitle">What you're nailing · what to fix next</div>
        </div>
        {onSeeAll && hasAny && (
          <button className="pc-see-all" onClick={onSeeAll}>See all →</button>
        )}
      </div>

      <div className="pc-grid">
        {/* ─── STRENGTHS ─── */}
        <div className="pc-col strengths">
          <div className="pc-col-header">
            <span>🌟</span>
            <span>Strengths</span>
          </div>
          {strengths.length > 0 ? (
            strengths.slice(0, 3).map(s => {
              const Tag = onStrengthClick ? 'button' : 'div'
              return (
                <Tag key={s.concept_slug || s.concept_name} className="pc-row strong"
                  onClick={() => onStrengthClick?.(s)}>
                  <div className="pc-badge">✓</div>
                  <div className="pc-info">
                    <div className="pc-concept">{s.concept_name}</div>
                    <div className="pc-subject">{s.subject}</div>
                  </div>
                  <div className="pc-pct tabular">{s.mastery}%</div>
                </Tag>
              )
            })
          ) : (
            <div className="pc-empty">
              Keep practising — your first wins will land here!
            </div>
          )}
        </div>

        {/* ─── WEAK SPOTS ─── */}
        <div className="pc-col weak">
          <div className="pc-col-header">
            <span>⚠</span>
            <span>Weak spots</span>
          </div>
          {weakSpots.length > 0 ? (
            weakSpots.slice(0, 3).map(w => (
              <button key={w.concept_slug || w.concept_name} className="pc-row weak"
                onClick={() => onWeakSpotClick?.(w)}>
                <div className="pc-badge">⚑</div>
                <div className="pc-info">
                  <div className="pc-concept">{w.concept_name}</div>
                  <div className="pc-subject">{w.subject}</div>
                </div>
                <div className="pc-pct tabular">{w.mastery}%</div>
              </button>
            ))
          ) : (
            <div className="pc-empty">
              No weak spots right now — you're on track! 🎯
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
