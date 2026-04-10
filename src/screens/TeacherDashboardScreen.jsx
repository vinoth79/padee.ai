import { teacherProfile, classPerformanceData } from '../data/mockData'
import AIOrb from '../components/AIOrb'

const ACTIONS = [
  {
    label: 'Worksheet',
    icon: '📄',
    screen: 'worksheet',
    desc: 'AI-generated in 10 seconds',
    from: 'from-blue-500', to: 'to-indigo-600',
  },
  {
    label: 'Test',
    icon: '📋',
    screen: 'test-generator',
    desc: 'Full CBSE pattern',
    from: 'from-violet-500', to: 'to-purple-700',
  },
  {
    label: 'Live Class',
    icon: '🎓',
    screen: 'live-class',
    desc: 'Real-time doubt handler',
    from: 'from-emerald-400', to: 'to-green-600',
  },
  {
    label: 'Students',
    icon: '👥',
    screen: 'students',
    desc: 'Track performance',
    from: 'from-orange-400', to: 'to-amber-600',
  },
]

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TeacherDashboardScreen({ onNavigate }) {
  const teacher = teacherProfile

  return (
    <div className="min-h-screen bg-brand-bg pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-dark via-brand-primary to-violet-600 px-5 pt-12 pb-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-base border-2 border-white/30">
            {teacher.avatar}
          </div>
          <div className="flex-1">
            <p className="text-white/60 text-xs">{greet()},</p>
            <h1 className="text-white font-black text-xl">{teacher.name.split(' ').slice(0, -1).join(' ')} 👋</h1>
            <p className="text-white/50 text-xs">{teacher.school.split(',')[0]}</p>
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="text-white/60 text-xs border border-white/20 px-3 py-1.5 rounded-full font-semibold hover:bg-white/10 transition-colors"
          >
            Student view
          </button>
        </div>

        {/* Class stats */}
        <div className="grid grid-cols-3 gap-2 bg-white/10 rounded-2xl p-3">
          {[
            { value: '38', label: 'Students', icon: '👥' },
            { value: '72%', label: 'Avg score', icon: '📊' },
            { value: '5', label: 'Created', icon: '📄' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <span className="text-lg">{s.icon}</span>
              <p className="text-white font-black text-xl">{s.value}</p>
              <p className="text-white/50 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI suggestion strip */}
      <div className="px-4 mt-4 mb-5">
        <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-card">
          <AIOrb size="xs" state="idle" />
          <div className="flex-1">
            <p className="text-xs text-brand-slate">AI noticed:</p>
            <p className="text-sm font-bold text-brand-navy">8 students struggle with Ohm's Law. Create a worksheet?</p>
          </div>
          <button onClick={() => onNavigate('worksheet')} className="text-xs font-black text-brand-primary bg-violet-50 px-3 py-1.5 rounded-full flex-shrink-0">
            Create →
          </button>
        </div>
      </div>

      {/* 4 action cards */}
      <div className="px-4 mb-5">
        <h2 className="text-xs font-bold text-brand-slate uppercase tracking-wider mb-3">What do you need?</h2>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map(action => (
            <button
              key={action.screen}
              onClick={() => onNavigate(action.screen)}
              className={`bg-gradient-to-br ${action.from} ${action.to} rounded-3xl p-4 text-left shadow-action relative overflow-hidden active:scale-[0.97] transition-transform`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="text-3xl mb-3">{action.icon}</div>
              <p className="text-white font-black text-base leading-tight">{action.label}</p>
              <p className="text-white/60 text-xs mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Class health */}
      <div className="px-4">
        <h2 className="text-xs font-bold text-brand-slate uppercase tracking-wider mb-3">Class health</h2>
        <div className="bg-white rounded-3xl p-4 shadow-card">
          {[
            { subject: 'Physics', accuracy: 68, color: 'bg-blue-500', status: 'Needs attention' },
            { subject: 'Chemistry', accuracy: 74, color: 'bg-amber-500', status: 'Improving' },
            { subject: 'Mathematics', accuracy: 82, color: 'bg-violet-500', status: 'Strong' },
            { subject: 'Biology', accuracy: 71, color: 'bg-emerald-500', status: 'Improving' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-brand-navy">{s.subject}</span>
                  <span className="text-xs font-bold text-brand-slate">{s.accuracy}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.accuracy}%` }} />
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                s.status === 'Strong' ? 'bg-emerald-50 text-emerald-700' :
                s.status === 'Improving' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-600'
              }`}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
