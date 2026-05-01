import { Hono } from 'hono'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { ADMIN_PASSWORD } from '../lib/adminAuth.js'
import { istTodayStartUTC, istDateAddDays, istTodayStr } from '../lib/dateIST.js'

const teacher = new Hono()

async function requireTeacher(authHeader?: string) {
  const u = await getUserFromToken(authHeader)
  if (!u) return { error: 'Unauthorized', status: 401 as const }
  const { data: profile } = await supabase
    .from('profiles').select('role, class_level').eq('id', u.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return { error: 'Forbidden', status: 403 as const }
  }
  return { userId: u.id, profile }
}

// Dual-auth for the review queue: accepts EITHER an X-Admin-Password header
// (admin panel) OR a Bearer token with role=admin/teacher. Lets the moderation
// queue live inside the admin panel without forcing admins to also be Supabase-
// authed users, while keeping the real teacher flow working.
//
// Attribution convention: when reviewed via admin password, `userId` is null
// and `flagged_responses.reviewed_by` is left null. The review path stamps a
// "[admin panel]" prefix on `teacher_notes` so the source is recoverable
// without a schema change. Pilot follow-up (migration 012): add a dedicated
// `reviewed_via` enum column for cleaner audit.
async function requireReviewer(c: any) {
  const adminPwd = c.req.header('X-Admin-Password')
  if (adminPwd && adminPwd === ADMIN_PASSWORD) {
    return { source: 'password' as const, userId: null as string | null }
  }
  const authResult = await requireTeacher(c.req.header('Authorization'))
  if ('error' in authResult) return authResult
  return { source: 'token' as const, userId: authResult.userId, profile: authResult.profile }
}

// ═══ GET /api/teacher/alerts — active alerts for this teacher ═══
teacher.get('/alerts', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const now = new Date().toISOString()
  const { data } = await supabase
    .from('teacher_alerts')
    .select('*')
    .eq('teacher_id', auth.userId)
    .is('dismissed_at', null)
    .gt('expires_at', now)
    .order('generated_at', { ascending: false })

  return c.json({ alerts: data || [] })
})

// ═══ POST /api/teacher/alerts/:id/dismiss ═══
teacher.post('/alerts/:id/dismiss', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const id = c.req.param('id')
  await supabase.from('teacher_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id).eq('teacher_id', auth.userId)
  return c.json({ ok: true })
})

// ═══ POST /api/teacher/alerts/:id/acted — marks action taken ═══
teacher.post('/alerts/:id/acted', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const id = c.req.param('id')
  await supabase.from('teacher_alerts')
    .update({ acted_on_at: new Date().toISOString() })
    .eq('id', id).eq('teacher_id', auth.userId)
  return c.json({ ok: true })
})

// ═══ GET /api/teacher/class-health ═══
// Summary for the teacher's class: published concepts + health per concept
teacher.get('/class-health', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const classLevel = auth.profile?.class_level || 10
  const { data } = await supabase
    .from('class_concept_health')
    .select(`
      *,
      concept_catalog (concept_name, chapter_no, chapter_name, exam_weight_percent)
    `)
    .eq('class_level', classLevel)
    .order('class_avg_score', { ascending: true })

  return c.json({ classLevel, concepts: data || [] })
})

// ═══ REVIEW QUEUE (flagged responses) ═══
// Students flag AI responses via the "Report incorrect" bottom sheet on Ask AI.
// Teachers review each flag: confirm the AI was wrong (with a correction note),
// mark it as actually correct, or mark partial. Teacher notes are a quality
// signal we can use later to fine-tune prompts / training data.

