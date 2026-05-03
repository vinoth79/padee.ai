// RailWidgets — four small cards for the right rail, matching reference shapes.
//   PaStatusCard      — Pa avatar + "Pa · Your AI study buddy"
//   QuickQuestCard    — secondary quest (title, min, xp, ink CTA)
//   AskPaSuggestions  — 3 suggestion pills
//   ResumeCard        — "PICK UP WHERE YOU LEFT OFF" with chapter + progress bar
import PaMascot from './PaMascot'
import Ico from './Ico'

export function PaStatusCard({ subject = 'Science', mood = 'idle', glow = false, statusText }) {
  const dotColor = mood === 'celebrate' ? 'var(--c-amber)' : 'var(--c-green)'
  const defaultText = mood === 'thinking'
    ? `Thinking in ${subject}…`
    : mood === 'celebrate'
      ? "Goal crushed — nice work!"
      : mood === 'speaking'
        ? 'Ready when you are'
        : 'Your AI study buddy'
  return (
    <div className="rail-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
      <PaMascot size={40} mood={mood} glow={glow} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>Pa</div>
        <div className="t-xs" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
          {statusText || defaultText}
        </div>
      </div>
    </div>
  )
}

export function QuickQuestCard({ title, min, xp, onStart }) {
  if (!title) return null
  return (
    <div className="rail-card">
      <div className="t-eyebrow" style={{ color: 'var(--c-accent)', marginBottom: 6 }}>QUICK QUEST</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.2px' }}>
        {title}
      </div>
      <div className="t-xs tabular" style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Ico name="clock" size={11} />{min} min
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Ico name="sparkle" size={11} color="#FFB547" />+{xp} XP
        </span>
      </div>
      <button className="pd-btn ink" style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}
        onClick={onStart}>
        Start quest <Ico name="arrow" size={13} />
      </button>
    </div>
  )
}

export function AskPaSuggestions({ items = [], onAsk }) {
  if (!items.length) return null
  return (
    <div>
      <div className="t-eyebrow" style={{ marginBottom: 8, padding: '0 4px' }}>TRY ASKING PA</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((q, i) => (
          <button key={i} className="suggest-pill" onClick={() => onAsk?.(q)}>
            <Ico name="ask" size={13} color="var(--c-muted)" />
            <span>{q}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ResumeCard({ subject, chapter, progress = 0, color = 'var(--c-accent)', onResume }) {
  if (!chapter) return null
  return (
    <div className="rail-card" style={{ padding: 12 }}>
      <div className="t-eyebrow" style={{ color: 'var(--c-muted)', marginBottom: 6 }}>
        PICK UP WHERE YOU LEFT OFF
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: color + '22', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Ico name="learn" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--c-ink)', lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{chapter}</div>
          <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 1 }}>{subject}</div>
        </div>
      </div>
      <div className="pd-progress" style={{ marginBottom: 6 }}>
        <span style={{ width: `${progress}%`, background: color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--c-muted)' }}>
        <span className="tabular">{progress}% complete</span>
        <button onClick={onResume}
          style={{
            background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
            color, fontWeight: 600, fontSize: 11, padding: 0,
          }}>
          Resume →
        </button>
      </div>
    </div>
  )
}
