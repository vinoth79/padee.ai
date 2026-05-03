// AskInput — pill-shape input bar: camera, textarea, mic, circular vermillion send.
import { useRef } from 'react'

// Simple inline SVG icons (no deps, stroke 1.8)
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
  </svg>
)

export default function AskInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Ask Pa anything about your syllabus…',
  pendingImage,
  onPickImage,
  onClearImage,
  onVoice,
  inputRef,
}) {
  const fileInputRef = useRef(null)

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((value.trim() || pendingImage) && !disabled) onSend()
    }
  }

  return (
    <div className="ask-input-wrap">
      {pendingImage && (
        <div className="pending-image-pill">
          <span>📎 {pendingImage.name || 'photo attached'}</span>
          <button className="x-btn" onClick={onClearImage} aria-label="Remove image">✕</button>
        </div>
      )}
      <div className="ask-input">
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach a photo" aria-label="Attach photo">
          <CameraIcon />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
          onChange={onPickImage} style={{ display: 'none' }} />

        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          style={{ resize: 'none' }}
        />

        <button className="icon-btn" onClick={onVoice} title="Voice input" aria-label="Voice">
          <MicIcon />
        </button>
        <button className="send-btn" onClick={onSend} disabled={disabled || (!value.trim() && !pendingImage)}
          aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
