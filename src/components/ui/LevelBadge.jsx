import { levels } from '../../data/mockData'

export default function LevelBadge({ level, size = 'sm' }) {
  const lvl = levels.find(l => l.level === level) || levels[0]
  const sizeClass = size === 'lg'
    ? 'text-base px-4 py-1.5 gap-2'
    : size === 'md'
    ? 'text-sm px-3 py-1 gap-1.5'
    : 'text-xs px-2 py-0.5 gap-1'

  return (
    <span className={`inline-flex items-center ${sizeClass} bg-brand-light text-brand-primary font-bold rounded-full`}>
      <span>{lvl.icon}</span>
      <span>Lv.{level} {lvl.name}</span>
    </span>
  )
}
