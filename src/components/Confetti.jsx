import { useEffect, useState } from 'react'

const COLORS = ['#0D9488', '#059669', '#D97706', '#2563EB', '#EA580C', '#7C3AED', '#E11D48']
const SHAPES = ['●', '■', '▲', '◆']

export default function Confetti({ active }) {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        delay: Math.random() * 0.4,
        duration: 1.8 + Math.random() * 1.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 7 + Math.random() * 9,
      }))
      setPieces(newPieces)
      const t = setTimeout(() => setPieces([]), 4000)
      return () => clearTimeout(t)
    }
  }, [active])

  if (!pieces.length) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute confetti-piece select-none"
          style={{
            left: `${p.x}%`, top: '-20px',
            color: p.color, fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.shape}
        </div>
      ))}
    </div>
  )
}
