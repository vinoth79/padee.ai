// ChapterRow — a single chapter summary in the list.
// Progress ring + CH N + status chip + chapter name + concepts count + "Open" button.
// Click to expand concepts in-place (parent controls expanded state).
import Ico from '../home-v4/Ico'

export default function ChapterRow({
  chapter,
  expanded = false,
  onToggle,
}) {
  const {
    chapter_no,
    chapter_name,
    concepts = [],
    passage_count = 0,
  } = chapter

  const { avgMastery, status, lastOpenedLabel } = computeChapterState(chapter)

  const ringColor = status === 'weak-spot' ? 'var(--c-accent)'
                  : status === 'in-progress' ? 'var(--c-green)'
                  : status === 'done' ? 'var(--c-green)'
                  : 'var(--c-muted-2)'

  return (
    <>
      <div className="chapter-row" onClick={onToggle}>
        <div className="ring">
          <RingSvg pct={avgMastery} color={ringColor} />
          <div className="ring-pct tabular">{avgMastery}%</div>
        </div>
        <div className="info">
          <div className="chno-row">
            <span className="chno">CH {chapter_no}</span>
            <span className={`status-chip ${status}`}>{statusLabel(status)}</span>
          </div>
          <div className="chname">{chapter_name || `Chapter ${chapter_no}`}</div>
          <div className="chmeta">
            {concepts.length > 0 && `${concepts.length} concept${concepts.length !== 1 ? 's' : ''}`}
            {concepts.length === 0 && passage_count > 0 && `${passage_count} passages indexed`}
            {concepts.length === 0 && passage_count === 0 && `Not yet available`}
            {lastOpenedLabel && ` · last opened ${lastOpenedLabel}`}
          </div>
        </div>
        <button className="open-btn" onClick={e => { e.stopPropagation(); onToggle() }}>
          {expanded ? 'Close' : 'Open'} <Ico name="chevronR" size={12} />
        </button>
      </div>
    </>
  )
}

// Compute aggregate state for the chapter based on its concepts.
// Priority order (per design plan): WEAK SPOT > IN PROGRESS > NEW > DONE.
export function computeChapterState(chapter) {
  const concepts = chapter.concepts || []
  if (concepts.length === 0) {
    return {
      avgMastery: 0, status: 'new-ch',
      lastOpenedLabel: null,
    }
  }

  const scored = concepts.filter(c => c.composite_score != null)
  const avgScore = scored.length
    ? scored.reduce((s, c) => s + c.composite_score, 0) / scored.length
    : 0
  const avgMastery = Math.round(avgScore * 100)

  const anyAttempts = concepts.some(c => (c.attempt_count || 0) > 0)
  const hasWeak = concepts.some(c => c.mastery_status === 'weak')
  const hasLearning = concepts.some(c => c.mastery_status === 'learning')

  let status
  if (!anyAttempts) status = 'new-ch'
  else if (hasWeak || avgMastery < 40) status = 'weak-spot'
  else if (avgMastery >= 80) status = 'done'
  else status = 'in-progress'

  // Last opened — max last_practiced_at across concepts
  const timestamps = concepts
    .map(c => c.last_practiced_at)
    .filter(Boolean)
    .map(t => new Date(t).getTime())
  let lastOpenedLabel = null
  if (timestamps.length > 0) {
    const maxTs = Math.max(...timestamps)
    const diffMs = Date.now() - maxTs
    const days = Math.floor(diffMs / 86400000)
    if (days < 1) lastOpenedLabel = 'today'
    else if (days === 1) lastOpenedLabel = 'Yesterday'
    else if (days < 7) lastOpenedLabel = `${days} days ago`
    else if (days < 14) lastOpenedLabel = 'last week'
    else if (days < 30) lastOpenedLabel = `${Math.floor(days / 7)} weeks ago`
    else lastOpenedLabel = `${Math.floor(days / 30)} months ago`
  }

  return { avgMastery, status, lastOpenedLabel }
}

function statusLabel(status) {
  return {
    'in-progress': 'In progress',
    'weak-spot':   'Weak spot',
    'new-ch':      'New',
    'done':        'Done',
  }[status] || ''
}

function RingSvg({ pct = 0, color = 'var(--c-accent)' }) {
  const size = 44, stroke = 5
  const RAD = (size - stroke) / 2
  const CIRC = 2 * Math.PI * RAD
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={RAD} fill="none" stroke="var(--c-hair-2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={RAD}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.max(0, Math.min(100, pct)) / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}
