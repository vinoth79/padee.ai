// PaCueCard — amber banner with Pa mascot + a specific next-action.
// Source: /api/user/learn-data todayFocus (same as hero recommendation).
import PaMascot from '../home-v4/PaMascot'
import Ico from '../home-v4/Ico'

export default function PaCueCard({
  focus,
  onStart,
}) {
  if (!focus) return null

  // Prefer the AI-generated hero_copy if present, otherwise synthesise.
  const msg = focus.hero_copy || buildAutoCopy(focus)

  return (
    <div className="pa-cue">
      <div className="mascot"><PaMascot size={40} mood="speaking" /></div>
      <div className="copy" dangerouslySetInnerHTML={{ __html: msg }} />
      <button className="cue-btn" onClick={onStart}>
        Start <Ico name="arrow" size={13} color="#fff" />
      </button>
    </div>
  )
}

function buildAutoCopy(focus) {
  const ch = focus.chapter_name ? `<b>${focus.chapter_name}</b> — ` : ''
  const concept = focus.concept_name ? `<b>${focus.concept_name}</b>` : 'this concept'
  const why = focus.failure_count > 0
    ? `You got ${focus.failure_count} of recent attempts wrong — let's fix it in 8 min.`
    : 'Small session today can lock this in.'
  return `Start with ${ch}${concept}. ${why}`
}
