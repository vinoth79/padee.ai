// AskHeader — Pa identity + Voice/Snap action buttons above the chat.
import PaMascot from '../home-v4/PaMascot'
import Ico from '../home-v4/Ico'

export default function AskHeader({
  subject = 'Science',
  classLevel = 10,
  thinking = false,
  memoryUsed = false,
  onVoice,
  onSnap,
}) {
  return (
    <div className="ask-header">
      <div style={{ flexShrink: 0 }}>
        <PaMascot size={48} mood={thinking ? 'thinking' : 'speaking'} />
      </div>
      <div className="identity">
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>
          Pa · your study buddy
        </div>
        <div className="t-xs" style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 2 }}>
          <span className="status-dot" />
          {thinking ? (
            <>Thinking in {subject} · Class {classLevel}</>
          ) : (
            <>
              Ready in {subject} · Class {classLevel}
              {memoryUsed && (
                <span style={{ marginLeft: 8, color: 'var(--c-green)', fontWeight: 500 }}>
                  · remembering your profile
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="actions">
        <button className="action-btn" onClick={onVoice} title="Voice input (coming soon)">
          <Ico name="clock" size={14} />
          <span>Voice</span>
        </button>
        <button className="action-btn" onClick={onSnap} title="Snap a photo of your question">
          <Ico name="sparkle" size={14} />
          <span>Snap</span>
        </button>
      </div>
    </div>
  )
}
