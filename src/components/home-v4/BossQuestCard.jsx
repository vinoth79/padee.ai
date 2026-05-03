// BossQuestCard — v4 visual, v3 data contract.
// ═══════════════════════════════════════════════════════════════════════════
// Takes the same `recommendation` object that v3 HeroCard consumes and
// branches on `hero_type` the same way — but renders in the v4 dark hero
// style (Pa mascot top-right, amber star eyebrow, vermillion primary button
// with ink-drop shadow, inline meta chips).
//
// Supported hero_types:
//   fix_critical, fix_attention  → "Today's boss quest" eyebrow, "Fix this now"
//   revise                        → "Today's boss quest" eyebrow, "Fix this now"
//   next_chapter                  → "Next up" eyebrow, "Start chapter"
//   none (or null recommendation) → render nothing (parent decides fallback)
// ═══════════════════════════════════════════════════════════════════════════
import PaMascot from './PaMascot'
import Ico from './Ico'

export default function BossQuestCard({ recommendation, onStart, onSeePlan }) {
  if (!recommendation || recommendation.hero_type === 'none' || !recommendation.hero_copy) {
    return null
  }

  const detail = recommendation.hero_detail || {}
  const isFixType = recommendation.hero_type === 'fix_critical'
                 || recommendation.hero_type === 'fix_attention'
                 || recommendation.hero_type === 'revise'
  const isNextChapter = recommendation.hero_type === 'next_chapter'
  const startLabel = isNextChapter ? 'Start chapter' : 'Fix this now'
  const eyebrow = isNextChapter ? '➜ NEXT UP' : '★ TODAY\'S BOSS QUEST'

  // Chips shown on the right side — differ by hero_type
  const chips = []
  if (isFixType) {
    if (detail.failure_count > 0) chips.push({ icon: 'heart', iconColor: '#FF4D8B', text: `${detail.failure_count} failure${detail.failure_count !== 1 ? 's' : ''}`, textColor: '#FCA5A5' })
    if (detail.exam_weight > 0) chips.push({ icon: 'sparkle', iconColor: '#FFB547', text: `${detail.exam_weight}% marks`, textColor: '#FCD34D' })
    if (detail.composite_score != null) chips.push({ icon: 'clock', iconColor: undefined, text: `Score ${Math.round((detail.composite_score || 0) * 100)}%`, textColor: '#A5B4FC' })
  } else if (isNextChapter) {
    if (detail.chapter_no) chips.push({ icon: 'learn', iconColor: '#A5B4FC', text: `Chapter ${detail.chapter_no}`, textColor: '#A5B4FC' })
    if (detail.exam_weight > 0) chips.push({ icon: 'sparkle', iconColor: '#FFB547', text: `${detail.exam_weight}% boards`, textColor: '#FCD34D' })
    chips.push({ icon: 'clock', iconColor: '#86EFAC', text: '~15 min start', textColor: '#86EFAC' })
  }

  return (
    <div className="pd-card dark"
      style={{ padding: 18, position: 'relative', overflow: 'hidden', marginBottom: 14, borderRadius: 20 }}>

      {/* Content wrapper — reserves room for the mascot on the right */}
      <div style={{ paddingRight: 104 }}>
        <div className="t-eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>

        {/* Subject · Chapter meta row (when present) */}
        {(detail.subject || detail.chapter) && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.04em' }}>
            {detail.subject}
            {detail.chapter && detail.subject && ' · '}
            {detail.chapter}
          </div>
        )}

        <div className="t-h2" style={{ marginBottom: 12, color: '#fff' }}>
          {recommendation.hero_copy}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="pd-btn primary" onClick={onStart}>
            {startLabel} <Ico name="arrow" size={14} />
          </button>
          <button className="pd-btn ghost" style={{ color: '#fff' }} onClick={onSeePlan}>
            See plan
          </button>

          {chips.length > 0 && (
            <div className="tabular"
              style={{ display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.7)', flexWrap: 'wrap' }}>
              {chips.map((chip, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: chip.textColor }}>
                  <Ico name={chip.icon} size={12} color={chip.iconColor} />
                  {chip.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pa mascot, absolutely positioned on the right */}
      <div style={{ position: 'absolute', right: 6, top: 6, opacity: 0.95, pointerEvents: 'none' }}>
        <PaMascot size={96} mood={isNextChapter ? 'idle' : 'celebrate'} />
      </div>
    </div>
  )
}
