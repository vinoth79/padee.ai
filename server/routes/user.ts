import { Hono } from 'hono'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { getAppConfig } from '../routes/admin.js'

const user = new Hono()

// GET /api/user/profile -- returns the current user's profile
user.get('/profile', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', u.id)
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

// POST /api/user/onboarding -- set class, subjects, track
user.post('/onboarding', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { className, subjects, track } = await c.req.json()

  await supabase.from('profiles').update({
    class_level: className,
    active_track: track,
  }).eq('id', u.id)

  await supabase.from('student_subjects').delete().eq('student_id', u.id)
  if (subjects?.length > 0) {
    await supabase.from('student_subjects').insert(
      subjects.map((s: string) => ({ student_id: u.id, subject_code: s }))
    )
  }

  return c.json({ ok: true })
})

// GET /api/user/home-data -- ALL data the home screen needs in one call
user.get('/home-data', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const today = new Date().toISOString().split('T')[0]

  const [
    profile,
    xpRows,
    streaks,
    mastery,
    recentDoubts,
    subjects,
    todayDoubtsCount,
    todayPracticeCount,
    feedbackRows,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', u.id).single(),
    supabase.from('student_xp').select('amount, source, created_at').eq('student_id', u.id),
    supabase.from('student_streaks').select('*').eq('student_id', u.id).single(),
    supabase.from('subject_mastery').select('*').eq('student_id', u.id),
    supabase.from('doubt_sessions')
      .select('id, subject, question_text, created_at')
      .eq('student_id', u.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('student_subjects').select('subject_code').eq('student_id', u.id),
    supabase.from('doubt_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', u.id)
      .gte('created_at', `${today}T00:00:00`),
    supabase.from('practice_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', u.id)
      .gte('created_at', `${today}T00:00:00`),
    supabase.from('doubt_feedback')
      .select('helpful')
      .eq('student_id', u.id),
  ])

  // Compute XP totals and breakdowns
  const allXP = xpRows.data || []
  const totalXP = allXP.reduce((s: number, r: any) => s + r.amount, 0)
  const todayXPRows = allXP.filter((r: any) => r.created_at?.startsWith(today))
  const todayXP = todayXPRows.reduce((s: number, r: any) => s + r.amount, 0)

  // XP breakdown by source for today
  const xpBreakdown = { doubts: 0, practice: 0, test: 0, streak: 0, other: 0 }
  for (const r of todayXPRows) {
    if (r.source === 'doubt') xpBreakdown.doubts += r.amount
    else if (r.source === 'practice') xpBreakdown.practice += r.amount
    else if (r.source === 'test') xpBreakdown.test += r.amount
    else if (r.source === 'streak') xpBreakdown.streak += r.amount
    else xpBreakdown.other += r.amount
  }

  // Recent doubt topics for "Continue where you left off"
  const recentDoubtsData = (recentDoubts.data || []).map((d: any) => ({
    id: d.id,
    subject: d.subject,
    topic: d.question_text?.slice(0, 80) || '',
    createdAt: d.created_at,
  }))

  // Subjects the student selected during onboarding
  const selectedSubjects = (subjects.data || []).map((s: any) => s.subject_code)

  // Subject-level stats from doubt_sessions (if subject_mastery is empty)
  // Count doubts per subject to show per-subject engagement
  const subjectDoubts: Record<string, number> = {}
  for (const d of recentDoubts.data || []) {
    subjectDoubts[d.subject] = (subjectDoubts[d.subject] || 0) + 1
  }

  // Build subject health from mastery table if available, else from doubt counts
  const masteryData = mastery.data || []
  const subjectHealth = selectedSubjects.map((subj: string) => {
    const m = masteryData.find((r: any) => r.subject === subj)
    if (m) {
      return {
        subject: subj,
        accuracy: m.accuracy_percent,
        totalQuestions: m.total_questions,
        trend: m.accuracy_percent >= 70 ? 'up' : m.accuracy_percent >= 50 ? 'stable' : 'down',
      }
    }
    // No mastery data yet -- show doubt count as engagement indicator
    return {
      subject: subj,
      accuracy: null,
      totalQuestions: subjectDoubts[subj] || 0,
      trend: 'new',
    }
  })

  // Today's activity
  const todayActivity = {
    doubts: todayDoubtsCount.count || 0,
    questions: (todayPracticeCount.count || 0),
    tests: 0,  // no test sessions wired yet
  }

  // Feedback stats
  const totalFeedback = feedbackRows.data?.length || 0
  const helpfulCount = feedbackRows.data?.filter((f: any) => f.helpful).length || 0

  // ── Admin-configurable features ──
  const config = await getAppConfig()
  const currentStreak = streaks.data?.current_streak || 0
  const totalDoubts = (recentDoubts.data || []).length // from the 5 we fetched, but need total count
  // Get full doubt count for badge computation
  const { count: allDoubtsCount } = await supabase
    .from('doubt_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', u.id)

  const { count: photoDoubtsCount } = await supabase
    .from('doubt_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', u.id)
    .not('session_metadata->photo', 'is', null)

  const distinctSubjects = new Set((recentDoubts.data || []).map((d: any) => d.subject))

  // Compute badge stats
  const badgeStats = {
    doubts: allDoubtsCount || 0,
    photoDoubts: photoDoubtsCount || 0,
    streak: currentStreak,
    xp: totalXP,
    subjects: distinctSubjects.size,
  }

  // Evaluate badge conditions from admin config
  function parseBadgeCondition(condition: string): (stats: typeof badgeStats) => boolean {
    const match = condition.match(/^(\w+)\s*>=\s*(\d+)$/)
    if (!match) return () => false
    const [, field, threshold] = match
    return (stats) => (stats as any)[field] >= parseInt(threshold)
  }

  const unlockedBadges = (config.badges || [])
    .filter((b: any) => parseBadgeCondition(b.condition)(badgeStats))
    .map((b: any) => ({ id: b.id, name: b.name, icon: b.icon }))

  // Daily challenge (deterministic per day)
  const challengeConfig = config.dailyChallenge || { questionCount: 5, xpReward: 30, preferWeakSubject: true }
  let challengeSubject = selectedSubjects[0] || 'Physics'
  if (challengeConfig.preferWeakSubject) {
    const weakest = subjectHealth
      .filter((s: any) => s.accuracy !== null)
      .sort((a: any, b: any) => (a.accuracy || 100) - (b.accuracy || 100))[0]
    if (weakest) challengeSubject = weakest.subject
    else {
      // No mastery data — pick subject with fewest doubts
      const least = subjectHealth.sort((a: any, b: any) => a.totalQuestions - b.totalQuestions)[0]
      if (least) challengeSubject = least.subject
    }
  }

  const dailyChallenge = {
    subject: challengeSubject,
    questionCount: challengeConfig.questionCount,
    xpReward: challengeConfig.xpReward,
  }

  // Weak topic threshold from config
  const weakThreshold = config.weakTopicThreshold || 70

  // NCERT content available (for Learn screen)
  const { data: ncertContent } = await supabase
    .from('ncert_uploads')
    .select('subject, class_level, chapter_number, chapter_name, chunk_count, status')
    .eq('status', 'completed')
    .order('subject')

  return c.json({
    profile: profile.data,
    ncertContent: ncertContent || [],
    totalXP,
    todayXP,
    dailyGoal: config.dailyGoal || 50,
    xpBreakdown,
    streak: streaks.data || { current_streak: 0, longest_streak: 0 },
    mastery: masteryData,
    subjectHealth,
    selectedSubjects,
    recentDoubts: recentDoubtsData,
    todayActivity,
    feedbackStats: { total: totalFeedback, helpful: helpfulCount },
    badges: unlockedBadges,
    badgeStats,
    dailyChallenge,
    weakTopicThreshold: weakThreshold,
  })
})

export default user
