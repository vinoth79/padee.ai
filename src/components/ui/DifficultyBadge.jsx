export default function DifficultyBadge({ difficulty }) {
  const map = {
    Easy:   'bg-emerald-100 text-emerald-700',
    Medium: 'bg-amber-100 text-amber-700',
    Hard:   'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[difficulty] || map.Medium}`}>
      {difficulty}
    </span>
  )
}
