import { useEffect, useState } from 'react'

export default function XPToast({ xp, message = '', visible, onDone }) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => onDone?.(), 2200)
      return () => clearTimeout(t)
    }
  }, [visible, onDone])

  if (!visible) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 xp-toast pointer-events-none">
      <div className="flex items-center gap-2 bg-amber-400 text-amber-900 font-bold text-sm px-4 py-2 rounded-full shadow-lg">
        <span>⚡</span>
        <span>+{xp} XP {message}</span>
      </div>
    </div>
  )
}
