// WeakSpotsCard — "PA SPOTTED · WEAK SPOTS". Lower-left card.
// Each row: coloured flag icon tile + topic/subject/reason + mastery% and delta%.
import Ico from './Ico'

export default function WeakSpotsCard({ weakSpots = [], onSeeAll, onItemClick }) {
  return (
    <div className="pd-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="t-eyebrow" style={{ color: 'var(--c-accent)', marginBottom: 2 }}>
            PA SPOTTED · WEAK SPOTS
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>
            {weakSpots.length > 0
              ? `${weakSpots.length} concept${weakSpots.length > 1 ? 's' : ''} to revisit`
              : 'No weak spots right now 🎯'}
          </div>
        </div>
        {weakSpots.length > 0 && (
          <button onClick={onSeeAll}
            style={{
              background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
              color: 'var(--c-accent)', fontWeight: 600, fontSize: 13,
            }}>
            See all →
          </button>
        )}
      </div>

      {weakSpots.length === 0 ? (
        <p className="t-sm" style={{ margin: 0 }}>
          Keep practising. As patterns emerge, Pa will flag concepts that need extra attention here.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weakSpots.map((w, i) => (
            <button key={i} onClick={() => onItemClick?.(w)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', border: '1px solid var(--c-hair)', borderRadius: 10,
                background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left',
                fontFamily: 'inherit',
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: `${w.color}18`, color: w.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Ico name="flag" size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>{w.topic}</div>
                <div className="t-xs" style={{ marginTop: 2, color: 'var(--c-muted)' }}>
                  {w.subject}{w.reason ? ` · ${w.reason}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tabular" style={{ fontSize: 13, fontWeight: 700, color: w.color }}>
                  {w.mastery}%
                </div>
                {w.delta != null && (
                  <div className="t-xs tabular" style={{ color: '#D84A3A', marginTop: 1 }}>
                    {w.delta > 0 ? '+' : ''}{w.delta}%
                  </div>
                )}
              </div>
              <Ico name="chevronR" size={14} color="var(--c-muted-2)" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
