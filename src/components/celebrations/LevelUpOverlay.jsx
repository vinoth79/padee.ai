import { useEffect, useState } from 'react'
import Confetti from '../Confetti'

const LEVEL_ICONS = {
  1: '🌱', 2: '🔍', 3: '📖', 4: '🧭', 5: '🎯',
  6: '📚', 7: '🚀', 8: '🏆', 9: '👑', 10: '💎',
}

export default function LevelUpOverlay({ newLevel, levelName, prevLevel, onDismiss }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // Small delay so confetti + transform kick in after render
    const t = setTimeout(() => setMounted(true), 40)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 41, 0.88)', backdropFilter: 'blur(6px)' }}
      onClick={onDismiss}>
      <Confetti active={mounted} />

      <div onClick={e => e.stopPropagation()}
        className="relative max-w-sm w-full rounded-3xl p-8 text-center transition-all duration-500"
        style={{
          background: 'linear-gradient(145deg, #0F1729 0%, #1E293B 100%)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          boxShadow: '0 25px 60px rgba(13, 148, 136, 0.4)',
          transform: mounted ? 'scale(1)' : 'scale(0.8)',
          opacity: mounted ? 1 : 0,
        }}>

        {/* Label */}
        <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4"
          style={{ color: '#818CF8' }}>
          ★ Level up ★
        </p>

        {/* Animated big emoji */}
        <div className="relative mb-4">
          <div className="text-7xl inline-block"
            style={{
              animation: mounted ? 'levelUpBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              filter: 'drop-shadow(0 0 20px rgba(129, 140, 248, 0.6))',
            }}>
            {LEVEL_ICONS[newLevel] || '🎉'}
          </div>
        </div>

        {/* Level transition */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-2xl font-bold font-mono" style={{ color: '#64748B' }}>Lv.{prevLevel}</span>
          <span className="text-lg" style={{ color: '#818CF8' }}>→</span>
          <span className="text-3xl font-bold font-mono"
            style={{
              background: 'linear-gradient(90deg, #5EEAD4 0%, #818CF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            Lv.{newLevel}
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
          You're now a {levelName}!
        </h2>
        <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
          Keep the streak alive. Every question, every doubt — it all adds up.
        </p>

        <button onClick={onDismiss}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'linear-gradient(90deg, #0D9488 0%, #818CF8 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
          }}>
          Keep going →
        </button>
      </div>

      <style>{`
        @keyframes levelUpBounce {
          0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
