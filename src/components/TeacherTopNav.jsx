export default function TeacherTopNav({ active, onNavigate, teacher }) {
  const tabs = [
    { id: 'teacher-dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'worksheet', label: 'Worksheet', icon: '📄' },
    { id: 'test-generator', label: 'Test', icon: '📋' },
    { id: 'live-class', label: 'Live Class', icon: '🎓' },
    { id: 'students', label: 'Students', icon: '👥' },
  ]

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="px-4 pt-3 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {teacher?.avatar || 'T'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{teacher?.name || 'Teacher'}</p>
              <p className="text-[10px] text-gray-400">{teacher?.school || 'School'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
            <span className="text-xs">🎓</span>
            <span className="text-xs font-semibold text-amber-700">Teacher</span>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-t-lg border-b-2 transition-all ${
                active === tab.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
