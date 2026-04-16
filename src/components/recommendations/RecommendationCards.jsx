// Four recommendation card components (PRD 8E):
//   • HeroCard        — dark navy, 1 per day, single most-important action
//   • WeakConceptCard — amber, score < 0.45 + >= 3 attempts
//   • RevisionCard    — teal, score > 0.65 + 7+ days since practice
//   • NextToLearnCard — blue, only when no gaps exist
//
// These are stateless presentational components. Parent provides the data
// from /api/recommendations/today.

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖',
}

// ─────────────────────────────────────────────────────────
// HERO CARD — PRD 8E first row. Dark navy. Always shown.
// ─────────────────────────────────────────────────────────
export function HeroCard({ recommendation, onAct }) {
  if (!recommendation || recommendation.hero_type === 'none' || !recommendation.hero_copy) return null

  const detail = recommendation.hero_detail || {}
  const icon = SUBJECT_ICONS[detail.subject] || '✨'
  const isFixType = recommendation.hero_type === 'fix_critical' || recommendation.hero_type === 'fix_attention'

  return (
    <div className="rounded-2xl p-6 shadow-lg mb-4"
      style={{
        background: 'linear-gradient(145deg, #0F1729 0%, #1E293B 100%)',
        border: '1px solid rgba(129, 140, 248, 0.2)',
      }}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#818CF8' }}>
            ✨ AI recommends today
          </p>
          {detail.subject && (
            <p className="text-[11px]" style={{ color: '#64748B' }}>
              {detail.subject} · {detail.chapter || ''}
            </p>
          )}
        </div>
      </div>

      <p className="text-base font-semibold leading-relaxed mb-4" style={{ color: '#FFFFFF' }}>
        {recommendation.hero_copy}
      </p>

      {/* Quick stats */}
      {isFixType && (detail.failure_count > 0 || detail.exam_weight > 0) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {detail.failure_count > 0 && (
            <div className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5' }}>
              <strong>{detail.failure_count}</strong> failures
            </div>
          )}
          {detail.exam_weight > 0 && (
            <div className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D' }}>
              <strong>{detail.exam_weight}%</strong> of chapter marks
            </div>
          )}
          {detail.composite_score != null && (
            <div className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(129, 140, 248, 0.15)', color: '#A5B4FC' }}>
              Score <strong>{Math.round((detail.composite_score || 0) * 100)}%</strong>
            </div>
          )}
        </div>
      )}

      <button onClick={onAct}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'linear-gradient(90deg, #0D9488 0%, #818CF8 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
        }}>
        {recommendation.hero_type === 'next_chapter' ? 'Start chapter →' : 'Fix this now →'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SUPPORTING CARDS ROW — renders weak + revision as amber/teal chips
// ─────────────────────────────────────────────────────────
export function SupportingCardsRow({ cards, onCardClick }) {
  if (!cards || cards.length === 0) return null

  return (
    <div className="grid sm:grid-cols-2 gap-3 mb-4">
      {cards.map((card, i) => {
        if (card.type === 'weak') return <WeakConceptCard key={i} card={card} onClick={() => onCardClick(card)} />
        if (card.type === 'revise') return <RevisionCard key={i} card={card} onClick={() => onCardClick(card)} />
        return null
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// WEAK CONCEPT CARD — amber. Shows failure count not percentage.
// ─────────────────────────────────────────────────────────
export function WeakConceptCard({ card, onClick }) {
  const icon = SUBJECT_ICONS[card.subject] || '📖'
  return (
    <button onClick={onClick}
      className="text-left w-full rounded-2xl p-4 transition-all hover:shadow-md"
      style={{
        background: '#FEF3C7',
        border: '1px solid #FCD34D',
      }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#92400E' }}>
            Needs fixing
          </p>
          <p className="text-sm font-semibold" style={{ color: '#78350F' }}>
            {card.concept_name}
          </p>
        </div>
      </div>
      <p className="text-xs" style={{ color: '#92400E' }}>
        Failed <strong>{card.failure_count}</strong> times · Fix in 5 questions →
      </p>
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// REVISION CARD — teal. Emphasises speed.
// ─────────────────────────────────────────────────────────
export function RevisionCard({ card, onClick }) {
  const icon = SUBJECT_ICONS[card.subject] || '📖'
  return (
    <button onClick={onClick}
      className="text-left w-full rounded-2xl p-4 transition-all hover:shadow-md"
      style={{
        background: '#F0FDFA',
        border: '1px solid #CCFBF1',
      }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0F766E' }}>
            Quick revision
          </p>
          <p className="text-sm font-semibold" style={{ color: '#115E59' }}>
            {card.concept_name}
          </p>
        </div>
      </div>
      <p className="text-xs" style={{ color: '#0F766E' }}>
        Not practised in <strong>{card.days_since_practice}</strong> days · 2-min refresh →
      </p>
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// NEXT TO LEARN — blue. Only shown when hero_type === 'next_chapter'.
// This replaces the hero card when no gaps exist.
// ─────────────────────────────────────────────────────────
export function NextToLearnCard({ recommendation, onAct }) {
  if (!recommendation || recommendation.hero_type !== 'next_chapter') return null
  const detail = recommendation.hero_detail || {}
  const icon = SUBJECT_ICONS[detail.subject] || '📖'

  return (
    <div className="rounded-2xl p-5 shadow-sm mb-4"
      style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
      }}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#1D4ED8' }}>
            Ready for the next step
          </p>
          <p className="text-sm font-semibold" style={{ color: '#1E3A8A' }}>
            {detail.chapter || 'Next chapter'}
          </p>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: '#1E40AF' }}>{recommendation.hero_copy}</p>
      <button onClick={onAct}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: '#2563EB' }}>
        Start chapter →
      </button>
    </div>
  )
}
