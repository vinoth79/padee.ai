import { levels } from '../data/mockData'
import Confetti from './Confetti'

export default function LevelUpOverlay({ level, visible, onDismiss }) {
  const lvl = levels.find(l => l.level === level) || levels[0]
  const next = levels.find(l => l.level === level + 1)

  if (!visible) return null

  return (
    <>
      <Confetti active={visible} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
        onClick={onDismiss}
      >
        <div
          className="mx-4 rounded-xl p-8 text-center max-w-xs w-full shadow-2xl animate-scale-in" style={{ background: '#0F1729' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="text-6xl mb-3 animate-bounce-slow">{lvl.icon}</div>
          <div className="text-amber-400 text-sm font-bold tracking-widest uppercase mb-1">Level Up!</div>
          <div className="text-white text-4xl font-black mb-1">Level {level}</div>
          <div className="text-brand-pale text-xl font-bold mb-4">{lvl.name}</div>
          <div className="text-brand-pale text-sm mb-6">
            You've been crushing it! Keep going —<br />
            {next ? `Level ${next.level} (${next.name}) is next!` : "You've reached the top!"}
          </div>
          <button
            onClick={onDismiss}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            Keep Learning →
          </button>
        </div>
      </div>
    </>
  )
}
