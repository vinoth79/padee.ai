// PaBubble — AI response rendered with Pa mascot on the left and
// paper-background conversational text (NO card). Includes action chips,
// NCERT citation, and feedback icons.
import PaMascot from '../home-v4/PaMascot'
import FeedbackIcons from './FeedbackIcons'
import ListenButton from '../ui/ListenButton'
import MathText from '../ui/MathText'
import VisualExplanationBubble from './VisualExplanationBubble'
import InlineQuiz from './InlineQuiz'
import ChallengeView from './ChallengeView'

// Action chips matching current v3 set (8 total). Keep all per product ask.
const CHIPS = [
  { key: 'visual',    label: 'Explain visually ✨' },
  { key: 'simpler',   label: 'Simpler please' },
  { key: 'exam',      label: 'Show exam answer' },
  { key: 'quiz',      label: 'Quiz me on this' },
  { key: 'similar',   label: 'Similar question' },
  { key: 'challenge', label: 'Challenge me' },
  { key: 'reallife',  label: 'Real-life example' },
  { key: 'mistakes',  label: 'Common mistakes' },
]

export default function PaBubble({
  msg,
  onChip,
  onCloseQuiz,        // dismisses inline quiz (parent clears msg.showQuiz)
  onFeedback,
  onReport,
  onCopy,
  copied,
  showCopy = true,
  className: studentClass,  // Class level for the quiz API call
}) {
  const isStreaming = msg.streaming
  const isError = msg.error
  return (
    <div className="pa-bubble">
      <div className="pa-avatar">
        <PaMascot
          size={32}
          mood={isStreaming ? 'thinking' : 'speaking'}
          syncWithSpeech
        />
      </div>
      <div className="pa-content">
        {/* Response text — MathText renders LaTeX after stream completes.
            During streaming we show plain text (Q1=a) to avoid mid-stream
            half-rendered math. Challenge messages get a special view that
            gates the solution behind a "Show solution" button. */}
        <div>
          {msg.isChallenge && !isStreaming
            ? <ChallengeView text={msg.text || ''} />
            : <MathText text={msg.text || ''} streaming={isStreaming} />
          }
          {isStreaming && <span className="streaming-cursor" />}
        </div>

        {/* Visual explanation — appears inline under the response text */}
        {(msg.visualLoading || msg.visualHtml || msg.visualError) && (
          <VisualExplanationBubble
            html={msg.visualHtml}
            loading={msg.visualLoading}
            error={msg.visualError}
            cached={msg.visualCached}
            onRetry={() => onChip?.('visual:force')}
          />
        )}

        {/* Inline quiz widget — toggled by the Quiz Me chip */}
        {msg.showQuiz && !isStreaming && (
          <InlineQuiz
            context={msg.text}
            subject={msg.subject || 'Physics'}
            className={studentClass || 10}
            onClose={() => onCloseQuiz?.(msg.id)}
          />
        )}

        {/* Action chips — only on completed non-error responses */}
        {!isStreaming && !isError && msg.text && (
          <div className="chip-row">
            {CHIPS.map(c => (
              <button key={c.key} className="chip" onClick={() => onChip?.(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Meta row: NCERT citation + feedback icons + copy */}
        {!isStreaming && !isError && msg.text && (
          <div className="pa-meta">
            {msg.ncertSource ? (
              <span className="ncert-chip">📖 {msg.ncertSource}</span>
            ) : <span />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ListenButton text={msg.text} title="Read this answer aloud" />
              {showCopy && (
                <button
                  onClick={() => onCopy?.(msg.id, msg.text)}
                  className="feedback-btn"
                  title="Copy answer"
                  aria-label="Copy">
                  <svg className="ico" width="15" height="15" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              {copied && <span style={{ fontSize: 11, color: 'var(--c-green)' }}>Copied</span>}
              {msg.sessionId && (
                <FeedbackIcons
                  msgId={msg.id}
                  feedback={msg._feedback}
                  onFeedback={onFeedback}
                  onReport={onReport}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Exposed so the parent screen can reuse the same chip list when deciding
// prompts (the parent handles the actual LLM call — this component just tells
// it which key was clicked).
export { CHIPS }
