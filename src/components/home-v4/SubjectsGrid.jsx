// SubjectsGrid — explicit subject → chapter → concept hierarchy per PRD 8B.
// Each card shows: subject name + mastery %, and nested: weakest chapter +
// weakest concept inside it (Layer 2 + Layer 3 of the recommendation model).
// Click → navigates to Learn with that subject filtered.

const TREND_ARROW = { down: '↓', stable: '→', up: '↑' }

export default function SubjectsGrid({ subjects = [], onSubjectClick, onViewAll }) {
  if (!subjects.length) return null
  return (
    <div className="subjects-grid-section">
      <div className="eyebrow-row">
        <span className="t-eyebrow">YOUR SUBJECTS</span>
        {onViewAll && (
          <button className="view-all" onClick={onViewAll}>View all →</button>
        )}
      </div>
      <div className="subjects-grid">
        {subjects.slice(0, 6).map(s => (
          <SubjectCard key={s.name} subject={s} onClick={() => onSubjectClick?.(s)} />
        ))}
      </div>
    </div>
  )
}

function SubjectCard({ subject, onClick }) {
  const pct = subject.masteryPct ?? 0
  const trend = subject.trend || (pct < 45 ? 'down' : pct >= 75 ? 'up' : 'stable')
  const hasData = subject.hasStarted
  const isEmpty = !hasData

  return (
    <button className={`subject-card ${isEmpty ? 'empty' : ''}`} onClick={onClick}>
      <div className="sc-top">
        <span className="sc-dot" style={{ background: subject.color }} />
        <span className="sc-name">{subject.name}</span>
        {hasData && (
          <span className={`sc-pct tabular ${trend === 'down' ? 'down' : trend === 'up' ? 'up' : ''}`}>
            {pct}% {TREND_ARROW[trend] || ''}
          </span>
        )}
      </div>

      {hasData && (
        <div className="sc-bar">
          <span style={{ width: `${pct}%`, background: subject.color }} />
        </div>
      )}

      <div className="sc-hier">
        {isEmpty ? (
          <span>Not started yet — tap to begin →</span>
        ) : subject.weakestChapter ? (
          <>
            Weakest: <b>{subject.weakestChapter}</b>
            {subject.weakestConcept && (
              <> · <span className="weak-concept">{subject.weakestConcept}</span></>
            )}
          </>
        ) : (
          <span>All chapters looking good.</span>
        )}
      </div>

      {hasData && (subject.strongCount != null || subject.weakCount != null) && (
        <div className="sc-footer">
          {subject.strongCount != null && (
            <span><span className="sw-strong">{subject.strongCount}</span> strong</span>
          )}
          {subject.weakCount != null && subject.strongCount != null && <span>·</span>}
          {subject.weakCount != null && (
            <span><span className="sw-weak">{subject.weakCount}</span> weak</span>
          )}
        </div>
      )}
    </button>
  )
}
