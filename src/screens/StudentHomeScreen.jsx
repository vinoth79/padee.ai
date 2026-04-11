import { useState } from 'react'
import { studentProfile, dailyGoal, weakTopics, dailyChallenges, recentWins, subjects, progressData } from '../data/mockData'
import AIOrb from '../components/AIOrb'

const AI_MESSAGES = [
  {
    headline: 'You got 3/5 wrong on Ohm\'s Law yesterday.',
    body: 'I\'ve prepared 5 targeted questions to fix that gap — it\'ll take under 8 minutes.',
    cta: 'Fix Ohm\'s Law now →',
    screen: 'practice',
    tag: '⚡ Weak topic repair',
    stats: { wrong: '3/5', time: '~8 min', xp: '+25 XP' },
  },
]

export default function StudentHomeScreen({ onNavigate }) {
  const student = studentProfile
  const goal = dailyGoal
  const [aiMsgIndex] = useState(0)
  const msg = AI_MESSAGES[aiMsgIndex]
  const goalPercent = Math.min(100, Math.round((goal.current / goal.target) * 100))
  const goalRemaining = goal.target - goal.current
  const streakAtRisk = goal.streakAtRisk && goal.current < goal.target

  return (
    <div className="pb-28 sm:pb-8">

      {/* ═══ MOBILE HEADER (hidden on desktop — shown in top bar) ═══ */}
      <div className="lg:hidden px-4 pt-10 sm:pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GoalRing percent={goalPercent} size={42} />
            <div>
              <p className="text-xs font-semibold text-brand-navy">{goal.current}/{goal.target} XP today</p>
              <p className="text-[12px] text-brand-slate">{goalRemaining > 0 ? `${goalRemaining} XP to daily goal` : 'Daily goal complete!'}</p>
            </div>
            <div className="w-px h-8 bg-gray-200 mx-1" />
            <div className="flex items-center gap-1">
              <span className="text-lg animate-flame-sway">🔥</span>
              <div>
                <p className="text-sm font-bold text-brand-navy leading-none">{student.streak}</p>
                <p className="text-[10px] text-brand-slate">days</p>
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate('me')} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm" style={{ background: '#CCFBF1', border: '2px solid #5EEAD4', color: '#0F766E' }}>
            {student.avatar}
          </button>
        </div>
      </div>

      {/* ═══ DESKTOP: 70/30 split layout ═══ */}
      <div className="lg:flex lg:gap-5 lg:px-6 lg:pt-5">

        {/* ══ LEFT COLUMN: Action feed ══ */}
        <div className="flex-1 min-w-0">

          {/* STREAK AT RISK ALERT */}
          {streakAtRisk && (
            <div className="px-4 lg:px-0 mb-3">
              <button onClick={() => onNavigate('practice')}
                className="w-full flex items-center gap-2.5 rounded-xl px-4 py-2.5 active:scale-[0.98] transition-transform" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#D97706"><path d="M12 23c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm-4-5V11c0-2.8 1.6-5.2 4-6.3V3c0-1.1.9-2 2-2s2 .9 2 2v1.7c2.4 1.1 4 3.5 4 6.3v7l2 2H2l2-2z"/></svg>
                <p className="text-[14px] font-medium flex-1 text-left" style={{ color: '#92400E' }}>You haven't hit your goal today. <span className="font-bold" style={{ color: '#B45309' }}>5 questions to keep your streak alive →</span></p>
              </button>
            </div>
          )}

          {/* AI RECOMMENDATION HERO */}
          <div className="px-4 lg:px-0 mb-3">
            <div className="rounded-xl p-5 shadow-action relative overflow-hidden" style={{ background: '#0F1729' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <AIOrb size="xs" state="idle" />
                  <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#5EEAD4' }}>AI Recommendation for today</span>
                </div>
                <h2 className="font-semibold text-[17px] leading-[1.45] mb-1" style={{ color: '#F1F5F9' }}>{msg.headline}</h2>
                <p className="text-[14px] leading-[1.55] mb-4" style={{ color: '#94A3B8' }}>{msg.body}</p>
                <div className="flex gap-2">
                  <button onClick={() => onNavigate(msg.screen)}
                    className="flex-1 font-semibold py-2.5 rounded-lg text-[14px] active:scale-95 transition-colors" style={{ background: '#0D9488', color: '#CCFBF1' }}>
                    {msg.cta}
                  </button>
                  <button onClick={() => onNavigate('me')}
                    className="hidden sm:block text-[13px] font-medium py-2.5 px-4 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid #334155' }}>
                    See my full plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ASK INPUT */}
          <div className="px-4 lg:px-0 mb-3">
            <button onClick={() => onNavigate('ask-ai')}
              className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-card border active:scale-[0.98] transition-all hover:shadow-card-hover" style={{ borderColor: '#E5E7EB' }}>
              <div className="w-8 h-8 ai-orb-sm rounded-full flex-shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white/50 rounded-full" />
              </div>
              <span className="flex-1 text-[14px] text-brand-slate text-left font-medium">What's confusing you? Ask me anything...</span>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-brand-bg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
                  <span className="text-white text-xs font-bold">→</span>
                </div>
              </div>
            </button>
          </div>

          {/* CONTINUE WHERE YOU LEFT OFF */}
          <div className="px-4 lg:px-0 mb-3">
            <button onClick={() => onNavigate('practice')}
              className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-card mb-3 hover:shadow-card-hover transition-shadow active:scale-[0.98]" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: '#EFF6FF' }}>⚡</div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[12px] text-brand-slate font-medium">Continue where you left off</p>
                <p className="text-[15px] font-semibold text-brand-navy truncate">Series & Parallel Circuits</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ background: '#2563EB', width: '60%' }} />
                  </div>
                  <span className="text-[13px] font-bold font-mono" style={{ color: '#2563EB' }}>3/5</span>
                </div>
              </div>
              <span className="text-brand-primary text-lg">›</span>
            </button>

            {/* 2-col: Revision + Weak topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 2-Minute Revision */}
              <button onClick={() => onNavigate('practice')}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform text-left" style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: '#A7F3D0' }}>🔄</div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold" style={{ color: '#064E3B' }}>Revise Electricity in 2 minutes</p>
                  <p className="text-[12px]" style={{ color: '#059669' }}>You haven't revised in 4 days</p>
                </div>
                <span className="text-[12px] font-semibold px-2 py-1 rounded-lg font-mono" style={{ background: '#059669', color: '#ECFDF5' }}>+10 XP</span>
              </button>

              {/* Weak Topic Repair */}
              {weakTopics.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <AIOrb size="xs" state="idle" />
                    <span className="text-[11px] font-semibold" style={{ color: '#92400E' }}>AI found a gap</span>
                  </div>
                  <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: '#78350F' }}>{weakTopics[0].topic}</h3>
                  <p className="text-[12px] mb-2.5" style={{ color: '#B45309' }}>Below {weakTopics[0].accuracy}% accuracy · {weakTopics[0].attempts} attempts</p>
                  <button onClick={() => onNavigate('practice')}
                    className="w-full font-semibold py-2 rounded-lg text-[14px] active:scale-95 transition-transform" style={{ background: '#D97706', color: '#FFFBEB' }}>
                    Fix this in 5 questions →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DAILY CHALLENGE */}
          <div className="px-4 lg:px-0 mb-3">
            <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#EA580C' }}>Daily Challenge</span>
                </div>
                <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full font-mono" style={{ color: '#EA580C', background: '#FFF7ED' }}>+{dailyChallenges[0].xpReward} XP</span>
              </div>
              <h3 className="text-[16px] font-semibold text-brand-navy mb-0.5">
                {dailyChallenges[0].questions} questions on {dailyChallenges[0].subject} — {dailyChallenges[0].chapter}
              </h3>
              <p className="text-[13px] text-brand-slate mb-3">
                {dailyChallenges[0].bestScore ? `🏆 Your best: ${dailyChallenges[0].bestScore}` : 'Timed challenge — test your speed'}
              </p>
              <button onClick={() => onNavigate('challenge')}
                className="w-full font-semibold py-2.5 rounded-lg text-[15px] active:scale-95 transition-transform" style={{ background: '#EA580C', color: '#FFF7ED' }}>
                Beat today's challenge →
              </button>
            </div>
          </div>

          {/* QUICK PRACTICE */}
          <div className="px-4 lg:px-0 mb-3">
            <button onClick={() => onNavigate('practice')}
              className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-card hover:shadow-card-hover transition-shadow active:scale-[0.98]" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-lg flex-shrink-0">⚡</div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-brand-navy">Practice 5 quick questions</p>
                <p className="text-[13px] text-brand-slate">Resistance & Resistivity · ~2 min</p>
              </div>
              <span className="text-[14px] font-semibold px-2 py-1 rounded-lg font-mono" style={{ color: '#D97706', background: '#FFFBEB' }}>+25 XP</span>
            </button>
          </div>

          {/* MOBILE ONLY: Subject rings + Recent wins + Activity (stacked) */}
          <div className="lg:hidden">
            <SubjectRingsSection onNavigate={onNavigate} />
            <RecentWinsSection onNavigate={onNavigate} />
            <ActivitySummary onNavigate={onNavigate} />
          </div>

          {/* Teacher mode link (mobile only) */}
          <div className="lg:hidden px-5 mt-2">
            <button onClick={() => onNavigate('teacher-dashboard')}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-slate hover:text-brand-primary transition-colors">
              🎓 Switch to Teacher Mode
            </button>
          </div>
        </div>

        {/* ══ RIGHT PANEL: Status sidebar (desktop only) ══ */}
        <div className="hidden lg:block w-[300px] flex-shrink-0">
          <div className="sticky top-[72px] space-y-4">

            {/* Daily goal breakdown */}
            <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="flex items-center gap-3 mb-3">
                <GoalRing percent={goalPercent} size={48} />
                <div>
                  <p className="text-[13px] font-medium text-brand-navy">{goal.current}/{goal.target} XP today</p>
                  <p className="text-[12px] text-brand-slate">{goalRemaining > 0 ? `${goalRemaining} XP to daily goal` : 'Daily goal complete! 🎉'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Doubts', value: goal.breakdown.doubts, icon: '💬' },
                  { label: 'Practice', value: goal.breakdown.practice, icon: '⚡' },
                  { label: 'Revision', value: goal.breakdown.revision, icon: '🔄' },
                  { label: 'Tests', value: goal.breakdown.test, icon: '📋' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 bg-brand-bg rounded-lg px-2.5 py-2">
                    <span className="text-sm">{item.icon}</span>
                    <div>
                      <p className="text-[15px] font-semibold text-brand-navy font-mono">{item.value} XP</p>
                      <p className="text-[12px] text-brand-slate">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject mastery (vertical stack) */}
            <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider">Your subjects</h3>
                <button onClick={() => onNavigate('learn')} className="text-[13px] font-semibold text-brand-primary">View all →</button>
              </div>
              <div className="space-y-2.5">
                {progressData.subjectHealth.map((s, i) => {
                  const subjectData = subjects.find(sub => sub.name === s.subject)
                  const colorMap = { blue: '#2563EB', purple: '#7C3AED', orange: '#EA580C', green: '#059669', cyan: '#0891B2' }
                  const c = colorMap[s.color] || '#0D9488'
                  return (
                    <button key={i} onClick={() => onNavigate('learn')}
                      className="w-full flex items-center gap-3 hover:bg-brand-bg rounded-lg px-1 py-1 -mx-1 transition-colors">
                      <div className="relative w-9 h-9 flex-shrink-0">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 14}`} strokeDashoffset={`${2 * Math.PI * 14 * (1 - s.accuracy / 100)}`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs">{subjectData?.icon || '📖'}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[15px] font-medium text-brand-navy">{s.subject}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[16px] font-bold text-brand-navy font-mono">{s.accuracy}%</span>
                        <span className={`text-xs ml-1 ${s.trend === 'up' ? 'text-brand-success' : s.trend === 'down' ? 'text-brand-error' : 'text-brand-slate'}`}>
                          {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Recent wins (vertical) */}
            <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider">Recent wins</h3>
                <button onClick={() => onNavigate('me')} className="text-[13px] font-semibold text-brand-primary">See all →</button>
              </div>
              <div className="space-y-2">
                {recentWins.map(win => (
                  <div key={win.id} className="flex items-center gap-2.5 px-1">
                    <span className="text-xl">{win.badge}</span>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-brand-navy">{win.title}</p>
                      <p className="text-[12px] text-brand-slate">{win.when}</p>
                    </div>
                  </div>
                ))}
                {/* Next badge to earn */}
                <button onClick={() => onNavigate('me')}
                  className="w-full flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-brand-bg transition-colors">
                  <span className="text-xl opacity-30">🎯</span>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold text-brand-slate">Challenge Champ</p>
                    <p className="text-[12px] text-brand-primary font-medium">2/5 — earn it next!</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Activity summary */}
            <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
              <h3 className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider mb-2">Today's activity</h3>
              <div className="space-y-1.5">
                {[
                  { icon: '💬', label: 'Doubts solved', value: '3' },
                  { icon: '⚡', label: 'Questions answered', value: '10' },
                  { icon: '📋', label: 'Tests taken', value: '1' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-[14px] text-brand-slate">{item.label}</span>
                    </div>
                    <span className="text-[15px] font-semibold text-brand-navy font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile-only sections (rendered inside left column on mobile) ──────────

function SubjectRingsSection({ onNavigate }) {
  const colorMap = { blue: '#2563EB', purple: '#7C3AED', orange: '#EA580C', green: '#059669', cyan: '#0891B2' }
  return (
    <div className="px-4 mb-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider">Your subjects</h3>
        <button onClick={() => onNavigate('learn')} className="text-[13px] font-semibold text-brand-primary">View all →</button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {progressData.subjectHealth.map((s, i) => {
          const subjectData = subjects.find(sub => sub.name === s.subject)
          const c = colorMap[s.color] || '#0D9488'
          return (
            <button key={i} onClick={() => onNavigate('learn')}
              className="flex-shrink-0 bg-white rounded-xl px-3 py-2.5 shadow-card flex items-center gap-2.5 active:scale-95 transition-transform min-w-[150px]">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`} strokeDashoffset={`${2 * Math.PI * 16 * (1 - s.accuracy / 100)}`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm">{subjectData?.icon || '📖'}</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-brand-navy leading-tight">{s.subject.slice(0, 10)}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-brand-navy font-mono">{s.accuracy}%</span>
                  <span className={`text-[10px] ${s.trend === 'up' ? 'text-brand-success' : s.trend === 'down' ? 'text-brand-error' : 'text-brand-slate'}`}>
                    {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RecentWinsSection({ onNavigate }) {
  return (
    <div className="px-4 mb-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider">Recent wins</h3>
        <button onClick={() => onNavigate('me')} className="text-[13px] font-semibold text-brand-primary">See all badges →</button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {recentWins.map(win => (
          <div key={win.id} className="flex-shrink-0 bg-white rounded-xl px-3 py-2.5 shadow-card flex items-center gap-2 min-w-[130px]">
            <span className="text-2xl">{win.badge}</span>
            <div>
              <p className="text-xs font-semibold text-brand-navy leading-tight">{win.title}</p>
              <p className="text-[12px] text-brand-slate">{win.when}</p>
            </div>
          </div>
        ))}
        <button onClick={() => onNavigate('me')}
          className="flex-shrink-0 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-[140px] active:scale-95 transition-transform">
          <span className="text-2xl opacity-30">🎯</span>
          <div>
            <p className="text-[14px] font-medium text-brand-slate leading-tight">Challenge Champ</p>
            <p className="text-[12px] text-brand-primary font-medium">2/5 — earn it next!</p>
          </div>
        </button>
      </div>
    </div>
  )
}

function ActivitySummary({ onNavigate }) {
  return (
    <div className="px-4 mb-3">
      <button onClick={() => onNavigate('me')}
        className="w-full flex items-center justify-between bg-white/60 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs text-brand-slate font-medium">
          <span>📅 Today:</span>
          <span className="text-brand-navy font-semibold">3 doubts</span>
          <span>·</span>
          <span className="text-brand-navy font-semibold">10 questions</span>
          <span>·</span>
          <span className="text-brand-navy font-semibold">1 test</span>
        </div>
        <span className="text-brand-primary text-xs font-semibold">See all →</span>
      </button>
    </div>
  )
}

function GoalRing({ percent, size = 42 }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#CCFBF1" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0D9488" strokeWidth="3"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-brand-primary font-mono">{percent}%</span>
    </div>
  )
}
