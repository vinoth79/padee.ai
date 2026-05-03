// UpcomingTestsCard — "UPCOMING TESTS · This week". Lower-right card.
// Each row: when eyebrow + title + subject + prep progress + "Start prep plan" link.
export default function UpcomingTestsCard({ tests = [], onPrep }) {
  return (
    <div className="pd-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="t-eyebrow" style={{ color: 'var(--c-accent)', marginBottom: 2 }}>
            UPCOMING TESTS
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>
            {tests.length > 0 ? 'This week' : 'None scheduled'}
          </div>
        </div>
      </div>

      {tests.length === 0 ? (
        <p className="t-sm" style={{ margin: 0 }}>
          No tests scheduled. Your teacher will notify you when one is assigned.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tests.slice(0, 3).map((t, i) => (
            <div key={i}
              style={{
                padding: '10px 12px', border: '1px solid var(--c-hair)', borderRadius: 10,
                background: t.urgent ? 'var(--c-amber-l)' : 'transparent',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span className="t-xs" style={{
                  fontWeight: 700,
                  color: t.urgent ? '#8A5A00' : 'var(--c-muted)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {t.when}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>
                {t.title}
              </div>
              <div className="t-xs" style={{ color: 'var(--c-muted)', marginBottom: 6 }}>
                {t.subject}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="pd-progress" style={{ flex: 1, height: 5 }}>
                  <span style={{
                    width: `${t.prep}%`,
                    background: t.urgent ? 'var(--c-accent)' : 'var(--c-violet)',
                  }} />
                </div>
                <span className="tabular t-xs" style={{ fontWeight: 600, color: 'var(--c-muted)' }}>
                  {t.prep}%
                </span>
              </div>
              <button onClick={() => onPrep?.(t)}
                style={{
                  marginTop: 8, fontSize: 11.5, fontWeight: 600,
                  color: t.urgent ? 'var(--c-accent-d)' : 'var(--c-violet)',
                  cursor: 'pointer', background: 'none', border: 'none',
                  padding: 0, fontFamily: 'inherit',
                }}>
                Start prep plan →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
