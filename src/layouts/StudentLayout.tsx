import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { HomeIcon, AskAIIcon, LearnIcon, TestsIcon, ProgressIcon } from '../components/icons/NavIcons'
import { Flame, LogOut } from 'lucide-react'
import CelebrationHost from '../components/celebrations/CelebrationHost'

const NAV_ITEMS = [
  { id: 'home',     label: 'Home',     icon: HomeIcon,     path: '/home' },
  { id: 'ask',      label: 'Ask AI',   icon: AskAIIcon,    path: '/ask' },
  { id: 'learn',    label: 'Learn',    icon: LearnIcon,    path: '/learn' },
  { id: 'tests',    label: 'Tests',    icon: TestsIcon,    path: '/tests' },
  { id: 'progress', label: 'Progress', icon: ProgressIcon, path: '/progress' },
]

const MOBILE_TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon, path: '/home' },
  { id: 'ask',  label: 'Ask AI', icon: AskAIIcon, path: '/ask' },
  { id: 'learn', label: 'Learn', icon: LearnIcon, path: '/learn' },
  { id: 'progress', label: 'Me', icon: ProgressIcon, path: '/progress' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getActiveTab(pathname: string) {
  if (pathname.startsWith('/home')) return 'home'
  if (pathname.startsWith('/ask')) return 'ask'
  if (pathname.startsWith('/learn')) return 'learn'
  if (pathname.startsWith('/tests')) return 'tests'
  if (pathname.startsWith('/practice')) return 'tests'
  if (pathname.startsWith('/progress')) return 'progress'
  return 'home'
}

export default function StudentLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useUser()
  const { signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    localStorage.removeItem('padee-user')
    localStorage.removeItem('padee-ask-ai-messages')
    localStorage.removeItem('padee-ask-ai-subject')
    navigate('/login', { replace: true })
  }
  const activeTab = getActiveTab(location.pathname)
  const goalPercent = Math.min(100, Math.round((user.dailyXPEarned / user.dailyGoal) * 100))

  // ═══ Single Outlet for the matched route.
  // The three chrome sections (desktop sidebar, tablet rail, mobile bottom tabs)
  // are all mounted simultaneously but CSS-hidden based on breakpoint — only
  // the Outlet itself is deliberately kept to a single instance so the child
  // screen mounts once (no duplicate effects/state).
  return (
    <div className="h-screen flex flex-col sm:flex-row overflow-hidden" style={{ background: '#F8F7F4' }}>
      {/* Celebration overlays (level-up / badge unlock) */}
      <CelebrationHost />

      {/* ═══ DESKTOP SIDEBAR (≥ lg) ═══ */}
      <aside className="hidden lg:flex w-[220px] flex-shrink-0 bg-white flex-col h-screen" style={{ borderRight: '0.5px solid #E5E7EB' }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: '#0D9488' }}>
              <div className="w-[9px] h-[9px] rounded-full" style={{ background: '#99F6E4' }} />
            </div>
            <span className="font-bold text-[16px]" style={{ color: '#111827' }}>Padee.ai</span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button onClick={() => navigate('/progress')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#F0FDFA] transition-colors" style={{ background: '#F9FAFB' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: '#CCFBF1', border: '1.5px solid #5EEAD4', color: '#0F766E' }}>
              {user.avatar}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: '#111827' }}>{user.studentName.split(' ')[0]}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>Class {user.studentClass} · Lv {user.level}</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all"
                style={isActive ? { background: '#ECFDF5', color: '#0F766E' } : { color: '#6B7280' }}>
                <Icon active={isActive} />
                <span>{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />}
              </button>
            )
          })}
          <div className="pt-3 mt-3" style={{ borderTop: '0.5px solid #E5E7EB' }}>
            <button onClick={() => navigate('/practice')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all hover:bg-amber-50 hover:text-amber-700" style={{ color: '#6B7280' }}>
              <span className="text-base">⚡</span><span>Practice</span>
            </button>
          </div>
        </nav>

        <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid #E5E7EB' }}>
          <div className="px-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>Lv {user.level} · {user.levelName}</span>
              <span className="text-[11px] font-semibold font-mono" style={{ color: '#9CA3AF' }}>{user.xp} XP</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  background: '#0D9488',
                  width: user.nextLevelMinXP
                    ? `${Math.min(100, Math.round(((user.xp - user.levelMinXP) / (user.nextLevelMinXP - user.levelMinXP)) * 100))}%`
                    : '100%',
                }} />
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-50 hover:text-red-600" style={{ color: '#9CA3AF' }}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* ═══ TABLET RAIL (sm–lg) ═══ */}
      <aside className="hidden sm:flex lg:hidden w-14 flex-shrink-0 bg-white flex-col h-screen items-center py-4" style={{ borderRight: '0.5px solid #E5E7EB' }}>
        <div className="w-6 h-6 rounded-[7px] flex items-center justify-center mb-4" style={{ background: '#0D9488' }}>
          <div className="w-[9px] h-[9px] rounded-full" style={{ background: '#99F6E4' }} />
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => navigate(item.path)} title={item.label}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                style={isActive ? { background: '#ECFDF5' } : {}}>
                <Icon active={isActive} />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ═══ MAIN COLUMN (content + optional desktop topbar) — single Outlet lives here ═══ */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* DESKTOP TOP BAR (≥ lg only) */}
        <header className="hidden lg:flex flex-shrink-0 h-14 bg-white/80 backdrop-blur-sm px-6 items-center justify-between" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
          <div>
            <p className="text-[16px] font-semibold" style={{ color: '#111827' }}>{getGreeting()}, {user.studentName.split(' ')[0]}</p>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Today's Study Session</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
              <Flame size={14} fill="#D97706" color="#D97706" />
              <span className="text-[13px] font-semibold" style={{ color: '#B45309' }}>{user.streak}</span>
              <span className="text-[13px] font-medium" style={{ color: '#D97706' }}>day streak</span>
            </div>
            <div className="relative w-9 h-9">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#CCFBF1" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#0D9488" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - goalPercent / 100)}`}
                  className="transition-all duration-700" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono" style={{ color: '#0D9488' }}>{goalPercent}%</span>
            </div>
          </div>
        </header>

        {/* CONTENT — single Outlet. Responsive max-width via inner wrapper.
            Note: previously wrapped in <AnimatePresence mode="wait"> keyed on
            location.pathname. That forced a full unmount→mount on every
            navigation, which tore down in-flight streaming fetches (SSE reader
            stops receiving, setMessages becomes a no-op, empty AI bubbles).
            The page-transition animation is not worth losing every streamed
            response, so the key-based remount is removed. Individual screens
            can still mount their own inner fade if desired. */}
        <main className="flex-1 overflow-y-auto pb-20 sm:pb-0">
          <div className="mx-auto max-w-3xl lg:max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM TABS (< sm only) — absolutely positioned, doesn't affect layout flow ═══ */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl flex justify-around items-center px-1 pt-1 pb-5 z-30" style={{ borderTop: '0.5px solid #E5E7EB' }}>
        {MOBILE_TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-95">
              <div className="p-1.5 rounded-xl transition-all duration-200" style={isActive ? { background: '#ECFDF5' } : {}}>
                <Icon active={isActive} />
              </div>
              <span className="text-[11px] font-medium" style={{ color: isActive ? '#0F766E' : '#6B7280' }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
