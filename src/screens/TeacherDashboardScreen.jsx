import { teacherProfile } from '../data/mockData'
import TeacherAlertFeed from '../components/teacher/TeacherAlertFeed'
import TeacherRightPanel from '../components/teacher/TeacherRightPanel'

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TeacherDashboardScreen({ onNavigate }) {
  const teacher = teacherProfile

  return (
    <div className="pt-6 pb-10">
      {/* Header */}
      <div className="px-5 lg:px-6 mb-5">
        <h1 className="text-[22px] font-bold" style={{ color: '#111827' }}>{greet()}, {teacher.name.split(' ').slice(0, -1).join(' ')} 👋</h1>
        <p className="text-[14px] mt-0.5" style={{ color: '#6B7280' }}>Class 10A has a unit test in 3 days · 38 students · 72% avg score</p>
      </div>

      {/* ═══ 3-PANE: Center (alerts) + Right (actions/health/spotlight) ═══ */}
      <div className="px-5 lg:px-6">
        <div className="flex gap-5">
          {/* Center pane: AI alert feed + recent activity */}
          <div className="flex-1 min-w-0">
            <TeacherAlertFeed onNavigate={onNavigate} />
          </div>

          {/* Right pane: actions + health + spotlight (desktop only) */}
          <div className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-6">
              <TeacherRightPanel onNavigate={onNavigate} />
            </div>
          </div>
        </div>

        {/* Mobile: right panel content stacked below */}
        <div className="lg:hidden mt-6">
          <TeacherRightPanel onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  )
}
