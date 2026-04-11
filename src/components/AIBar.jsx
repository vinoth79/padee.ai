const CONTEXT_PLACEHOLDERS = {
  home:     'Ask your AI tutor anything…',
  learn:    'Ask about this chapter…',
  me:       'Ask about your progress…',
  practice: 'Stuck on a question? Ask me…',
}

// Persistent AI input bar — sits above the bottom nav on every student screen
export default function AIBar({ onAsk, currentScreen = 'home' }) {
  const placeholder = CONTEXT_PLACEHOLDERS[currentScreen] || 'Ask your AI tutor anything…'

  return (
    <div className="fixed z-20 left-0 right-0 max-w-sm mx-auto" style={{ bottom: '64px' }}>
    <div className="ai-bar-blur border-t border-white/40 px-3 py-2">
      <button
        onClick={() => onAsk('')}
        className="w-full flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 shadow-card border border-purple-100/60 active:scale-98 transition-all"
      >
        {/* Mini orb */}
        <div className="w-7 h-7 ai-orb-sm rounded-full flex-shrink-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-white/50 rounded-full" />
        </div>

        <span className="flex-1 text-sm text-brand-slate text-left font-medium truncate">
          {placeholder}
        </span>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Camera */}
          <div className="w-7 h-7 rounded-xl bg-brand-bg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          {/* Send */}
          <div className="w-7 h-7 rounded-xl bg-brand-primary flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
        </div>
      </button>
    </div>
    </div>
  )
}
