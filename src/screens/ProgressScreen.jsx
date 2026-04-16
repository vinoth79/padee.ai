import { useUser } from '../context/UserContext'

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖', 'Social Science': '🌍',
  Economics: '📊', Accounts: '📋', 'Business Studies': '💼',
}

const SUBJECT_COLORS = {
  Physics: '#2563EB', Chemistry: '#EA580C', Mathematics: '#7C3AED', Biology: '#059669',
  'Computer Science': '#0891B2', English: '#E11D48',
}

// XP → Level mapping (same as UserContext)
function getLevel(xp) {
  if (xp >= 10000) return { level: 10, name: 'Grandmaster', next: Infinity }
  if (xp >= 7500) return { level: 9, name: 'Master', next: 10000 }
  if (xp >= 5000) return { level: 8, name: 'Expert', next: 7500 }
  if (xp >= 3500) return { level: 7, name: 'Advanced', next: 5000 }
  if (xp >= 2400) return { level: 6, name: 'Scholar', next: 3500 }
  if (xp >= 1600) return { level: 5, name: 'Achiever', next: 2400 }
  if (xp >= 1000) return { level: 4, name: 'Explorer', next: 1600 }
  if (xp >= 500) return { level: 3, name: 'Learner', next: 1000 }
  if (xp >= 200) return { level: 2, name: 'Curious', next: 500 }
  return { level: 1, name: 'Beginner', next: 200 }
}

export default function ProgressScreen({ onNavigate }) {
  const user = useUser()
  const homeData = user.homeData

  const totalXP = homeData?.totalXP || 0
  const badges = homeData?.badges || []
  const badgeStats = homeData?.badgeStats || {}
  const subjectHealth = homeData?.subjectHealth || []
  const streak = homeData?.streak || { current_streak: 0, longest_streak: 0 }
  const todayActivity = homeData?.todayActivity || { doubts: 0, questions: 0, tests: 0 }
  const { level, name: levelName, next: nextLevelXP } = getLevel(totalXP)
  const prevLevelXP = getLevel(Math.max(0, totalXP - 1)).next === nextLevelXP ? 0 : [0, 200, 500, 1000, 1600, 2400, 3500, 5000, 7500, 10000][level - 1] || 0
  const progressToNext = nextLevelXP === Infinity ? 100 : Math.round(((totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-8 space-y-5">

      {/* Profile header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold"
          style={{ background: '#CCFBF1', border: '3px solid #5EEAD4', color: '#0F766E' }}>
          {user.avatar || 'S'}
        </div>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{user.studentName}</h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>Class {user.studentClass} · {user.activeTrack || 'School'}</p>

        {/* Level + XP bar */}
        <div className="mt-4 max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: '#0F766E' }}>Lv {level} · {levelName}</span>
            <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{totalXP} / {nextLevelXP === Infinity ? '∞' : nextLevelXP} XP</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ background: '#0D9488', width: `${progressToNext}%` }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold font-mono" style={{ color: '#0D9488' }}>{totalXP}</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>Total XP</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold font-mono" style={{ color: '#EA580C' }}>{streak.current_streak}</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>Day Streak</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold font-mono" style={{ color: '#7C3AED' }}>{badgeStats.doubts || 0}</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>Doubts Asked</p>
        </div>
      </div>

      {/* Streak info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Streak</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#EA580C' }}>🔥 {streak.current_streak}</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Current</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#D97706' }}>🏆 {streak.longest_streak}</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Longest</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {streak.current_streak > 0
                ? `Keep going! ${streak.current_streak} day${streak.current_streak > 1 ? 's' : ''} strong.`
                : 'Ask a doubt today to start your streak!'}
            </p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Badges Earned ({badges.length})</h2>
        {badges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {badges.map(b => (
              <div key={b.id} className="rounded-xl p-3 text-center" style={{ background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
                <span className="text-3xl">{b.icon}</span>
                <p className="text-xs font-semibold mt-1" style={{ color: '#0F766E' }}>{b.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: '#9CA3AF' }}>Ask your first doubt to earn your first badge!</p>
        )}
      </div>

      {/* Subject mastery */}
      {subjectHealth.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Subject Mastery</h2>
          <div className="space-y-3">
            {subjectHealth.map((s, i) => {
              const c = SUBJECT_COLORS[s.subject] || '#0D9488'
              const hasAccuracy = s.accuracy !== null
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{SUBJECT_ICONS[s.subject] || '📖'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: '#111827' }}>{s.subject}</span>
                      <span className="text-xs font-mono" style={{ color: hasAccuracy ? c : '#9CA3AF' }}>
                        {hasAccuracy ? `${s.accuracy}%` : (s.totalQuestions > 0 ? `${s.totalQuestions} doubts` : 'Not started')}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                      <div className="h-full rounded-full transition-all" style={{ background: c, width: hasAccuracy ? `${s.accuracy}%` : '0%' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's activity */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Today's Activity</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '💬', label: 'Doubts', value: todayActivity.doubts },
            { icon: '⚡', label: 'Practice', value: todayActivity.questions },
            { icon: '📋', label: 'Tests', value: todayActivity.tests },
          ].map(item => (
            <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: '#F9FAFB' }}>
              <span className="text-xl">{item.icon}</span>
              <p className="text-lg font-bold font-mono" style={{ color: '#111827' }}>{item.value}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
