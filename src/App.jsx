import { useState } from 'react'

// Screens — Student
import SplashScreen from './screens/SplashScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import StudentHomeScreen from './screens/StudentHomeScreen'
import DoubtSolverScreen from './screens/DoubtSolverScreen'
import LearnScreen from './screens/LearnScreen'
import PracticeModeScreen from './screens/PracticeModeScreen'
import TestScreen from './screens/TestScreen'
import TestResultsScreen from './screens/TestResultsScreen'
import ProgressScreen from './screens/ProgressScreen'
import JEENEETScreen from './screens/JEENEETScreen'
import ParentSummaryScreen from './screens/ParentSummaryScreen'

// Screens — Teacher
import TeacherDashboardScreen from './screens/TeacherDashboardScreen'
import WorksheetGeneratorScreen from './screens/WorksheetGeneratorScreen'
import TestGeneratorScreen from './screens/TestGeneratorScreen'
import LiveClassScreen from './screens/LiveClassScreen'
import StudentPerformanceScreen from './screens/StudentPerformanceScreen'

// Components
import BottomNav from './components/BottomNav'
import AIOrb from './components/AIOrb'
import { studentProfile, dailyGoal } from './data/mockData'

const ALL_STUDENT_SCREENS = ['home', 'learn', 'me', 'doubt', 'ask-ai', 'practice', 'test', 'test-results', 'chapters', 'challenge', 'jee-neet', 'parent-summary', 'tests', 'progress', 'profile']
const TEACHER_SCREENS = ['teacher-dashboard', 'worksheet', 'test-generator', 'live-class', 'students']
const HIDE_NAV_SCREENS = ['test', 'splash', 'onboarding']

const SIDEBAR_NAV = [
  { id: 'home',     label: 'Home',     icon: HomeIcon,     screen: 'home' },
  { id: 'ask-ai',   label: 'Ask AI',   icon: AskAIIcon,    screen: 'ask-ai' },
  { id: 'learn',    label: 'Learn',    icon: LearnIcon,     screen: 'learn' },
  { id: 'tests',    label: 'Tests',    icon: TestsIcon,     screen: 'test' },
  { id: 'progress', label: 'Progress', icon: ProgressIcon,  screen: 'me' },
]

const TEACHER_NAV = [
  { id: 'command',  label: 'Command Center', screen: 'teacher-dashboard' },
  { id: 'actions',  label: 'Actions',        screen: 'worksheet' },
  { id: 'students', label: 'Students',       screen: 'students' },
  { id: 'live',     label: 'Live Class',     screen: 'live-class' },
]

