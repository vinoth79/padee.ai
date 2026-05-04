// ═══════════════════════════════════════════════════════════════════════════
// SchoolStatsTiles — 4-tile grid showing the school's headline stats.
// ═══════════════════════════════════════════════════════════════════════════
// Reads counts from /api/school/dashboard. Capacity tile (students) shows
// an amber border when at >= 90% utilisation.
//
// Props:
//   counts = { students, teachers, doubtsToday, doubtsLast7d }
//   maxStudents
//   maxDoubtsPerDay
// ═══════════════════════════════════════════════════════════════════════════

export default function SchoolStatsTiles({ counts, maxStudents, maxDoubtsPerDay }) {
  const studentUsage = (counts?.students ?? 0) / (maxStudents || 1)
  const studentsAtCap = studentUsage >= 0.9
  const doubtUsage = (counts?.doubtsToday ?? 0) / (maxDoubtsPerDay || 1)
  const doubtsAtCap = doubtUsage >= 0.9

  return (
    <div className="stat-tiles">
      <Tile
        label="Students"
        warn={studentsAtCap}
      >
        <span className="tabular">{counts?.students ?? 0}</span>
        {maxStudents && <span className="denom"> / {maxStudents}</span>}
      </Tile>

      <Tile label="Teachers">
        <span className="tabular">{counts?.teachers ?? 0}</span>
      </Tile>

      <Tile label="Doubts today" warn={doubtsAtCap}>
        <span className="tabular">{(counts?.doubtsToday ?? 0).toLocaleString()}</span>
        {doubtsAtCap && (
          <span className="denom"> / {maxDoubtsPerDay?.toLocaleString()}</span>
        )}
      </Tile>

      <Tile label="Doubts · last 7d">
        <span className="tabular">{(counts?.doubtsLast7d ?? 0).toLocaleString()}</span>
      </Tile>
    </div>
  )
}

function Tile({ label, warn, children }) {
  return (
    <div className={`stat-tile ${warn ? 'warn' : ''}`}>
      <div className="label">{label}</div>
      <div className="stat">{children}</div>
    </div>
  )
}
