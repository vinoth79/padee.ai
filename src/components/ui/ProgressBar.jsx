export default function ProgressBar({ value, max = 100, color = 'purple', height = 'h-2', showLabel = false }) {
  const percent = Math.min(100, Math.round((value / max) * 100))
  const colorMap = {
    purple: 'bg-brand-maths',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    amber: 'bg-amber-400',
    pink: 'bg-pink-500',
    indigo: 'bg-brand-light0',
  }
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${colorMap[color] || 'bg-brand-maths'} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
