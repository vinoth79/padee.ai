import { useState, useEffect } from 'react'
import AIOrb from '../components/AIOrb'
import { useUser } from '../context/UserContext'
import { HeroCard, SupportingCardsRow, NextToLearnCard } from '../components/recommendations/RecommendationCards'

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖', 'Social Science': '🌍',
  Economics: '📊', Accounts: '📋', 'Business Studies': '💼',
}

const SUBJECT_COLORS = {
  Physics: '#2563EB', Chemistry: '#EA580C', Mathematics: '#7C3AED', Biology: '#059669',
  'Computer Science': '#0891B2', English: '#E11D48', 'Social Science': '#D97706',
  Economics: '#D97706', Accounts: '#2563EB', 'Business Studies': '#0D9488',
}

function getToken() {
  const sessionStr = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!sessionStr) return null
  try {
    const session = JSON.parse(localStorage.getItem(sessionStr))
    return session?.access_token || session?.currentSession?.access_token || null
  } catch { return null }
}

export default function StudentHomeScreen({ onNavigate }) {
  // Read from UserContext (single fetch, no duplicate API call)
  const user = useUser()
  const homeData = user.homeData
  const loading = !user.profileLoaded

  // Fetch concept-level recommendation (PRD v4.3 Section 8)
  const [recommendation, setRecommendation] = useState(null)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch('/api/recommendations/today', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRecommendation(data) })
      .catch(() => {})
  }, [user.xp])  // re-fetch when XP changes (implies a new attempt, mid-session recompute)

  // Pre-load practice questions in background so "Start challenge" is instant
  useEffect(() => {
    if (!homeData?.dailyChallenge) return
    const token = getToken()
    if (!token) return
    const subj = homeData.dailyChallenge.subject
    const count = homeData.dailyChallenge.questionCount
    const cacheKey = `padee-preloaded-practice-${subj}-${new Date().toISOString().split('T')[0]}`
    // Only pre-load once per day per subject
    if (localStorage.getItem(cacheKey)) return
    fetch('/api/ai/practice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: `CBSE Class ${user.studentClass || 10} ${subj}`, subject: subj, className: user.studentClass || 10, count }),
    }).then(r => r.json()).then(data => {
      if (data.questions?.length) {
        localStorage.setItem(cacheKey, JSON.stringify(data.questions))
      }
    }).catch(() => {})
  }, [homeData?.dailyChallenge?.subject])

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="pb-28 sm:pb-8">
        <div className="lg:flex lg:gap-5 lg:px-6 lg:pt-5">
          <div className="flex-1 min-w-0 space-y-3 px-4 lg:px-0">
            {/* Skeleton: streak alert */}
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            {/* Skeleton: AI recommendation */}
            <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
            {/* Skeleton: quick ask */}
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            {/* Skeleton: cards row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            </div>
            {/* Skeleton: challenge */}
            <div className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          </div>
          {/* Skeleton: sidebar */}
          <div className="hidden lg:block w-[300px] flex-shrink-0 space-y-4">
            <div className="h-36 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // All data from real backend
  const profile = homeData?.profile || {}
  const student = {
    name: profile.name || 'Student',
    class: profile.class_level || 10,
    streak: homeData?.streak?.current_streak || 0,
    avatar: (profile.name || 'S').slice(0, 2).toUpperCase(),
  }

  const todayXP = homeData?.todayXP || 0
  const dailyTarget = homeData?.dailyGoal || 50
  const xpBreakdown = homeData?.xpBreakdown || { doubts: 0, practice: 0, test: 0, streak: 0 }
  const subjectHealth = homeData?.subjectHealth || []
  const recentDoubts = homeData?.recentDoubts || []
  const todayActivity = homeData?.todayActivity || { doubts: 0, questions: 0, tests: 0 }
  const badges = homeData?.badges || []
  const dailyChallenge = homeData?.dailyChallenge || null
  const weakThreshold = homeData?.weakTopicThreshold || 70
  const selectedSubjects = homeData?.selectedSubjects || []
  const totalDoubts = homeData?.badgeStats?.doubts || 0

  const goal = { current: todayXP, target: dailyTarget }
  const goalPercent = Math.min(100, dailyTarget > 0 ? Math.round((todayXP / dailyTarget) * 100) : 0)
  const goalRemaining = Math.max(0, dailyTarget - todayXP)
  const streakAtRisk = todayXP < dailyTarget

  // Derived insights for action-oriented recommendations
  const weakSubject = subjectHealth.find(s => s.accuracy !== null && s.accuracy < weakThreshold)
  const subjectsUsed = subjectHealth.filter(s => s.totalQuestions > 0).map(s => s.subject)
  const subjectsNotUsed = selectedSubjects.filter(s => !subjectsUsed.includes(s))
  const topSubject = subjectHealth.filter(s => s.totalQuestions > 0).sort((a, b) => b.totalQuestions - a.totalQuestions)[0]
  const hasAskedToday = todayActivity.doubts > 0
  const firstName = student.name.split(' ')[0]

  // AI Recommendation: prioritised, action-oriented
  function buildAIRec() {
    if (totalDoubts === 0) return {
      headline: `Welcome ${firstName}! Let's start your learning journey.`,
      body: 'Ask your first doubt — I\'ll explain it step-by-step and personalise your experience.',
      cta: 'Ask your first doubt →',
      screen: 'ask-ai', subject: null,
    }
    if (weakSubject) return {
      headline: `${weakSubject.subject} needs work — ${weakSubject.accuracy}% accuracy.`,
      body: `A focused practice session can bring this up. I'll target the areas you're weakest in.`,
      cta: `Practice ${weakSubject.subject} →`,
      screen: 'ask-ai', subject: weakSubject.subject,
    }
    if (subjectsNotUsed.length > 0) {
      const nextSubj = subjectsNotUsed[0]
      return {
        headline: `You haven't explored ${nextSubj} yet.`,
        body: `You've been focusing on ${topSubject?.subject || 'one subject'}. Try a ${nextSubj} doubt to broaden your prep.`,
        cta: `Try ${nextSubj} →`,
        screen: 'ask-ai', subject: nextSubj,
      }
    }
    if (!hasAskedToday) return {
      headline: `${goalRemaining} XP to hit today's goal.`,
      body: `You haven't started yet today. A quick doubt or practice session will get your streak going.`,
      cta: 'Start studying →',
      screen: 'ask-ai', subject: null,
    }
    return {
      headline: goalRemaining > 0 ? `${goalRemaining} XP left to complete today's goal.` : 'Daily goal complete! Keep the momentum.',
      body: goalRemaining > 0
        ? `You've earned ${todayXP} XP today. ${Math.ceil(goalRemaining / 10)} more doubts to hit your target.`
        : `You earned ${todayXP} XP today. Every extra question strengthens your understanding.`,
      cta: goalRemaining > 0 ? 'Keep going →' : 'Ask another doubt →',
      screen: 'ask-ai', subject: null,
    }
  }
  const aiRec = buildAIRec()

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
              <button onClick={() => onNavigate('practice', { subject: dailyChallenge?.subject })}
                className="w-full flex items-center gap-2.5 rounded-xl px-4 py-2.5 active:scale-[0.98] transition-transform" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#D97706"><path d="M12 23c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm-4-5V11c0-2.8 1.6-5.2 4-6.3V3c0-1.1.9-2 2-2s2 .9 2 2v1.7c2.4 1.1 4 3.5 4 6.3v7l2 2H2l2-2z"/></svg>
                <p className="text-[14px] font-medium flex-1 text-left" style={{ color: '#92400E' }}>You haven't hit your goal today. <span className="font-bold" style={{ color: '#B45309' }}>5 questions to keep your streak alive →</span></p>
              </button>
            </div>
          )}

          {/* ─── CONCEPT-LEVEL RECOMMENDATIONS (PRD v4.3 §8) ─── */}
          {/* Uses concept_mastery when student has attempts. Falls back to keyword-based rec for new users. */}
          <div className="px-4 lg:px-0 mb-3">
            {recommendation && recommendation.hero_type && recommendation.hero_type !== 'none' && recommendation.hero_copy ? (
              <>
                {recommendation.hero_type === 'next_chapter' ? (
                  <NextToLearnCard
                    recommendation={recommendation}
                    onAct={() => onNavigate('learn', recommendation.hero_detail?.subject ? { subject: recommendation.hero_detail.subject } : undefined)}
                  />
                ) : (
                  <HeroCard
                    recommendation={recommendation}
                    onAct={() => {
                      const d = recommendation.hero_detail || {}
                      // Fix types → practice on the concept's subject. Revise → same. Ask the AI if needed.
                      onNavigate('practice', d.subject ? { subject: d.subject, concept: recommendation.hero_concept_slug } : undefined)
                      fetch('/api/recommendations/acted-on', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${getToken()}` },
                      }).catch(() => {})
                    }}
                  />
                )}
                <SupportingCardsRow
                  cards={recommendation.supporting_cards || []}
                  onCardClick={(card) => onNavigate('practice', { subject: card.subject, concept: card.concept_slug })}
                />
              </>
            ) : (
              // Fallback: keyword-based rec for brand-new users with no concept_mastery data yet
              <div className="rounded-xl p-5 shadow-action relative overflow-hidden" style={{ background: '#0F1729' }}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <AIOrb size="xs" state="idle" />
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#5EEAD4' }}>AI Recommendation for today</span>
                  </div>
                  <h2 className="font-semibold text-[17px] leading-[1.45] mb-1" style={{ color: '#F1F5F9' }}>{aiRec.headline}</h2>
                  <p className="text-[14px] leading-[1.55] mb-4" style={{ color: '#94A3B8' }}>{aiRec.body}</p>
                  <button onClick={() => onNavigate(aiRec.screen, aiRec.subject ? { subject: aiRec.subject } : undefined)}
                    className="w-full font-semibold py-2.5 rounded-lg text-[14px] active:scale-95 transition-colors" style={{ background: '#0D9488', color: '#CCFBF1' }}>
                    {aiRec.cta}
                  </button>
                </div>
              </div>
            )}
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

          {/* RECENT DOUBTS (last 3) — each is tappable to revisit */}
          {recentDoubts.length > 0 && (
            <div className="px-4 lg:px-0 mb-3">
              <p className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider mb-2 px-1">Recent doubts</p>
              <div className="space-y-2">
                {recentDoubts.slice(0, 3).map((d, i) => (
                  <button key={d.id || i} onClick={() => onNavigate('ask-ai')}
                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 shadow-card hover:shadow-card-hover transition-shadow active:scale-[0.98]" style={{ border: '0.5px solid #E5E7EB' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: '#F0FDFA' }}>
                      {SUBJECT_ICONS[d.subject] || '📖'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-medium text-brand-navy truncate">{d.topic}</p>
                      <p className="text-[11px] text-brand-slate">{d.subject} · {new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-brand-slate text-sm">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ACTION CARDS: 2-column grid */}
          <div className="px-4 lg:px-0 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Weak Subject card (when mastery data exists) */}
              {/* Weak subject card — only show when AI Recommendation is NOT already about this weak subject */}
              {weakSubject && aiRec.subject !== weakSubject.subject ? (
                <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <AIOrb size="xs" state="idle" />
                    <span className="text-[11px] font-semibold" style={{ color: '#92400E' }}>Needs attention</span>
                  </div>
                  <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: '#78350F' }}>{weakSubject.subject} — {weakSubject.accuracy}%</h3>
                  <p className="text-[12px] mb-2.5" style={{ color: '#B45309' }}>Below {weakThreshold}% target · {weakSubject.totalQuestions} questions attempted</p>
                  <button onClick={() => onNavigate('practice', { subject: weakSubject.subject })}
                    className="w-full font-semibold py-2 rounded-lg text-[14px] active:scale-95 transition-transform" style={{ background: '#D97706', color: '#FFFBEB' }}>
                    Improve {weakSubject.subject} →
                  </button>
                </div>
              ) : (subjectsNotUsed.length > 0 && !aiRec.subject) ? (
                /* Unexplored subject prompt — only show when AI Recommendation is NOT already about an unexplored subject */
                <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: '#1D4ED8' }}>Explore more</span>
                  </div>
                  <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: '#1E40AF' }}>
                    {subjectsNotUsed.length === 1 ? subjectsNotUsed[0] : `${subjectsNotUsed.length} subjects`} unexplored
                  </h3>
                  <p className="text-[12px] mb-2.5" style={{ color: '#3B82F6' }}>
                    You've only asked about {subjectsUsed.join(', ') || 'one subject'} so far.
                  </p>
                  <button onClick={() => onNavigate('ask-ai', { subject: subjectsNotUsed[0] })}
                    className="w-full font-semibold py-2 rounded-lg text-[14px] active:scale-95 transition-transform" style={{ background: '#2563EB', color: '#EFF6FF' }}>
                    Try {subjectsNotUsed[0]} →
                  </button>
                </div>
              ) : null}

            </div>
          </div>

          {/* SUBJECT PROGRESS (horizontal scroll on mobile, grid on desktop within main column) */}
          {subjectHealth.length > 0 && (
            <div className="px-4 lg:px-0 mb-3">
              <p className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider mb-2 px-1">Your subjects</p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide lg:grid lg:grid-cols-3 lg:gap-2">
                {subjectHealth.map((s, i) => {
                  const c = SUBJECT_COLORS[s.subject] || '#0D9488'
                  const hasAccuracy = s.accuracy !== null
                  return (
                    <button key={i} onClick={() => onNavigate('learn')}
                      className="flex-shrink-0 bg-white rounded-xl px-3 py-2.5 shadow-card flex items-center gap-2.5 active:scale-95 transition-transform min-w-[145px]">
                      <div className="relative w-10 h-10">
                        {hasAccuracy ? (
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                            <circle cx="20" cy="20" r="16" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 16}`} strokeDashoffset={`${2 * Math.PI * 16 * (1 - s.accuracy / 100)}`} />
                          </svg>
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F3F4F6' }} />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center text-sm">{SUBJECT_ICONS[s.subject] || '📖'}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-brand-navy leading-tight">{s.subject.length > 12 ? s.subject.slice(0, 11) + '…' : s.subject}</p>
                        {hasAccuracy ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold font-mono" style={{ color: c }}>{s.accuracy}%</span>
                            <span className={`text-[10px] ${s.trend === 'up' ? 'text-green-600' : s.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                              {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : s.trend === 'new' ? '' : '→'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-brand-slate">{s.totalQuestions > 0 ? `${s.totalQuestions} doubts` : 'Start →'}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* DAILY CHALLENGE (admin-configured, real subject) */}
          {dailyChallenge && (
            <div className="px-4 lg:px-0 mb-3">
              <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#EA580C' }}>Daily Challenge</span>
                  </div>
                  <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full font-mono" style={{ color: '#EA580C', background: '#FFF7ED' }}>+{dailyChallenge.xpReward} XP</span>
                </div>
                <h3 className="text-[16px] font-semibold text-brand-navy mb-0.5">
                  {dailyChallenge.questionCount} questions on {dailyChallenge.subject}
                </h3>
                <p className="text-[13px] text-brand-slate mb-3">Test your understanding — takes ~{Math.ceil(dailyChallenge.questionCount * 1.5)} min</p>
                <button onClick={() => onNavigate('practice', { subject: dailyChallenge.subject })}
                  className="w-full font-semibold py-2.5 rounded-lg text-[15px] active:scale-95 transition-transform" style={{ background: '#EA580C', color: '#FFF7ED' }}>
                  Start challenge →
                </button>
              </div>
            </div>
          )}

          {/* RECENT WINS / BADGES (computed from real milestones, admin-configured) */}
          {badges.length > 0 && (
            <div className="px-4 lg:px-0 mb-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider">Recent wins</h3>
                <button onClick={() => onNavigate('me')} className="text-[13px] font-semibold text-brand-primary">All badges →</button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {badges.map(b => (
                  <div key={b.id} className="flex-shrink-0 bg-white rounded-xl px-3 py-2.5 shadow-card flex items-center gap-2 min-w-[130px]">
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-brand-navy leading-tight">{b.name}</p>
                      <p className="text-[11px] text-brand-slate">Earned</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile activity summary (real) */}
          <div className="lg:hidden px-4 mb-3">
            <div className="w-full flex items-center justify-between bg-white/60 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-3 text-xs text-brand-slate font-medium">
                <span>📅 Today:</span>
                <span className="text-brand-navy font-semibold">{todayActivity.doubts} doubts</span>
                <span>·</span>
                <span className="text-brand-navy font-semibold">{todayXP} XP earned</span>
              </div>
            </div>
          </div>

          {/* Teacher mode accessible via sidebar "Teacher mode" button */}
        </div>

        {/* ══ RIGHT PANEL: Status sidebar (desktop only) ══ */}
        <div className="hidden lg:block w-[300px] flex-shrink-0">
          <div className="sticky top-[72px] space-y-4">

            {/* Daily goal breakdown (real XP by source) */}
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
                  { label: 'Doubts', value: xpBreakdown.doubts, icon: '💬' },
                  { label: 'Practice', value: xpBreakdown.practice, icon: '⚡' },
                  { label: 'Streak', value: xpBreakdown.streak, icon: '🔥' },
                  { label: 'Tests', value: xpBreakdown.test, icon: '📋' },
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

            {/* Subject health (real data from backend) */}
            {subjectHealth.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider">Your subjects</h3>
                  <button onClick={() => onNavigate('learn')} className="text-[13px] font-semibold text-brand-primary">View all →</button>
                </div>
                <div className="space-y-2.5">
                  {subjectHealth.map((s, i) => {
                    const c = SUBJECT_COLORS[s.subject] || '#0D9488'
                    const hasAccuracy = s.accuracy !== null
                    return (
                      <button key={i} onClick={() => onNavigate('learn')}
                        className="w-full flex items-center gap-3 hover:bg-brand-bg rounded-lg px-1 py-1 -mx-1 transition-colors">
                        <div className="relative w-9 h-9 flex-shrink-0">
                          {hasAccuracy ? (
                            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 14}`} strokeDashoffset={`${2 * Math.PI * 14 * (1 - s.accuracy / 100)}`} />
                            </svg>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" />
                          )}
                          <span className="absolute inset-0 flex items-center justify-center text-xs">{SUBJECT_ICONS[s.subject] || '📖'}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[15px] font-medium text-brand-navy">{s.subject}</p>
                        </div>
                        <div className="text-right">
                          {hasAccuracy ? (
                            <>
                              <span className="text-[16px] font-bold text-brand-navy font-mono">{s.accuracy}%</span>
                              <span className={`text-xs ml-1 ${s.trend === 'up' ? 'text-brand-success' : s.trend === 'down' ? 'text-brand-error' : 'text-brand-slate'}`}>
                                {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-brand-slate">
                              {s.totalQuestions > 0 ? `${s.totalQuestions} doubts` : 'New'}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Badges (desktop sidebar) */}
            {badges.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
                <h3 className="text-[12px] font-semibold text-brand-slate uppercase tracking-wider mb-3">Badges earned</h3>
                <div className="space-y-2">
                  {badges.map(b => (
                    <div key={b.id} className="flex items-center gap-2.5 px-1">
                      <span className="text-xl">{b.icon}</span>
                      <p className="text-[14px] font-medium text-brand-navy">{b.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's activity (real counts from DB) */}
            <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
              <h3 className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider mb-2">Today's activity</h3>
              <div className="space-y-1.5">
                {[
                  { icon: '💬', label: 'Doubts asked', value: todayActivity.doubts },
                  { icon: '⚡', label: 'Practice sessions', value: todayActivity.questions },
                  { icon: '📋', label: 'Tests taken', value: todayActivity.tests },
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
