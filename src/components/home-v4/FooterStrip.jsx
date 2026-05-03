// FooterStrip — persistent bottom strip: XP ring + 7-day spark + subject mastery + badges.
export default function FooterStrip({
  xpToday = 0, xpGoal = 50,
  week = [], // array of 7 numbers — today's XP last
  mastery = [],
  badges = [],
  totalBadges = 15,
}) {
  const pct = xpGoal > 0 ? Math.min(1, xpToday / xpGoal) : 0

  return (
    <div className="pd-footer">
      {/* Today XP ring + breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Ring pct={pct} size={44} stroke={5} color="var(--c-accent)">
          <div className="tabular" style={{ fontSize: 12, fontWeight: 700 }}>{xpToday}</div>
        </Ring>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 2 }}>TODAY</div>
          <div className="tabular" style={{ fontSize: 13, fontWeight: 600 }}>
            {xpToday} / {xpGoal} XP
          </div>
          <div className="t-xs tabular" style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            {week.length > 0 ? week.map((v, i) => (
              <span key={i} style={{ color: v > 0 ? 'var(--c-ink-2)' : 'var(--c-muted-2)' }}>
                {v > 0 ? v : '–'}
              </span>
            )) : [0, 0, 0, 0, 0, 0, 0].map((_, i) => (
              <span key={i} style={{ color: 'var(--c-muted-2)' }}>–</span>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-footer-divider" />

      {/* Subject mastery dots */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-eyebrow" style={{ marginBottom: 6 }}>SUBJECT MASTERY</div>
        {mastery.length === 0 ? (
          <div className="t-xs">Complete a practice session to see subject-level mastery here.</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {mastery.map((m, i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                <b>{m.name}</b>
                <span className="tabular" style={{ color: 'var(--c-muted)' }}>{m.pct}%</span>
                {m.delta != null && (
                  <span className="tabular"
                    style={{
                      fontSize: 10, fontWeight: 600,
                      color: m.delta > 0 ? 'var(--c-green)'
                        : m.delta < 0 ? 'var(--c-pink)'
                          : 'var(--c-muted-2)',
                    }}>
                    {m.delta > 0 ? '+' : ''}{m.delta}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pd-footer-divider" />

      {/* Badges row */}
      <div>
        <div className="t-eyebrow" style={{ marginBottom: 6, textAlign: 'right' }}>
          BADGES · {badges.length} OF {totalBadges}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(badges.length > 0 ? badges.slice(0, 5) : ['🔒', '🔒', '🔒', '🔒', '🔒']).map((b, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--c-paper)', border: '1px solid var(--c-hair)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>{b}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Ring({ pct = 0, size = 44, stroke = 5, color = 'var(--c-accent)', children }) {
  const RAD = (size - stroke) / 2
  const CIRC = 2 * Math.PI * RAD
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={RAD}
          fill="none" stroke="var(--c-hair)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={RAD}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{children}</div>
    </div>
  )
}
