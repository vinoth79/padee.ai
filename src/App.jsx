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
import AIBar from './components/AIBar'
import AIOrb from './components/AIOrb'
import { teacherProfile } from './data/mockData'

const ALL_STUDENT_SCREENS = ['home', 'learn', 'me', 'doubt', 'practice', 'test', 'test-results', 'chapters', 'challenge', 'jee-neet', 'parent-summary']
const TEACHER_SCREENS = ['teacher-dashboard', 'worksheet', 'test-generator', 'live-class', 'students']
const HIDE_NAV_SCREENS = ['test', 'splash', 'onboarding']

const SIDEBAR_NAV = [
  { id: 'today', label: 'Today',   icon: '✨', screen: 'home' },
  { id: 'learn', label: 'Learn',   icon: '📚', screen: 'learn' },
  { id: 'me',    label: 'Me',      icon: '👤', screen: 'me' },
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
  const showAIBar = showNav && screen !== 'doubt'
  const isFullscreen = HIDE_NAV_SCREENS.includes(screen) // splash/onboarding/test = full bleed

  const activeTab = (() => {
    if (screen === 'home') return 'today'
    if (['learn', 'chapters'].includes(screen)) return 'learn'
    if (['me', 'progress', 'jee-neet', 'parent-summary'].includes(screen)) return 'me'
    return null
  })()

  const navTabToScreen = (tabId) => ({ today: 'home', learn: 'learn', me: 'me' }[tabId] || tabId)

  const renderScreen = () => (
    <>
      {screen === 'splash'          && <SplashScreen onDone={handleSplashDone} />}
      {screen === 'onboarding'      && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      {screen === 'home'            && <StudentHomeScreen onNavigate={navigate} />}
      {screen === 'doubt'           && <DoubtSolverScreen onNavigate={navigate} initialQuestion={navParams.question} />}
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

  // ── Full-bleed screens (splash, onboarding, test) ───────────────────────────
  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-brand-dark">
        {renderScreen()}
      </div>
    )
  }

  // ── Teacher screens ──────────────────────────────────────────────────────────
  if (isTeacherScreen) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="max-w-4xl mx-auto relative">
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={() => navigate('home')}
              className="text-xs font-semibold text-brand-slate bg-white px-3 py-1.5 rounded-full shadow-card border border-gray-200 hover:text-brand-primary transition-colors"
            >
              ← Student view
            </button>
          </div>
          {renderScreen()}
          <DemoShortcuts onNavigate={navigate} />
        </div>
      </div>
    )
  }

  // ── Student screens: responsive layout ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 md:bg-slate-100">

      {/* ── DESKTOP: sidebar + content ── */}
      <div className="hidden md:flex md:h-screen md:overflow-hidden">

        {/* Left sidebar */}
        {showNav && (
          <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-20">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <AIOrb size="xs" state="idle" />
                <span className="font-black text-brand-navy text-lg tracking-tight">AI Tutor</span>
              </div>
              <p className="text-[10px] text-brand-slate mt-1 ml-0.5">CBSE Class 8–12</p>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {SIDEBAR_NAV.map(item => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.screen)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-brand-slate hover:bg-gray-50 hover:text-brand-navy'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                  </button>
                )
              })}

              <div className="pt-3 border-t border-gray-100 mt-3">
                <button
                  onClick={() => navigate('practice')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-slate hover:bg-amber-50 hover:text-amber-700 transition-all"
                >
                  <span className="text-base">⚡</span>
                  <span>Practice</span>
                </button>
                <button
                  onClick={() => navigate('test')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-slate hover:bg-teal-50 hover:text-teal-700 transition-all"
                >
                  <span className="text-base">📋</span>
                  <span>Tests</span>
                </button>
              </div>
            </nav>

            {/* Bottom sidebar: AI input + teacher mode */}
            <div className="px-3 pb-5 border-t border-gray-100 pt-3">
              {showAIBar && (
                <button
                  onClick={() => navigate('doubt')}
                  className="w-full flex items-center gap-2.5 bg-brand-bg rounded-2xl px-3 py-2.5 border border-violet-200/60 hover:border-brand-primary/30 transition-all group mb-1"
                >
                  <div className="w-6 h-6 ai-orb-sm rounded-full flex-shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                  </div>
                  <span className="text-xs text-brand-slate group-hover:text-brand-navy transition-colors truncate">Ask AI anything…</span>
                </button>
              )}
              <button
                onClick={() => navigate('teacher-dashboard')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-slate hover:text-brand-primary transition-colors"
              >
                <span>🎓</span><span>Teacher mode</span>
              </button>
            </div>
          </aside>
        )}

        {/* Main content — scrollable */}
        <main className={`flex-1 overflow-y-auto bg-brand-bg ${!showNav ? 'w-full' : ''}`}>
          <div className="max-w-2xl mx-auto">
            {renderScreen()}
          </div>
        </main>
      </div>

      {/* ── MOBILE: stacked layout with fixed bottom nav ── */}
      <div className="md:hidden">
        {renderScreen()}

        {showAIBar && (
          <AIBar onAsk={() => navigate('doubt')} currentScreen={screen} />
        )}

        {showNav && (
          <BottomNav
            active={activeTab}
            onNavigate={(tab) => navigate(navTabToScreen(tab))}
          />
        )}
      </div>

      {/* Demo shortcut — always visible */}
      {!HIDE_NAV_SCREENS.includes(screen) && (
        <DemoShortcuts onNavigate={navigate} />
      )}
    </div>
  )
}

