// ListenButton — reusable "🔊 Listen" / "⏸ Stop" toggle using Web Speech API.
// Gracefully renders nothing when the browser doesn't support speechSynthesis.
//
// Props:
//   text       — string to read aloud (markdown-stripped automatically by useSpeech)
//   size       — 'sm' | 'md'  (default 'sm')
//   variant    — 'icon' | 'labeled'  (default 'icon' — icon only, compact)
//   title      — accessible title override
//   onToggle   — optional callback after toggle (for analytics)
import { useSpeech } from '../../hooks/useSpeech'

export default function ListenButton({
  text,
  size = 'sm',
  variant = 'icon',
  title,
  onToggle,
}) {
  const { supported, speaking, loading, toggle } = useSpeech()
  if (!supported || !text) return null

  const iconSize = size === 'md' ? 16 : 14
  const state = loading ? 'loading' : speaking ? 'speaking' : 'idle'
  const label = state === 'loading' ? 'Loading' : state === 'speaking' ? 'Stop' : 'Listen'

  return (
    <button
      type="button"
      className={`listen-btn size-${size} variant-${variant} is-${state}`}
      onClick={(e) => { e.stopPropagation(); toggle(text); onToggle?.(state === 'idle') }}
      title={title || (state === 'speaking' ? 'Stop reading' : state === 'loading' ? 'Loading…' : 'Read aloud')}
      aria-label={state === 'speaking' ? 'Stop reading' : 'Read aloud'}
      aria-pressed={state === 'speaking'}
      disabled={false}>
      {state === 'loading' ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="listen-spinner">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
          <path d="M21 12a9 9 0 0 0-9-9" />
        </svg>
      ) : state === 'speaking' ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      )}
      {variant === 'labeled' && <span className="listen-btn-label">{label}</span>}
    </button>
  )
}
