// RecentDoubts — last 3 student questions, compact rail version.
// Click → re-opens in Ask AI via ScreenBridge's initialQuestion flow.
const SUBJECT_COLOR = {
  Physics:          'var(--c-blue)',
  Chemistry:        'var(--c-accent)',
  Biology:          'var(--c-green)',
  Mathematics:      'var(--c-violet)',
  Maths:            'var(--c-violet)',
  English:          'var(--c-green)',
  Hindi:            'var(--c-pink)',
  Science:          'var(--c-accent)',
  'Social Science': 'var(--c-amber)',
}

export default function RecentDoubts({ doubts = [], onClick }) {
  if (!doubts.length) {
    return (
      <div className="rd-rail-card">
        <div className="rd-rail-eyebrow">Recent doubts</div>
        <p className="rd-empty">No doubts asked yet. Tap <b>Ask Pa</b> to start.</p>
      </div>
    )
  }
  return (
    <div className="rd-rail-card">
      <div className="rd-rail-eyebrow">Recent doubts</div>
      <div className="rd-rail-list">
        {doubts.slice(0, 3).map(d => {
          // Backend returns { id, subject, topic (first 80 chars), createdAt }
          const text = d.topic || d.question_text || ''
          const ts = d.createdAt || d.created_at
          const color = SUBJECT_COLOR[d.subject] || 'var(--c-muted)'
          return (
            <button key={d.id} className="rd-rail-row" onClick={() => onClick?.(d)}>
              <span className="rd-rail-dot" style={{ background: color }} />
              <span className="rd-rail-text">
                <span className="rd-rail-subject">{d.subject || 'General'}</span>
                <span className="rd-rail-q">{text}</span>
                <span className="rd-rail-ago">{formatAgo(ts)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}
