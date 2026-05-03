// SubjectHeroCard — dark hero with donut ring + mastery summary + "Pa, plan my week" CTA.
import Ico from '../home-v4/Ico'

export default function SubjectHeroCard({
  subject,
  classLevel,
  masteryPct = 0,
  chaptersCompleted = 0,
  chaptersTotal = 0,
  weakConcepts = 0,
  heroSubtitle,
  onPlanWeek,
}) {
  // Derived copy for the sub-title when no AI blurb is present yet
  const autoSubtitle = weakConcepts > 0
    ? `${weakConcepts} weak concept${weakConcepts > 1 ? 's' : ''} left to close.`
    : chaptersTotal > 0 && chaptersCompleted === chaptersTotal
      ? 'All chapters are in good shape. Keep revising.'
      : 'Keep going — small daily sessions compound fast.'

  return (
    <div className="subj-hero">
      <div className="donut">
        <DonutRing pct={masteryPct} size={80} stroke={9} color="#E85D3A" trackColor="rgba(255,255,255,0.15)">
          <div className="tabular" style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
            {masteryPct}%
          </div>
        </DonutRing>
      </div>
      <div className="copy">
        <div className="meta">
          {subject} · Class {classLevel} · CBSE
        </div>
        <div className="title">
          {chaptersCompleted} of {chaptersTotal} chapters · {masteryPct}% mastery
        </div>
        <div className="sub">
          {heroSubtitle || autoSubtitle}
        </div>
      </div>
      <button className="plan-btn" onClick={onPlanWeek}>
        Pa, plan my week <Ico name="arrow" size={14} color="#fff" />
      </button>
    </div>
  )
}

function DonutRing({ pct = 0, size = 60, stroke = 8, color = '#E85D3A', trackColor = 'rgba(255,255,255,0.15)', children }) {
  const RAD = (size - stroke) / 2
  const CIRC = 2 * Math.PI * RAD
  const clamped = Math.max(0, Math.min(100, pct)) / 100
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={RAD}
          fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={RAD}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - clamped)}
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
