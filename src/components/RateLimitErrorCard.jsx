// ═══ RateLimitErrorCard ═══
// Shown in the chat when both Groq AND the OpenAI fallback have failed.
// Keeps the student productive instead of leaving them at a dead end.
//
// Actions:
//   • Take a quiz      → /practice (uses different LLM code path, often still works)
//   • Revisit doubts   → stays on /ask, shows history (student layout right panel handles this)
//   • Try different Q  → clears input, user types a new question
//   • Retry            → calls the parent-provided onRetry after countdown
//
// If no onRetry is provided, the retry button is hidden.
import { useEffect, useState } from 'react'

export default function RateLimitErrorCard({
  message,        // Friendly error message to show at top
  onRetry,        // () => void
  onTakeQuiz,     // () => void (navigate to practice)
  onClearAndAsk,  // () => void (clear input / history so they can type fresh)
  autoRetrySeconds = 15, // Countdown before retry button glows/auto-fires
}) {
  const [secondsLeft, setSecondsLeft] = useState(autoRetrySeconds)
  const [autoRetried, setAutoRetried] = useState(false)

  useEffect(() => {
    if (!onRetry) return
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, onRetry])

  return (
    <div className="w-full rounded-2xl p-5"
      style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D' }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">🤔</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: '#92400E' }}>
            AI is temporarily busy
          </h3>
          <p className="text-[14px] leading-relaxed" style={{ color: '#78350F' }}>
            {message || "All AI providers are at capacity. We'll be back in a few minutes."}
          </p>
        </div>
      </div>

      {/* Action chips */}
      <div className="flex flex-wrap gap-2 mt-4 mb-3">
        {onTakeQuiz && (
          <button onClick={onTakeQuiz}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors active:scale-95"
            style={{ background: '#0D9488', color: '#FFFFFF' }}>
            <span>⚡</span> Take a quick quiz
          </button>
        )}
        {onClearAndAsk && (
          <button onClick={onClearAndAsk}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors active:scale-95"
            style={{ background: '#FFFFFF', color: '#92400E', border: '1px solid #FCD34D' }}>
            <span>💡</span> Try a different question
          </button>
        )}
      </div>

      {/* Retry + countdown */}
      {onRetry && (
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(146,64,14,0.15)' }}>
          <p className="text-[11px]" style={{ color: '#92400E' }}>
            {secondsLeft > 0
              ? `You can retry automatically in ${secondsLeft}s`
              : 'Ready to retry now'}
          </p>
          <button onClick={() => { setAutoRetried(true); onRetry() }}
            disabled={autoRetried}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: secondsLeft <= 0 ? '#D97706' : '#FFFFFF',
              color: secondsLeft <= 0 ? '#FFFFFF' : '#92400E',
              border: secondsLeft <= 0 ? 'none' : '1px solid #FCD34D',
              opacity: autoRetried ? 0.5 : 1,
            }}>
            {autoRetried ? 'Retrying...' : secondsLeft <= 0 ? 'Retry now' : `Retry anyway`}
          </button>
        </div>
      )}
    </div>
  )
}
