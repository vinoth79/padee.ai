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

// ═══ GET /api/user/learn-data ═══
// Powers the Learn screen: enrolled subjects → chapters → concepts + mastery,
// plus today's focus concept and recently studied concepts.
user.get('/learn-data', async (c) => {
  const t0 = Date.now()
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  const tAuth = Date.now() - t0

  // Wave 1: student-scoped queries (independent of class_level) — fire in parallel
  const tW1 = Date.now()
  const [profileRes, subRowsRes, masteryRowsRes, recRes] = await Promise.all([
    supabase.from('profiles').select('class_level').eq('id', u.id).single(),
    supabase.from('student_subjects').select('subject_code').eq('student_id', u.id),
    supabase.from('concept_mastery')
      .select('concept_slug, composite_score, accuracy_score, attempt_count, correct_count, last_practiced_at')
      .eq('student_id', u.id),
    supabase.from('student_recommendations').select('*').eq('student_id', u.id).maybeSingle(),
  ])
  const tWave1 = Date.now() - tW1

  const profile = profileRes.data
  const classLevel = profile?.class_level || 10
  const enrolledSubjects: string[] = (subRowsRes.data || []).map((s: any) => s.subject_code)
  const masteryRows = masteryRowsRes.data
  const rec = recRes.data

  // Wave 2: class-scoped queries — fire in parallel now that we have classLevel
  const tW2 = Date.now()
  const [uploadsRes, conceptsRes] = await Promise.all([
    supabase.from('ncert_uploads')
      .select('subject, class_level, chapter_number, chapter_name, chunk_count')
      .eq('class_level', classLevel)
      .eq('status', 'completed')
      .order('chapter_number', { ascending: true }),
    supabase.from('concept_catalog')
      .select('concept_slug, concept_name, subject, class_level, chapter_no, chapter_name, syllabus_order, exam_weight_percent, brief_summary')
      .eq('class_level', classLevel)
      .eq('status', 'published')
      .order('syllabus_order', { ascending: true }),
  ])
  const tWave2 = Date.now() - tW2

  const uploads = uploadsRes.data
  const allConcepts = conceptsRes.data

  // Log timing so we can diagnose slow loads
  console.log(`[learn-data] auth=${tAuth}ms wave1=${tWave1}ms wave2=${tWave2}ms total=${Date.now() - t0}ms`)
  const masteryBySlug = new Map((masteryRows || []).map((m: any) => [m.concept_slug, m]))

  // Today's focus (rec was fetched in Wave 1)
  let todayFocus: any = null
  if (rec && rec.hero_type && rec.hero_type !== 'none' && rec.hero_concept_slug) {
    const focusConcept = (allConcepts || []).find((c: any) => c.concept_slug === rec.hero_concept_slug)
    if (focusConcept) {
      const m = masteryBySlug.get(rec.hero_concept_slug)
      todayFocus = {
        concept_slug: focusConcept.concept_slug,
        concept_name: focusConcept.concept_name,
        subject: focusConcept.subject,
        chapter_name: focusConcept.chapter_name,
        chapter_no: focusConcept.chapter_no,
        exam_weight_percent: focusConcept.exam_weight_percent,
        hero_type: rec.hero_type,
        hero_copy: rec.hero_copy,
        brief_summary: focusConcept.brief_summary,
        failure_count: m ? (m.attempt_count - m.correct_count) : 0,
        accuracy_percent: m ? Math.round((m.accuracy_score || 0) * 100) : null,
      }
    }
  }

  // Recently studied concepts (last 5 distinct)
  const recentConcepts: any[] = []
  const seen = new Set<string>()
  const byRecency = [...(masteryRows || [])]
    .filter((m: any) => m.last_practiced_at)
    .sort((a: any, b: any) => new Date(b.last_practiced_at).getTime() - new Date(a.last_practiced_at).getTime())
  for (const m of byRecency) {
    if (seen.has(m.concept_slug) || recentConcepts.length >= 5) continue
    seen.add(m.concept_slug)
    const concept = (allConcepts || []).find((c: any) => c.concept_slug === m.concept_slug)
    if (!concept) continue
    recentConcepts.push({
      concept_slug: concept.concept_slug,
      concept_name: concept.concept_name,
      subject: concept.subject,
      chapter_name: concept.chapter_name,
      last_practiced_at: m.last_practiced_at,
      mastery_status: statusFromScore(m.composite_score, m.attempt_count),
    })
  }

  // Build subject → chapters → concepts tree
  const subjectsOut: any[] = []
  const allSubjects = Array.from(new Set([
    ...enrolledSubjects,
    ...(allConcepts || []).map((c: any) => c.subject),
    ...(uploads || []).map((u: any) => u.subject),
  ])).filter(s => s && enrolledSubjects.includes(s))  // only show enrolled

  for (const subject of allSubjects) {
    const subjectConcepts = (allConcepts || []).filter((c: any) => c.subject === subject)
    const subjectUploads = (uploads || []).filter((u: any) => u.subject === subject)
    const hasContent = subjectUploads.length > 0 || subjectConcepts.length > 0

    if (!hasContent) {
      subjectsOut.push({
        subject,
        no_content: true,
        overall_mastery: 0,
        counts: { mastered: 0, learning: 0, weak: 0, not_started: 0, total: 0 },
        chapters: [],
      })
      continue
    }

    // Group concepts by chapter. Use chapter from ncert_uploads as primary source
    // (so we show chapters that have uploaded content even if no concepts extracted yet).
    const chapterMap = new Map<number, any>()
    for (const up of subjectUploads) {
      chapterMap.set(up.chapter_number, {
        chapter_no: up.chapter_number,
        chapter_name: up.chapter_name,
        passage_count: up.chunk_count || 0,
        concepts: [],
      })
    }
    // Attach concepts to their chapters; if chapter_no not in uploads, still show it
    for (const concept of subjectConcepts) {
      if (!chapterMap.has(concept.chapter_no)) {
        chapterMap.set(concept.chapter_no, {
          chapter_no: concept.chapter_no,
          chapter_name: concept.chapter_name,
          passage_count: 0,
          concepts: [],
        })
      }
      const m = masteryBySlug.get(concept.concept_slug)
      const status = m
        ? statusFromScore(m.composite_score, m.attempt_count)
        : 'not_started'
      chapterMap.get(concept.chapter_no)!.concepts.push({
        concept_slug: concept.concept_slug,
        concept_name: concept.concept_name,
        syllabus_order: concept.syllabus_order,
        exam_weight_percent: concept.exam_weight_percent,
        brief_summary: concept.brief_summary,
        mastery_status: status,
        composite_score: m ? Math.round((m.composite_score || 0) * 100) / 100 : null,
        accuracy_percent: m ? Math.round((m.accuracy_score || 0) * 100) : null,
        attempt_count: m?.attempt_count || 0,
        failure_count: m ? (m.attempt_count - m.correct_count) : 0,
        last_practiced_at: m?.last_practiced_at || null,
      })
    }
    const chapters = Array.from(chapterMap.values()).sort((a, b) => a.chapter_no - b.chapter_no)
    for (const ch of chapters) {
      ch.concepts.sort((a: any, b: any) => a.syllabus_order - b.syllabus_order)
    }

    // Aggregate per-subject stats
    const flatConcepts = chapters.flatMap(ch => ch.concepts)
    const counts = {
      mastered: flatConcepts.filter(c => c.mastery_status === 'mastered').length,
      learning: flatConcepts.filter(c => c.mastery_status === 'learning').length,
      weak: flatConcepts.filter(c => c.mastery_status === 'weak').length,
      not_started: flatConcepts.filter(c => c.mastery_status === 'not_started').length,
      total: flatConcepts.length,
    }
    // Overall mastery: average composite_score of attempted concepts × 100
    const attempted = flatConcepts.filter(c => c.composite_score != null)
    const overall_mastery = attempted.length > 0
      ? Math.round((attempted.reduce((s, c) => s + (c.composite_score || 0), 0) / attempted.length) * 100)
      : 0

    // Last studied date for this subject
    const lastDates = attempted.map(c => c.last_practiced_at).filter(Boolean)
    const last_studied_at = lastDates.length > 0
      ? lastDates.sort().reverse()[0]
      : null

    // Next concept to learn: first not_started in syllabus order, else first weak
    const next_concept = flatConcepts.find(c => c.mastery_status === 'not_started')
      || flatConcepts.find(c => c.mastery_status === 'weak')
      || null

    subjectsOut.push({
      subject,
      no_content: false,
      overall_mastery,
      counts,
      last_studied_at,
      next_concept: next_concept ? {
        concept_slug: next_concept.concept_slug,
        concept_name: next_concept.concept_name,
        chapter_name: chapters.find(ch => ch.concepts.includes(next_concept))?.chapter_name,
      } : null,
      chapters,
    })
  }

  return c.json({
    classLevel,
    enrolledSubjects,
    todayFocus,
    recentConcepts,
    subjects: subjectsOut,
  })
})

// Helper: map composite_score + attempts → simple status label
function statusFromScore(score: number | null | undefined, attempts: number | null | undefined): string {
  if (!score || !attempts || attempts === 0) return 'not_started'
  if (attempts >= 3 && score < 0.45) return 'weak'
  if (score < 0.65) return 'learning'
  if (score < 0.80) return 'learning'
  return 'mastered'
}

export default user
