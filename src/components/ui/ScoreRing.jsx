import { useEffect, useState } from 'react'

export default function ScoreRing({ percent, size = 80, strokeWidth = 7 }) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  const color = percent >= 80 ? '#059669' : percent >= 60 ? '#D97706' : '#DC2626'

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(percent), 100)
    return () => clearTimeout(timer)
  }, [percent])

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
      />
    </svg>
  )
}
