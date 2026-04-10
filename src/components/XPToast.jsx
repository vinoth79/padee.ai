import { useEffect } from 'react'

export default function XPToast({ xp, label = '', visible, onDone }) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => onDone?.(), 2400)
      return () => clearTimeout(t)
    }
  }, [visible, onDone])

  if (!visible) return null

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 xp-toast pointer-events-none">
      <div className="flex items-center gap-2 bg-brand-xp text-white font-black text-sm px-5 py-2.5 rounded-full shadow-lg">
        <span>⚡</span>
        <span>+{xp} XP{label ? ` — ${label}` : ''}</span>
      </div>
    </div>
  )
}