export default function App() {
  const [screen, setScreen] = useState('splash')
  const [navParams, setNavParams] = useState({})
  const [onboarded, setOnboarded] = useState(false)

  const navigate = (screenName, params = {}) => {
    setScreen(screenName)
    setNavParams(params)
    window.scrollTo(0, 0)
  }

  const handleSplashDone = () => setScreen(onboarded ? 'home' : 'onboarding')
  const handleOnboardingComplete = (data) => {
    setOnboarded(true)
    setScreen(data?.isTeacher ? 'teacher-dashboard' : 'home')
  }

  const isTeacherScreen = TEACHER_SCREENS.includes(screen)
  const isStudentScreen = ALL_STUDENT_SCREENS.includes(screen)
  const showNav = isStudentScreen && !HIDE_NAV_SCREENS.includes(screen)
  const isFullscreen = HIDE_NAV_SCREENS.includes(screen)

  const activeTab = (() => {
    if (screen === 'home') return 'home'
    if (['ask-ai', 'doubt'].includes(screen)) return 'ask-ai'
    if (['learn', 'chapters'].includes(screen)) return 'learn'
    if (['test', 'test-results', 'tests'].includes(screen)) return 'tests'
    if (['me', 'progress', 'jee-neet', 'parent-summary', 'profile'].includes(screen)) return 'progress'
    return null
  })()

  const activeTeacherTab = (() => {
    if (screen === 'teacher-dashboard') return 'command'
    if (['worksheet', 'test-generator'].includes(screen)) return 'actions'
    if (screen === 'students') return 'students'
    if (screen === 'live-class') return 'live'
    return 'command'
  })()

  const student = studentProfile
  const goal = dailyGoal
  const goalPercent = Math.min(100, Math.round((goal.current / goal.target) * 100))

  const renderScreen = () => (
    <>
      {screen === 'splash'          && <SplashScreen onDone={handleSplashDone} />}
      {screen === 'onboarding'      && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      {screen === 'home'            && <StudentHomeScreen onNavigate={navigate} />}
      {(screen === 'doubt' || screen === 'ask-ai') && <DoubtSolverScreen onNavigate={navigate} initialQuestion={navParams.question} />}
      {screen === 'learn'           && <LearnScreen onNavigate={navigate} />}
      {screen === 'practice'        && <PracticeModeScreen onNavigate={navigate} />}
      {screen === 'challenge'       && <PracticeModeScreen onNavigate={navigate} />}
      {screen === 'test'            && <TestScreen onNavigate={navigate} />}
      {screen === 'test-results'    && <TestResultsScreen onNavigate={navigate} />}
      {screen === 'me'              && <ProgressScreen onNavigate={navigate} />}
      {screen === 'progress'        && <ProgressScreen onNavigate={navigate} />}
      {screen === 'jee-neet'        && <JEENEETScreen onNavigate={navigate} />}
      {screen === 'parent-summary'  && <ParentSummaryScreen onNavigate={navigate} />}
      {screen === 'teacher-dashboard' && <TeacherDashboardScreen onNavigate={navigate} />}
      {screen === 'worksheet'       && <WorksheetGeneratorScreen onNavigate={navigate} />}
      {screen === 'test-generator'  && <TestGeneratorScreen onNavigate={navigate} />}
      {screen === 'live-class'      && <LiveClassScreen onNavigate={navigate} />}
      {screen === 'students'        && <StudentPerformanceScreen onNavigate={navigate} />}
    </>
  )

  // ── Full-bleed screens ────────────────────────────────────────────────────
  if (isFullscreen) {
    return <div className="min-h-screen bg-brand-dark">{renderScreen()}</div>
  }

  // ── Teacher screens ───────────────────────────────────────────────────────
  if (isTeacherScreen) {
    return (
      <div className="min-h-screen bg-brand-bg">
        {/* Teacher top nav */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <AIOrb size="xs" state="idle" />
                  <span className="font-extrabold text-brand-navy text-base tracking-tight">Padhi.ai</span>
                  <span className="text-[10px] text-brand-slate bg-brand-light px-1.5 py-0.5 rounded font-medium">Teacher</span>
                </div>
                <nav className="hidden sm:flex items-center gap-1">
                  {TEACHER_NAV.map(item => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.screen)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        activeTeacherTab === item.id
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-brand-slate hover:text-brand-navy hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
              <button
                onClick={() => navigate('home')}
                className="text-xs font-semibold text-brand-slate bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:text-brand-primary transition-colors"
              >
                ← Student view
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {renderScreen()}
        </div>
        <DemoShortcuts onNavigate={navigate} />
      </div>
    )
  }

  // ── Student screens: desktop-first responsive ─────────────────────────────
  return (
    <div className="min-h-screen bg-brand-bg">

      {/* ═══ DESKTOP (≥1024px): Full sidebar + top bar + content ═══ */}
      <div className="hidden lg:flex h-screen overflow-hidden">

        {/* Left sidebar (220px) */}
        {showNav && (
          <aside className="w-[220px] flex-shrink-0 bg-white border-r border-gray-200/80 flex flex-col h-screen">
            {/* Brand */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <AIOrb size="xs" state="idle" />
                <span className="font-extrabold text-brand-navy text-lg tracking-tight">Padhi.ai</span>
              </div>
            </div>

            {/* User card */}
            <div className="px-4 pb-4">
              <button onClick={() => navigate('me')} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-brand-bg rounded-xl hover:bg-brand-light transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#CCFBF1', border: '2px solid #5EEAD4', color: '#0F766E' }}>
                  {student.avatar}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-navy truncate">{student.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-brand-slate">Class {student.class} · Lv {student.level}</p>
                </div>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 space-y-0.5">
              {SIDEBAR_NAV.map(item => {
                const isActive = activeTab === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.screen)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                        : 'text-brand-slate hover:bg-gray-50 hover:text-brand-navy'
                    }`}
                  >
                    <Icon active={isActive} />
                    <span>{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                  </button>
                )
              })}

              {/* Divider + secondary nav */}
              <div className="pt-3 mt-3 border-t border-gray-100">
                <button
                  onClick={() => navigate('practice')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-slate hover:bg-amber-50 hover:text-amber-700 transition-all"
                >
                  <span className="text-base">⚡</span>
                  <span>Practice</span>
                </button>
              </div>
            </nav>

            {/* Sidebar footer: XP bar + teacher link */}
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
              {/* XP bar */}
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-brand-slate">Lv {student.level} · {student.levelName}</span>
                  <span className="text-[10px] font-bold font-mono" style={{ color: '#9CA3AF' }}>{student.xp} XP</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ background: '#0D9488', width: `${Math.round(((student.xp - 1600) / (2400 - 1600)) * 100)}%` }} />
                </div>
              </div>
              <button
                onClick={() => navigate('teacher-dashboard')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-brand-slate hover:text-brand-primary transition-colors"
              >
                🎓 Teacher mode
              </button>
            </div>
          </aside>
        )}

        {/* Main area: top bar + scrollable content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top bar */}
          {showNav && (
            <header className="flex-shrink-0 h-14 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-navy">{getGreeting()}, {student.name.split(' ')[0]}</p>
                <p className="text-[11px] text-brand-slate">Today's Study Session</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Streak pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706"><path d="M12 23c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm-4-5V11c0-2.8 1.6-5.2 4-6.3V3c0-1.1.9-2 2-2s2 .9 2 2v1.7c2.4 1.1 4 3.5 4 6.3v7l2 2H2l2-2z"/></svg>
                  <span className="text-xs font-bold" style={{ color: '#B45309' }}>{student.streak}</span>
                  <span className="text-xs font-medium" style={{ color: '#D97706' }}>day streak</span>
                </div>
                {/* Daily goal ring */}
                <div className="relative w-9 h-9">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#CCFBF1" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#0D9488" strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 15}`}
                      strokeDashoffset={`${2 * Math.PI * 15 * (1 - goalPercent / 100)}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-brand-primary font-mono">{goalPercent}%</span>
                </div>
              </div>
            </header>
          )}

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto">
              {renderScreen()}
            </div>
          </main>
        </div>
      </div>

      {/* ═══ TABLET (640px–1023px): Collapsed sidebar (56px) ═══ */}
      <div className="hidden sm:flex lg:hidden h-screen overflow-hidden">
        {showNav && (
          <aside className="w-14 flex-shrink-0 bg-white border-r border-gray-200/80 flex flex-col h-screen items-center py-4">
            <div className="mb-4">
              <AIOrb size="xs" state="idle" />
            </div>
            <nav className="flex-1 space-y-1">
              {SIDEBAR_NAV.map(item => {
                const isActive = activeTab === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.screen)}
                    title={item.label}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                      isActive ? 'bg-brand-primary/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon active={isActive} />
                  </button>
                )
              })}
            </nav>
            <button onClick={() => navigate('teacher-dashboard')} title="Teacher mode" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-sm">
              🎓
            </button>
          </aside>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto">{renderScreen()}</div>
        </main>
      </div>

      {/* ═══ MOBILE (<640px): Bottom tab bar ═══ */}
      <div className="sm:hidden">
        {renderScreen()}
        {showNav && (
          <BottomNav
            active={activeTab}
            onNavigate={(tab) => navigate(
              tab === 'home' ? 'home' : tab === 'ask-ai' ? 'ask-ai' : tab === 'learn' ? 'learn' : 'me'
            )}
          />
        )}
      </div>

      {/* Demo shortcut */}
      {!HIDE_NAV_SCREENS.includes(screen) && <DemoShortcuts onNavigate={navigate} />}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Nav Icons (shared across sidebar + bottom nav) ──────────────────────────
function HomeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        fill={active ? 'rgba(13,148,136,0.1)' : 'none'}
        stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9" stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function AskAIIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3c5 0 9 3.6 9 8s-4 8-9 8c-1 0-2-.1-3-.4L4 21l1.7-4.3C4 15.2 3 13.2 3 11c0-4.4 4-8 9-8z"
        fill={active ? 'rgba(13,148,136,0.1)' : 'none'}
        stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8.5" cy="11" r="1" fill={active ? '#0D9488' : '#9ca3af'}/>
      <circle cx="12" cy="11" r="1" fill={active ? '#0D9488' : '#9ca3af'}/>
      <circle cx="15.5" cy="11" r="1" fill={active ? '#0D9488' : '#9ca3af'}/>
    </svg>
  )
}
function LearnIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        fill={active ? 'rgba(13,148,136,0.1)' : 'none'}
        stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
function TestsIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2"
        fill={active ? 'rgba(13,148,136,0.1)' : 'none'}
        stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8"/>
      <path d="M8 7h8M8 11h8M8 15h5" stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
function ProgressIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={active ? '#0D9488' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill="none"/>
    </svg>
  )
}

// ─── DEMO SHORTCUTS ──────────────────────────────────────────────────────────
function DemoShortcuts({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const shortcuts = [
    { divider: true, label: 'Student' },
    { label: '🏠 Home',              screen: 'home' },
    { label: '✨ Ask AI',            screen: 'ask-ai' },
    { label: '📚 Learn',             screen: 'learn' },
    { label: '⚡ Practice',          screen: 'practice' },
    { label: '📋 Take a Test',       screen: 'test' },
    { label: '📊 Test Results',      screen: 'test-results' },
    { label: '🏅 Progress',          screen: 'me' },
    { label: '🚀 JEE/NEET Preview',  screen: 'jee-neet' },
    { label: '👪 Parent Summary',    screen: 'parent-summary' },
    { divider: true, label: 'Teacher' },
    { label: '🎓 Command Center',    screen: 'teacher-dashboard' },
    { label: '📄 Worksheet Generator', screen: 'worksheet' },
    { label: '📋 Test Generator',    screen: 'test-generator' },
    { label: '🎙 Live Class',        screen: 'live-class' },
    { label: '👥 Student Performance', screen: 'students' },
  ]

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-24 sm:bottom-6 right-4 z-50 bg-brand-primary text-white text-xs font-bold px-3 py-2 rounded-full shadow-action flex items-center gap-1.5 active:scale-95 hover:shadow-lg transition-all">
        🗺 Demo
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full sm:w-96 sm:max-h-[80vh] bg-white rounded-t-2xl sm:rounded-xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-brand-navy text-lg">Demo Navigation</h3>
                <p className="text-xs text-brand-slate mt-0.5">Jump to any screen</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">×</button>
            </div>
            <div className="space-y-1.5">
              {shortcuts.map((s, i) => {
                if (s.divider) return (
                  <div key={i} className="flex items-center gap-3 mt-4 mb-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-bold text-brand-slate uppercase tracking-wider">{s.label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )
                const isTeacher = TEACHER_SCREENS.includes(s.screen)
                return (
                  <button key={i} onClick={() => { onNavigate(s.screen); setOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      isTeacher ? 'bg-brand-light text-brand-primary hover:bg-brand-light/80' : 'bg-gray-50 text-brand-navy hover:bg-gray-100'
                    }`}>
                    {s.label}
                  </button>
                )
              })}
            </div>
            <p className="text-center text-[10px] text-brand-slate mt-5 pt-3 border-t border-gray-100">Padhi.ai Prototype · CBSE Classes 8–12</p>
          </div>
        </div>
      )}
    </>
  )
}

export { HomeIcon, AskAIIcon, LearnIcon, TestsIcon, ProgressIcon }
