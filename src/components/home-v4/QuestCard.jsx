// QuestCard — generic card for the 3-up row.
// Icon tile (top-left) + XP chip (top-right) + title + meta + optional progress + optional CTA.
import Ico from './Ico'

export default function QuestCard({
  icon,
  iconBg,
  iconFg,
  xp,
  xpColor,
  title,
  meta,
  progress = null,
  progressColor,
  cta,
  onClick,
}) {
  return (
    <button onClick={onClick}
      className="pd-card flat"
      style={{
        padding: 16, position: 'relative', textAlign: 'left',
        border: '1px solid var(--c-hair)', borderRadius: 'var(--r-xl)',
        background: 'var(--c-card)', fontFamily: 'inherit', cursor: 'pointer',
        width: '100%',
      }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg, color: iconFg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name={icon} size={18} color={iconFg} />
        </div>
        {xp != null && (
          <span className="pd-chip tabular"
            style={{ background: `${xpColor}22`, color: xpColor, fontWeight: 700, fontSize: 11 }}>
            +{xp} XP
          </span>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px', marginBottom: 3 }}>
        {title}
      </div>
      <div className="t-sm">{meta}</div>

      {progress != null && (
        <div className="pd-progress" style={{ marginTop: 12, height: 6 }}>
          <span style={{ width: `${progress * 100}%`, background: progressColor }} />
        </div>
      )}

      {cta && (
        <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: xpColor }}>
          {cta}
        </div>
      )}
    </button>
  )
}
