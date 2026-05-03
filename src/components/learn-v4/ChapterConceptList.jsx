// ChapterConceptList — expanded concept rows under a chapter.
// Each row: status dot + concept name + score → click routes to Ask AI.
const STATUS_COLOR = {
  weak:        '#E85D3A',
  learning:    '#FFB547',
  on_track:    '#36D399',
  mastered:    '#36D399',
  not_started: '#B8B8C0',
}

export default function ChapterConceptList({ concepts = [], onConceptClick }) {
  if (concepts.length === 0) {
    return (
      <div className="concept-list">
        <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--c-muted)' }}>
          Content indexed but concepts haven't been published by your teacher yet. Tap Open to ask Pa about this chapter.
        </div>
      </div>
    )
  }
  return (
    <div className="concept-list">
      {concepts.map(c => (
        <button key={c.concept_slug} className="concept-row"
          onClick={() => onConceptClick(c)}>
          <span className="cstatus" style={{ background: STATUS_COLOR[c.mastery_status] || STATUS_COLOR.not_started }} />
          <span className="cname">{c.concept_name}</span>
          {c.composite_score != null && (
            <span className="cscore tabular">{Math.round(c.composite_score * 100)}%</span>
          )}
        </button>
      ))}
    </div>
  )
}
