// ═══════════════════════════════════════════════════════════════════════════
// TopWeakConceptsPanel — top 5 concepts students in this school are
// struggling with most (lowest avg mastery, ≥2 students affected).
// ═══════════════════════════════════════════════════════════════════════════
// Props:
//   concepts: [{ slug, name, chapter, avgMastery, studentsAffected }]
// ═══════════════════════════════════════════════════════════════════════════

export default function TopWeakConceptsPanel({ concepts = [] }) {
  if (concepts.length === 0) {
    return (
      <div className="weak-panel">
        <div className="head">Top weak concepts</div>
        <div className="empty-state">
          Need at least 2 students with practice/test data per concept before
          this lights up.
        </div>
      </div>
    )
  }

  return (
    <div className="weak-panel">
      <div className="head">Top weak concepts</div>
      {concepts.slice(0, 5).map((c, idx) => (
        <div key={c.slug || idx} className="weak-row">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="rank">{idx + 1}</span>
              <span className="name">{c.name}</span>
              <div className="meta" style={{ marginLeft: 32 }}>
                {c.chapter ? `${c.chapter} · ` : ''}{c.studentsAffected} student{c.studentsAffected === 1 ? '' : 's'} affected
              </div>
            </div>
            <span className="mastery">{Math.round(c.avgMastery ?? 0)}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}
