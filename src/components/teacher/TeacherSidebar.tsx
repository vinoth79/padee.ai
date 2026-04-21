import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, ClipboardList, Users, Radio, LogOut, ShieldAlert, FileStack } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'command', label: 'Command Center', icon: LayoutDashboard, path: '/teacher' },
    ],
  },
  {
    label: 'Create',
    items: [
      { id: 'worksheet', label: 'Worksheet', icon: FileText, path: '/teacher/worksheet' },
      { id: 'mimic',     label: 'Paper Mimic', icon: FileStack, path: '/teacher/mimic' },
      { id: 'test',      label: 'Test Paper', icon: ClipboardList, path: '/teacher/test' },
      { id: 'live',      label: 'Live Class', icon: Radio, path: '/teacher/live' },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { id: 'students', label: 'Students', icon: Users, path: '/teacher/students' },
      { id: 'review',   label: 'Review queue', icon: ShieldAlert, path: '/teacher/review' },
    ],
  },
]

function getActiveId(pathname: string) {
  if (pathname === '/teacher') return 'command'
  if (pathname.includes('worksheet')) return 'worksheet'
  if (pathname.includes('/teacher/mimic')) return 'mimic'
  if (pathname.includes('/teacher/test')) return 'test'
  if (pathname.includes('live')) return 'live'
  if (pathname.includes('students')) return 'students'
  if (pathname.includes('review')) return 'review'
  return 'command'
}

export default function TeacherSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const activeId = getActiveId(location.pathname)

  async function handleLogout() {
    await signOut()
    localStorage.removeItem('padee-user')
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white flex flex-col h-screen" style={{ borderRight: '0.5px solid #E5E7EB' }}>
      {/* Brand */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: '#0D9488' }}>
            <div className="w-[9px] h-[9px] rounded-full" style={{ background: '#99F6E4' }} />
          </div>
          <span className="font-bold text-[16px]" style={{ color: '#111827' }}>Padee.ai</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded ml-auto" style={{ background: '#ECFDF5', color: '#0F766E' }}>Teacher</span>
        </div>
      </div>

      {/* Teacher info */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: '#F9FAFB' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: '#CCFBF1', border: '1.5px solid #5EEAD4', color: '#0F766E' }}>
            PN
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: '#111827' }}>Ms. Priya</p>
            <p className="text-[11px]" style={{ color: '#6B7280' }}>Physics · DPS R.K. Puram</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] px-3 mb-1.5" style={{ color: '#9CA3AF' }}>{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = activeId === item.id
                const Icon = item.icon
                return (
                  <button key={item.id} onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-all"
                    style={isActive ? { background: '#ECFDF5', color: '#0F766E' } : { color: '#6B7280' }}>
                    <Icon size={16} color={isActive ? '#0D9488' : '#9CA3AF'} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '0.5px solid #E5E7EB' }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-red-50 hover:text-red-600" style={{ color: '#9CA3AF' }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
    </aside>
  )
}