// GET /api/teacher/flagged?status=pending|reviewed|all&subject=&limit=
// Default: status=pending, newest first, limit 100.
teacher.get('/flagged', async (c) => {
  const auth = await requireReviewer(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const status = c.req.query('status') || 'pending'
  const subject = c.req.query('subject') || ''
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500)

  let q = supabase
    .from('flagged_responses')
    .select(`
      id, question_text, ai_response, subject, class_level, report_text,
      status, teacher_notes, reviewed_at, reviewed_by, created_at, session_id,
      student:profiles!flagged_responses_student_id_fkey (id, name, class_level)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status === 'pending') q = q.eq('status', 'pending')
  else if (status === 'reviewed') q = q.neq('status', 'pending')
  // 'all' — no filter

  if (subject) q = q.eq('subject', subject)

  const { data, error } = await q
  if (error) return c.json({ error: error.message }, 500)

  // Per-status counts via 4 parallel head-only count queries instead of a
  // full-table scan. At pilot scale the difference is small; at school scale
  // the prior pattern (SELECT status FROM flagged_responses) would scan
  // every row on every dashboard load.
  const [pendingC, correctC, wrongC, partialC] = await Promise.all([
    supabase.from('flagged_responses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('flagged_responses').select('*', { count: 'exact', head: true }).eq('status', 'correct'),
    supabase.from('flagged_responses').select('*', { count: 'exact', head: true }).eq('status', 'wrong'),
    supabase.from('flagged_responses').select('*', { count: 'exact', head: true }).eq('status', 'partial'),
  ])
  const summary = {
    pending: pendingC.count || 0,
    correct: correctC.count || 0,
    wrong: wrongC.count || 0,
    partial: partialC.count || 0,
    total: (pendingC.count || 0) + (correctC.count || 0) + (wrongC.count || 0) + (partialC.count || 0),
  }

  return c.json({ flagged: data || [], summary })
})

// GET /api/teacher/flagged/:id — full detail incl. original doubt session context
teacher.get('/flagged/:id', async (c) => {
  const auth = await requireReviewer(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const id = c.req.param('id')
  const { data, error } = await supabase
    .from('flagged_responses')
    .select(`
      *,
      student:profiles!flagged_responses_student_id_fkey (id, name, class_level),
      reviewer:profiles!flagged_responses_reviewed_by_fkey (id, name)
    `)
    .eq('id', id)
    .single()
  if (error || !data) return c.json({ error: 'Not found' }, 404)

  // Pull related doubt session for NCERT source + model used
  let session: any = null
  if (data.session_id) {
    const { data: s } = await supabase
      .from('doubt_sessions')
      .select('ncert_source, ncert_confidence, model_used, cache_hit, created_at')
      .eq('id', data.session_id)
      .single()
    session = s
  }

  return c.json({ flagged: data, session })
})

// POST /api/teacher/flagged/:id/review
// body: { status: 'correct'|'wrong'|'partial', teacher_notes: string }
teacher.post('/flagged/:id/review', async (c) => {
  const auth = await requireReviewer(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const id = c.req.param('id')
  const { status, teacher_notes } = await c.req.json<any>()
  if (!['correct', 'wrong', 'partial'].includes(status)) {
    return c.json({ error: 'status must be correct, wrong or partial' }, 400)
  }

  // Attribution: token-auth → reviewed_by = user id; password-auth → null
  // (no Supabase user) but we prefix teacher_notes with "[admin panel] " so
  // the source is recoverable. Schema-clean follow-up is a migration that
  // adds a `reviewed_via` enum column.
  const rawNotes = typeof teacher_notes === 'string' ? teacher_notes.slice(0, 5000) : ''
  const notesWithSource = auth.source === 'password' && rawNotes
    ? `[admin panel] ${rawNotes}`
    : (rawNotes || null)

  const { data, error } = await supabase
    .from('flagged_responses')
    .update({
      status,
      teacher_notes: notesWithSource,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ flagged: data })
})

// POST /api/teacher/flagged/:id/reopen — undo a review (in case of mis-click).
// Authorisation rule: only the reviewer who originally closed it can reopen,
// OR the admin (via admin password) can override. Without this guard, any
// teacher could overwrite another teacher's review notes by reopen + re-review.
teacher.post('/flagged/:id/reopen', async (c) => {
  const auth = await requireReviewer(c)
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const id = c.req.param('id')

  // Pull the existing row to check who reviewed it.
  const { data: existing, error: fetchErr } = await supabase
    .from('flagged_responses')
    .select('reviewed_by, status')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr || !existing) return c.json({ error: 'Not found' }, 404)
  if (existing.status === 'pending') return c.json({ ok: true, alreadyPending: true })

  const isAdminOverride = auth.source === 'password' || auth.profile?.role === 'admin'
  const isOriginalReviewer = auth.source === 'token' && existing.reviewed_by === auth.userId
  if (!isAdminOverride && !isOriginalReviewer) {
    return c.json({ error: 'Only the original reviewer or an admin can reopen this' }, 403)
  }

  const { error } = await supabase
    .from('flagged_responses')
    .update({
      status: 'pending',
      teacher_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ═══ STUDENT LIST (for teachers to browse their class) ═══
// Phase 1: returns all students matching the teacher's class_level. Without a
// `school_id` linkage (Phase 2), we can't scope tighter. Enough for pilot where
// one teacher per class_level handles everyone.
teacher.get('/students', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const q = c.req.query('q')?.toLowerCase() || ''
  const requestedClass = parseInt(c.req.query('class') || '0')

  // Class-scoping: a teacher can only browse students in their own class
  // (class_level on their profile). Admins can override via ?class=N.
  // Without this, a Class 10 teacher could pass ?class=8 and read every
  // Class 8 student's name + email.
  const isAdmin = auth.profile?.role === 'admin'
  const teacherClass = auth.profile?.class_level
  if (!isAdmin && requestedClass && requestedClass !== teacherClass) {
    return c.json({ error: 'You can only view your own class' }, 403)
  }
  const effectiveClass = isAdmin
    ? (requestedClass || null)        // admin: no class filter unless asked
    : (teacherClass || requestedClass) // teacher: always pinned to own class

  // student_xp is a ledger (many rows per student). We'd have to sum per row,
  // which doesn't belong in a list query — level/XP is shown on the profile
  // page instead. Streaks is one-row-per-student so it's cheap to join.
  let query = supabase
    .from('profiles')
    .select(`
      id, name, email, class_level, active_track, created_at,
      streak:student_streaks (current_streak, longest_streak)
    `)
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .limit(200)

  if (effectiveClass) query = query.eq('class_level', effectiveClass)

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 500)

  // Client-side text search over name/email (small result set, so it's fine)
  const filtered = q
    ? (data || []).filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q))
    : (data || [])

  return c.json({ students: filtered })
})

// ═══ STUDENT PROFILE (drill-down) ═══
// One call returns everything the teacher needs to understand this student's
// learning state. Parallelized — targets sub-1s response even for active
// students with 100+ doubt sessions.
teacher.get('/student/:id', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const studentId = c.req.param('id')

  // Profile + streak + xp first (fast).
  // student_xp is an event ledger (one row per XP award) — SUM(amount) gives the total.
  // Level is derived from total XP via the shared LEVEL_TIERS ladder below.
  const [profileRes, streakRes, xpLedger] = await Promise.all([
    supabase.from('profiles').select('id, name, email, class_level, active_track, avatar_url, created_at').eq('id', studentId).single(),
    supabase.from('student_streaks').select('current_streak, longest_streak, last_active_date').eq('student_id', studentId).single(),
    supabase.from('student_xp').select('amount').eq('student_id', studentId),
  ])

  if (profileRes.error || !profileRes.data) {
    return c.json({ error: 'Student not found' }, 404)
  }

  // Class-scoping: teachers can only view profiles in their own class_level.
  // Admins bypass. Without this, knowing the student's UUID is enough to
  // read their full profile + recent doubts (full text) + practice + tests.
  if (auth.profile?.role !== 'admin'
      && profileRes.data.class_level !== auth.profile?.class_level) {
    return c.json({ error: 'Forbidden — student is not in your class' }, 403)
  }

  // Compute total XP + level (keep LEVEL_TIERS in sync with frontend UserContext.tsx)
  const totalXP = (xpLedger.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
  const LEVEL_TIERS = [
    { level: 1, min: 0, name: 'Beginner' },
    { level: 2, min: 200, name: 'Curious' },
    { level: 3, min: 500, name: 'Learner' },
    { level: 4, min: 1000, name: 'Explorer' },
    { level: 5, min: 1600, name: 'Achiever' },
    { level: 6, min: 2400, name: 'Scholar' },
    { level: 7, min: 3500, name: 'Advanced' },
    { level: 8, min: 5000, name: 'Expert' },
    { level: 9, min: 7500, name: 'Master' },
    { level: 10, min: 10000, name: 'Grandmaster' },
  ]
  let xpLevel = LEVEL_TIERS[0]
  for (const t of LEVEL_TIERS) { if (totalXP >= t.min) xpLevel = t; else break }

  // Everything else in parallel
  const [masteryRes, conceptsRes, doubtsRes, practiceRes, testsRes] = await Promise.all([
    supabase
      .from('subject_mastery')
      .select('subject, accuracy_percent, total_questions, correct_answers, weak_topics, strong_topics, last_updated')
      .eq('student_id', studentId),
    supabase
      .from('concept_mastery')
      .select(`
        concept_slug, composite_score, accuracy_score, consistency_score, attempt_count,
        doubt_count, last_practiced_at,
        concept:concept_catalog (concept_name, chapter_name, subject, exam_weight_percent)
      `)
      .eq('student_id', studentId)
      .order('composite_score', { ascending: true })
      .limit(50),
    supabase
      .from('doubt_sessions')
      .select('id, subject, class_level, question_text, ai_response, ncert_source, cache_hit, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('practice_sessions')
      .select('id, subject, chapter, difficulty, total_questions, correct_count, completed, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('test_sessions')
      .select('id, title, subject, class_level, total_marks, score, time_taken_seconds, completed, created_at, completed_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  // Day-by-day activity for the last 30 days, IST-bound. UTC bucketing was
  // misattributing 1-5 AM IST activity to the previous calendar day —
  // teachers viewing student activity expected the student's local day.
  // Convert each created_at (UTC) to its IST calendar day label, then count.
  const istWindowStartUTC = new Date(
    new Date(istTodayStartUTC()).getTime() - 30 * 86400000,
  ).toISOString()
  const cutoffISTDay = istDateAddDays(istTodayStr(), -30)
  const activityMap = new Map<string, number>()
  const bumpIST = (utcTs: string) => {
    if (utcTs < istWindowStartUTC) return
    // Shift UTC → IST then take the date part = IST calendar day.
    const ms = new Date(utcTs).getTime() + 5.5 * 60 * 60 * 1000
    const istDay = new Date(ms).toISOString().split('T')[0]
    if (istDay <= cutoffISTDay) return  // belt + braces against fence-post drift
    activityMap.set(istDay, (activityMap.get(istDay) || 0) + 1)
  }
  ;(doubtsRes.data || []).forEach(r => bumpIST(r.created_at))
  ;(practiceRes.data || []).forEach(r => bumpIST(r.created_at))
  ;(testsRes.data || []).forEach(r => bumpIST(r.created_at))
  const activity30d = Array.from(activityMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))
  const activeDays30 = activityMap.size

  // Top weak concepts: composite_score < 0.5 AND attempts >= 3 (per PRD Section 8C)
  const weakConcepts = (conceptsRes.data || [])
    .filter(c => c.composite_score < 0.5 && c.attempt_count >= 3)
    .slice(0, 10)

  // Recent test accuracy
  const completedTests = (testsRes.data || []).filter(t => t.completed && t.score != null)
  const avgTestPct = completedTests.length
    ? Math.round(completedTests.reduce((sum, t) => sum + (t.score! / t.total_marks) * 100, 0) / completedTests.length)
    : null

  return c.json({
    student: profileRes.data,
    streak: streakRes.data || { current_streak: 0, longest_streak: 0, last_active_date: null },
    xp: { total_xp: totalXP, current_level: xpLevel.level, level_name: xpLevel.name },
    subject_mastery: masteryRes.data || [],
    concept_mastery: conceptsRes.data || [],
    weak_concepts: weakConcepts,
    doubts: doubtsRes.data || [],
    practice: practiceRes.data || [],
    tests: testsRes.data || [],
    stats: {
      total_doubts: (doubtsRes.data || []).length,
      total_practice: (practiceRes.data || []).length,
      total_tests: completedTests.length,
      avg_test_pct: avgTestPct,
      active_days_30: activeDays30,
    },
    activity_30d: activity30d,
  })
})

// ═══ TEACHER DASHBOARD ═══
// "Command Centre" aggregate for the morning open. Everything needed to know
// where attention goes today — stats, class health, concept hotspots, recent
// student activity — in ONE call so the landing page is fast.
teacher.get('/dashboard', async (c) => {
  const auth = await requireTeacher(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const classLevel = auth.profile?.class_level || 10
  const now = new Date()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const nowISO = now.toISOString()

  // Fire everything in parallel — each query is independent.
  const [
    studentsRes, alertsRes, flaggedRes,
    testsWeekRes, masteryRes, healthRes,
    recentDoubtsRes, recentPracticeRes, recentTestsRes,
  ] = await Promise.all([
    // Students in the teacher's class_level
    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('class_level', classLevel),
    // Active alerts (not dismissed, not expired) — return the rows AND the count
    supabase.from('teacher_alerts')
      .select(`
        id, alert_type, title, message, action_label, action_type, action_payload,
        student_id, concept_slug, generated_at,
        student:profiles!teacher_alerts_student_id_fkey (id, name)
      `, { count: 'exact' })
      .eq('teacher_id', auth.userId)
      .is('dismissed_at', null)
      .gt('expires_at', nowISO)
      .order('generated_at', { ascending: false })
      .limit(20),
    // Pending flagged responses (class-scoped)
    supabase.from('flagged_responses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('class_level', classLevel),
    // Tests completed in last 7d (class-scoped)
    supabase.from('test_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('class_level', classLevel)
      .eq('completed', true)
      .gt('completed_at', weekAgo),
    // Aggregated subject mastery across all students in this class
    supabase.from('subject_mastery')
      .select('subject, accuracy_percent, total_questions, student_id, profiles!inner(class_level)')
      .eq('profiles.class_level', classLevel),
    // Class concept health (already aggregated via nightly job)
    supabase.from('class_concept_health')
      .select(`
        concept_slug, class_avg_score, total_students, struggling_students,
        concept:concept_catalog (concept_name, subject, chapter_name, exam_weight_percent)
      `)
      .eq('class_level', classLevel)
      .order('class_avg_score', { ascending: true })
      .limit(20),
    // Recent doubts across the class (last 24h worth, cap 10)
    supabase.from('doubt_sessions')
      .select(`
        id, question_text, subject, created_at,
        student:profiles!inner (id, name, class_level)
      `)
      .eq('profiles.class_level', classLevel)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('practice_sessions')
      .select(`
        id, subject, chapter, total_questions, correct_count, completed, created_at,
        student:profiles!inner (id, name, class_level)
      `)
      .eq('profiles.class_level', classLevel)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('test_sessions')
      .select(`
        id, title, subject, score, total_marks, completed_at,
        student:profiles!inner (id, name, class_level)
      `)
      .eq('profiles.class_level', classLevel)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(10),
  ])

  // Count alerts by type (red/amber/green) for the stat strip
  const alertBreakdown = { red: 0, amber: 0, green: 0 }
  for (const a of alertsRes.data || []) {
    if (a.alert_type in alertBreakdown) {
      (alertBreakdown as any)[a.alert_type]++
    }
  }

  // Aggregate subject health: per subject -> avg accuracy across students, count struggling (<60%)
  type SubjectAgg = { subject: string, sumAcc: number, cnt: number, struggling: number, totalQs: number }
  const subjectMap = new Map<string, SubjectAgg>()
  for (const row of (masteryRes.data as any[] || [])) {
    const s = row.subject
    if (!s) continue
    if (!subjectMap.has(s)) subjectMap.set(s, { subject: s, sumAcc: 0, cnt: 0, struggling: 0, totalQs: 0 })
    const a = subjectMap.get(s)!
    a.sumAcc += row.accuracy_percent || 0
    a.cnt++
    if ((row.accuracy_percent || 0) < 60) a.struggling++
    a.totalQs += row.total_questions || 0
  }
  const classHealth = Array.from(subjectMap.values())
    .map(a => ({
      subject: a.subject,
      accuracy: a.cnt ? Math.round(a.sumAcc / a.cnt) : 0,
      studentsTracked: a.cnt,
      struggling: a.struggling,
      totalQuestions: a.totalQs,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)

  // Concept hotspots: concepts with < 0.5 class avg and >= 3 students struggling
  const hotspots = (healthRes.data as any[] || [])
    .filter(h => h.class_avg_score != null && h.class_avg_score < 0.5 && (h.struggling_students || 0) >= 3)
    .slice(0, 5)

  // Merge recent activity into one sorted timeline
  type ActivityItem = {
    type: 'doubt' | 'practice' | 'test'
    id: string
    timestamp: string
    student_id: string
    student_name: string | null
    subject: string | null
    summary: string
    score?: string
  }
  const activity: ActivityItem[] = []
  for (const d of (recentDoubtsRes.data as any[] || [])) {
    activity.push({
      type: 'doubt', id: d.id, timestamp: d.created_at,
      student_id: d.student?.id, student_name: d.student?.name,
      subject: d.subject, summary: (d.question_text || '').slice(0, 120),
    })
  }
  for (const p of (recentPracticeRes.data as any[] || [])) {
    const pct = p.total_questions ? Math.round((p.correct_count / p.total_questions) * 100) : null
    activity.push({
      type: 'practice', id: p.id, timestamp: p.created_at,
      student_id: p.student?.id, student_name: p.student?.name,
      subject: p.subject, summary: `Practice — ${p.chapter || p.subject}`,
      score: pct != null ? `${p.correct_count}/${p.total_questions} (${pct}%)` : undefined,
    })
  }
  for (const t of (recentTestsRes.data as any[] || [])) {
    const pct = t.score != null && t.total_marks ? Math.round((t.score / t.total_marks) * 100) : null
    activity.push({
      type: 'test', id: t.id, timestamp: t.completed_at || '',
      student_id: t.student?.id, student_name: t.student?.name,
      subject: t.subject, summary: t.title || 'Test',
      score: pct != null ? `${t.score}/${t.total_marks} (${pct}%)` : undefined,
    })
  }
  activity.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
  const recentActivity = activity.slice(0, 15)

  return c.json({
    classLevel,
    stats: {
      students: studentsRes.count || 0,
      alerts: alertsRes.count || 0,
      alertsByType: alertBreakdown,
      flaggedPending: flaggedRes.count || 0,
      testsThisWeek: testsWeekRes.count || 0,
    },
    alerts: alertsRes.data || [],
    classHealth,
    hotspots,
    recentActivity,
  })
})

export default teacher
