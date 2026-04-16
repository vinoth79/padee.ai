import { useEffect, useState } from 'react'

export default function BadgeUnlockSheet({ badge, onDismiss }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(15, 23, 41, 0.6)', backdropFilter: 'blur(3px)' }}
      onClick={onDismiss}>
      <div onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-7 text-center transition-all duration-300"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 -8px 40px rgba(13, 148, 136, 0.25)',
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          opacity: mounted ? 1 : 0,
        }}>

        <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4"
          style={{ color: '#0D9488' }}>
          Badge unlocked
        </p>

        {/* Spinning ring behind icon */}
        <div className="relative w-28 h-28 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #5EEAD4, #818CF8, #F59E0B, #EC4899, #5EEAD4)',
              animation: mounted ? 'badgeRingSpin 3s linear infinite' : 'none',
              padding: '4px',
            }}>
            <div className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                background: '#FFFFFF',
                animation: mounted ? 'badgePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              }}>
              <span className="text-5xl"
                style={{ filter: 'drop-shadow(0 4px 10px rgba(13, 148, 136, 0.3))' }}>
                {badge.icon || '🏅'}
              </span>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>
          {badge.name}
        </h3>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          You earned a new badge. Keep going to unlock more.
        </p>

        <button onClick={onDismiss}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#0D9488', color: '#FFFFFF' }}>
          Awesome!
        </button>
      </div>

      <style>{`
        @keyframes badgeRingSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
