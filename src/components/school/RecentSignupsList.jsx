// ═══════════════════════════════════════════════════════════════════════════
// RecentSignupsList — last 10 people who joined the school.
// ═══════════════════════════════════════════════════════════════════════════
// Props:
//   signups: [{ id, name, role, class_level, created_at }]
// ═══════════════════════════════════════════════════════════════════════════

export default function RecentSignupsList({ signups = [] }) {
  if (signups.length === 0) {
    return (
      <div className="recent-signups">
        <div className="head">Recent signups</div>
        <div className="empty-state">
          🦊 Quiet so far. Share your codes!
        </div>
      </div>
    )
  }

  return (
    <div className="recent-signups">
      <div className="head">Recent signups</div>
      {signups.map(s => (
        <div key={s.id} className="signup-row">
          <span className={`role-icon ${s.role === 'teacher' ? 'teacher' : 'student'}`}>
            {s.role === 'teacher' ? '👨‍🏫' : '🎒'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name || 'Unnamed'}
            </div>
            <div className="meta">
              {capitalise(s.role || 'student')}
              {s.class_level ? ` · Class ${s.class_level}` : ''}
            </div>
          </div>
          <span className="ago">{relativeTime(s.created_at)}</span>
        </div>
      ))}
    </div>
  )
}

function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

// Lightweight relative time formatter; avoids pulling date-fns just for this.
function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!t) return ''
  const diffMs = Date.now() - t
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  const diffWk = Math.round(diffDay / 7)
  if (diffWk < 4) return `${diffWk}w ago`
  return new Date(iso).toLocaleDateString()
}
