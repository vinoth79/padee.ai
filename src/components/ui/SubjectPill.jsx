export default function SubjectPill({ subject, size = 'sm' }) {
  const colorMap = {
    Physics:            'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    Chemistry:          'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]',
    Mathematics:        'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
    Biology:            'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    'Computer Science': 'bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC]',
    English:            'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
    'Social Science':   'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
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
