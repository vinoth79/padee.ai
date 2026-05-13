// ═══════════════════════════════════════════════════════════════════════════
// ChildCard — single verified-child tile on the parent dashboard.
// ═══════════════════════════════════════════════════════════════════════════
// Read-only summary the parent sees at a glance:
//   - Name + class chip
//   - Total XP (lifetime), current streak, longest streak
//   - Weakest subject (or "Just getting started" if no mastery yet)
//   - Last active relative timestamp
//
// Click anywhere on the card → opens <ChildProgressDetail> modal.
//
// Mobile-first per PRD §379: single column on phones, 2-up tablet, 3-up
// desktop. Layout is set in parent-v4.css (.parent-children-grid).
// ═══════════════════════════════════════════════════════════════════════════

const SUBJECT_PRETTY = {
  maths: 'Maths',
  mathematics: 'Maths',
  science: 'Science',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  english: 'English',
  hindi: 'Hindi',
  social_science: 'Social Studies',
  social_studies: 'Social Studies',
  computer_science: 'Computer Science',
}

function prettySubject(code) {
  if (!code) return ''
  return SUBJECT_PRETTY[code.toLowerCase()] || code
}

function formatAgo(iso) {
  if (!iso) return 'No activity yet'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export default function ChildCard({ child, onClick }) {
  const {
    name,
    classLevel,
    totalXP,
    streak,
    longestStreak,
    weakestSubject,
    lastActiveAt,
  } = child

  return (
    <button className="child-card" onClick={() => onClick?.(child)} type="button">
      <div className="child-head">
        <div className="child-name-block">
          <h3 className="child-name">{name || 'Your child'}</h3>
          {classLevel && <span className="child-class-pill">Class {classLevel}</span>}
        </div>
        <span className="child-chevron" aria-hidden>→</span>
      </div>

      <div className="child-stats-row">
        <div className="child-stat">
          <div className="child-stat-num tabular">{totalXP.toLocaleString('en-IN')}</div>
          <div className="child-stat-lbl">Total XP</div>
        </div>
        <div className="child-stat">
          <div className="child-stat-num tabular">
            {streak} <span className="child-stat-emoji" aria-hidden>🔥</span>
          </div>
          <div className="child-stat-lbl">
            Day streak
            {longestStreak > streak && (
              <> · best {longestStreak}</>
            )}
          </div>
        </div>
      </div>

      <div className="child-foot">
        <div className="child-weak">
          {weakestSubject ? (
            <>
              <span className="child-weak-lbl">Needs work:</span>{' '}
              <b>{prettySubject(weakestSubject.code)}</b>{' '}
              <span className="child-weak-pct">({weakestSubject.masteryPct}%)</span>
            </>
          ) : (
            <span className="t-sm">Just getting started</span>
          )}
        </div>
        <div className="child-last-active">
          {lastActiveAt ? `Active ${formatAgo(lastActiveAt)}` : 'No activity yet'}
        </div>
      </div>
    </button>
  )
}
