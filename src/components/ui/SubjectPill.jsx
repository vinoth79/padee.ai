export default function SubjectPill({ subject, size = 'sm' }) {
  const colorMap = {
    Physics: 'bg-blue-100 text-blue-700 border-blue-200',
    Chemistry: 'bg-orange-100 text-orange-700 border-orange-200',
    Mathematics: 'bg-purple-100 text-purple-700 border-purple-200',
    Biology: 'bg-green-100 text-green-700 border-green-200',
    'Computer Science': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    English: 'bg-pink-100 text-pink-700 border-pink-200',
    'Social Science': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }
  const iconMap = {
    Physics: '⚡', Chemistry: '🧪', Mathematics: '📐',
    Biology: '🌿', 'Computer Science': '💻', English: '📖', 'Social Science': '🌍',
  }
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  const classes = colorMap[subject] || 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${classes}`}>
      <span>{iconMap[subject] || '📚'}</span>
      <span>{subject}</span>
    </span>
  )
}