// ─── DEMO SHORTCUTS ───────────────────────────────────────────────────────────
function DemoShortcuts({ onNavigate }) {
  const [open, setOpen] = useState(false)

  const shortcuts = [
    { divider: true, label: 'Student' },
    { label: '🏠 Home',                 screen: 'home' },
    { label: '📚 Learn',                screen: 'learn' },
    { label: '💬 Ask a Doubt',          screen: 'doubt' },
    { label: '⚡ Practice',             screen: 'practice' },
    { label: '📋 Take a Test',          screen: 'test' },
    { label: '📊 Test Results',         screen: 'test-results' },
    { label: '🏅 Me / Progress',        screen: 'me' },
    { label: '🚀 JEE/NEET Preview',    screen: 'jee-neet' },
    { label: '👪 Parent Summary',       screen: 'parent-summary' },
    { divider: true, label: 'Teacher' },
    { label: '🎓 Teacher Dashboard',    screen: 'teacher-dashboard' },
    { label: '📄 Worksheet Generator',  screen: 'worksheet' },
    { label: '📋 Test Generator',       screen: 'test-generator' },
    { label: '🎙 Live Class Mode',      screen: 'live-class' },
    { label: '👥 Student Performance',  screen: 'students' },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-40 right-4 md:bottom-6 md:right-6 z-50 bg-gradient-to-br from-brand-primary to-violet-700 text-white text-xs font-black px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5 active:scale-95 hover:shadow-xl transition-all"
      >
        <span>🗺</span>
        <span>Demo</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full md:w-96 md:max-h-[80vh] bg-white rounded-t-3xl md:rounded-3xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up md:animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-brand-navy text-lg">Demo Navigation</h3>
                <p className="text-xs text-brand-slate mt-0.5">Jump to any screen</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">×</button>
            </div>

            <div className="space-y-1.5">
              {shortcuts.map((s, i) => {
                if (s.divider) return (
                  <div key={i} className="flex items-center gap-3 mt-4 mb-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-bold text-brand-slate uppercase tracking-wider">{s.label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )
                const isTeacher = ['teacher-dashboard','worksheet','test-generator','live-class','students'].includes(s.screen)
                return (
                  <button
                    key={i}
                    onClick={() => { onNavigate(s.screen); setOpen(false) }}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
                      isTeacher ? 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100' : 'bg-violet-50 text-violet-900 hover:bg-violet-100'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>

            <p className="text-center text-xs text-brand-slate mt-5 pt-3 border-t border-gray-100">AI Tutor Prototype · CBSE Classes 8–12</p>
          </div>
        </div>
      )}
    </>
  )
}
