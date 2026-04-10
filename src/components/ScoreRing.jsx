import { useEffect, useState } from 'react'

export default function ScoreRing({ percent, size = 80, strokeWidth = 7 }) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference
  const color = percent >= 80 ? '#22C55E' : percent >= 50 ? '#F59E0B' : '#14B8A6'

  useEffect(() => {
    const t = setTimeout(() => setAnimated(percent), 100)
    return () => clearTimeout(t)
  }, [percent])

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  )
}
