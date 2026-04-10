export default function MasteryChip({ mastery }) {
  const map = {
    mastered:     { label: 'Mastered', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    learning:     { label: 'Learning', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    beginner:     { label: 'Beginner', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    'not-started':{ label: 'Not Started', cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' },
  }
  const { label, cls, dot } = map[mastery] || map['not-started']
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
