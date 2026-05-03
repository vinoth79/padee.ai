// PastTestCard — single card in the "Past · last 3" grid.
// Letter grade + time-ago + title + subject + score/total + %.
export default function PastTestCard({ test, onClick }) {
  const pct = test.total_marks > 0 ? Math.round((test.score / test.total_marks) * 100) : 0
  const grade = gradeLetter(pct)           // A+, A, B+, B, C, D
  const gradeClass = gradeBand(pct)        // g-a | g-b | g-c | g-d
  const timeAgo = formatAgo(test.completed_at || test.created_at)

  return (
    <button className="past-card" onClick={onClick}>
      <div className="top-row">
        <div className={`grade ${gradeClass}`}>{grade}</div>
        <div className="when">{timeAgo}</div>
      </div>
      <div className="ttl">{test.title}</div>
      <div className="subj">{test.subject}</div>
      <div className="score-row">
        <span className={`score tabular ${gradeClass.replace('g-', 's-')}`}>
          {test.score}/{test.total_marks}
        </span>
        <span className="pct tabular">· {pct}%</span>
      </div>
    </button>
  )
}

// Letter grade bands per plan Q9
export function gradeLetter(pct) {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  return 'D'
}
export function gradeBand(pct) {
  if (pct >= 80) return 'g-a'
  if (pct >= 60) return 'g-b'
  if (pct >= 50) return 'g-c'
  return 'g-d'
}
function formatAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
