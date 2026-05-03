// MasteryBar — single subject row in the mastery list.
// Layout: [subject dot + name] [bar] [%] [N strong · N weak] [delta chip]
// Delta is optional (TODO(data): week-over-week not tracked yet).
export default function MasteryBar({
  subject,
  color,
  pct = 0,
  strongCount = null,
  weakCount = null,
  delta = null,
  onClick,
}) {
  const deltaClass = delta == null ? '' : delta > 0 ? 'up' : delta < 0 ? 'down' : ''
  const deltaLabel = delta == null ? '—' : delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '0%'

  return (
    <div className="mastery-row" onClick={onClick}>
      <div className="subj-cell">
        <span className="dot" style={{ background: color }} />
        <span>{subject}</span>
      </div>
      <div className="bar-cell">
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div className="pct-cell tabular">{pct}%</div>
      <div className="strong-weak">
        {strongCount != null && weakCount != null ? (
          <><span className="s">{strongCount} strong</span> · <span className="w">{weakCount} weak</span></>
        ) : (
          <span style={{ color: 'var(--c-muted-2)' }}>—</span>
        )}
      </div>
      <div className={`delta-cell ${deltaClass}`}>{deltaLabel}</div>
    </div>
  )
}
