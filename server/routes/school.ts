// ═══════════════════════════════════════════════════════════════════════════
// /api/school — multi-tenant school management
// ═══════════════════════════════════════════════════════════════════════════
// Endpoints:
//   POST /api/school/create               — provision a new school. Caller
//                                            becomes the school_admin.
//   POST /api/school/regenerate-code      — rotate one of the invite codes.
//                                            Old code is immediately invalid.
//   GET  /api/school/dashboard            — overview cards for the school
//                                            admin (counts, codes, recent
//                                            signups, top weak concepts).
//
// All endpoints require Supabase Auth. /create can be called by any logged-in
// user with school_id IS NULL (signup → first-time setup). /regenerate-code
// and /dashboard require role=school_admin AND a provisioned school.
//
// Per-school caps (max_students, max_doubts_per_day) are configured at create
// time with sensible defaults; super_admin can adjust later via /api/super-
// admin/school/:id/update (not in Sprint 0).
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import {
  requireAuth,
  requireSchoolAdmin,
  generateUniqueInviteCode,
  type SchoolRole,
} from '../lib/schoolAuth.js'
import { istTodayStartUTC } from '../lib/dateIST.js'
import { checkRateLimit } from '../lib/rateLimit.js'

const school = new Hono()

// ─── POST /api/school/create ─────────────────────────────────────────────
// Caller signs up via the normal Supabase Auth flow with role='school_admin'
// in raw_user_meta_data, then calls this endpoint to provision a school.
// Idempotency: if the caller already has school_id set, refuse — they should
// regenerate a code instead of creating a second school. (Multiple schools
// per user is a Phase 2 feature; v5 = one school per school_admin.)
school.post('/create', async (c) => {
  const auth = await requireAuth(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  // Cap school creation at 5/hr/user — abuse fuse, not a real limit.
  // A legit school_admin creates exactly one school in their lifetime.
  const limited = checkRateLimit(c, `school-create:${auth.userId}`, 5, 60 * 60_000)
  if (limited) return limited

  if (auth.profile.school_id) {
    return c.json({ error: 'You already belong to a school' }, 409)
  }

  const body = await c.req.json().catch(() => ({}))
  const name = (body.name || '').toString().trim()
  if (!name || name.length < 2 || name.length > 200) {
    return c.json({ error: 'School name must be 2–200 characters' }, 400)
  }

  // Generate two codes (unique across both columns app-side).
  const studentCode = await generateUniqueInviteCode()
  let teacherCode = await generateUniqueInviteCode()
  // Defensive: extremely unlikely the second generator picks the same value as
  // the first since the first isn't yet in the DB. Re-roll if it happens.
  while (teacherCode === studentCode) teacherCode = await generateUniqueInviteCode()

  const { data: schoolRow, error: insertErr } = await supabase
    .from('schools')
    .insert({
      name,
      invite_code_student: studentCode,
      invite_code_teacher: teacherCode,
      created_by: auth.userId,
      // Caps come from migration defaults (500 students, 5000 doubts/day).
      // Override at create-time intentionally not exposed; super_admin can
      // bump later if a school requests headroom.
    })
    .select('id, name, invite_code_student, invite_code_teacher, max_students, max_doubts_per_day, created_at')
    .single()

  if (insertErr || !schoolRow) {
    console.error('[school/create] insert failed:', insertErr)
    return c.json({ error: insertErr?.message || 'Could not create school' }, 500)
  }

  // Link the caller as school_admin. Two updates because we want both
  // role + school_id atomic from the caller's POV.
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ role: 'school_admin' as SchoolRole, school_id: schoolRow.id })
    .eq('id', auth.userId)

  if (profileErr) {
    // Rollback the school row to keep the DB clean. Best-effort.
    await supabase.from('schools').delete().eq('id', schoolRow.id)
    console.error('[school/create] profile update failed, rolled back:', profileErr)
    return c.json({ error: 'Could not link you as school admin' }, 500)
  }

  return c.json({
    school: {
      id: schoolRow.id,
      name: schoolRow.name,
      inviteCodeStudent: schoolRow.invite_code_student,
      inviteCodeTeacher: schoolRow.invite_code_teacher,
      maxStudents: schoolRow.max_students,
      maxDoubtsPerDay: schoolRow.max_doubts_per_day,
      createdAt: schoolRow.created_at,
    },
  })
})

// ─── POST /api/school/regenerate-code ────────────────────────────────────
// body: { type: 'student' | 'teacher' }
// Rotates one of the two codes. Old code becomes 404 at /redeem-invite the
// instant this endpoint returns. New code is shown once; school admin shares
// out-of-band.
school.post('/regenerate-code', async (c) => {
  const auth = await requireSchoolAdmin(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  // Cap regeneration at 10/hr — prevents accidental keymashing locking out
  // a school during a frantic re-share.
  const limited = checkRateLimit(c, `school-regen:${auth.userId}`, 10, 60 * 60_000)
  if (limited) return limited

  const body = await c.req.json().catch(() => ({}))
  const type = body.type
  if (type !== 'student' && type !== 'teacher') {
    return c.json({ error: 'type must be "student" or "teacher"' }, 400)
  }

  const newCode = await generateUniqueInviteCode()
  const column = type === 'student' ? 'invite_code_student' : 'invite_code_teacher'

  const { error } = await supabase
    .from('schools')
    .update({ [column]: newCode })
    .eq('id', auth.schoolId)

  if (error) {
    console.error('[school/regenerate-code]', error)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ code: newCode, type })
})

// ─── GET /api/school/dashboard ───────────────────────────────────────────
// Single round-trip for the school admin's home screen. Parallelised counts
// + lists. Reads are read-only — no mutations here, so this is safe to poll
// every 60s from the frontend.
school.get('/dashboard', async (c) => {
  try {
    return await dashboardImpl(c)
  } catch (err: any) {
    console.error('[school/dashboard] UNCAUGHT:', err?.message, '\n', err?.stack)
    return c.json({ error: err?.message || 'Internal server error' }, 500)
  }
})

async function dashboardImpl(c: any) {
  const auth = await requireSchoolAdmin(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  console.log('[school/dashboard] schoolId=', auth.schoolId)

  const todayUTC = istTodayStartUTC()   // already an ISO string
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // School row first (gates everything else — if the school is gone, we 404).
  // Single source of truth for the response shape; all other queries are
  // wrapped in Promise.allSettled so a single sub-query failure (e.g. the
  // concept_mastery join not having any rows yet for a brand-new school)
  // doesn't 500 the whole dashboard.
  const { data: schoolData, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name, invite_code_student, invite_code_teacher, max_students, max_doubts_per_day, created_at')
    .eq('id', auth.schoolId).single()
  if (schoolErr || !schoolData) {
    console.error('[school/dashboard] school fetch failed:', schoolErr)
    return c.json({ error: 'School not found' }, 404)
  }

  // Get student IDs in this school first — used to scope doubt-session counts
  // without relying on a PostgREST join filter (which has been the flaky bit).
  const { data: schoolStudentRows } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', auth.schoolId)
  const schoolStudentIds = (schoolStudentRows || []).map((r: any) => r.id)

  // Helper: extract value from settled result, log + default on rejection.
  function settledValue<T>(res: PromiseSettledResult<T>, label: string, fallback: T): T {
    if (res.status === 'fulfilled') return res.value
    console.error(`[school/dashboard] sub-query "${label}" rejected:`, res.reason)
    return fallback
  }

  const results = await Promise.allSettled([
    // Student count
    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', auth.schoolId).eq('role', 'student'),

    // Teacher count
    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', auth.schoolId).eq('role', 'teacher'),

    // Doubts today — using student-ID list (no join required, more robust).
    // Empty schools (no students) return 0.
    schoolStudentIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : supabase.from('doubt_sessions')
          .select('id', { count: 'exact', head: true })
          .in('student_id', schoolStudentIds)
          .gte('created_at', todayUTC),

    // Doubts last 7d
    schoolStudentIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : supabase.from('doubt_sessions')
          .select('id', { count: 'exact', head: true })
          .in('student_id', schoolStudentIds)
          .gte('created_at', sevenDaysAgo),

    // Last 10 signups
    supabase.from('profiles')
      .select('id, name, role, class_level, created_at')
      .eq('school_id', auth.schoolId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Top weak concepts — same pattern: filter by student-ID set, then JOIN
    // concept_catalog. Sidesteps the previous double-inner-join parsing.
    schoolStudentIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.from('concept_mastery')
          .select(`
            concept_slug,
            accuracy_score,
            concept_catalog (concept_name, chapter_name)
          `)
          .in('student_id', schoolStudentIds)
          .order('accuracy_score', { ascending: true })
          .limit(50),
  ])

  const [studentsCount, teachersCount, doubtsTodayCount, doubtsLast7dCount, recentSignups, weakConcepts] = results

  // Aggregate top weak concepts (group by slug, mean accuracy, ≥2 students).
  const wcRows = (settledValue(weakConcepts as any, 'weakConcepts', { data: [] }).data || []) as any[]
  const conceptMap = new Map<string, { name: string; chapter: string; total: number; sum: number }>()
  for (const row of wcRows) {
    const slug = row.concept_slug
    const name = row.concept_catalog?.concept_name || slug
    const chapter = row.concept_catalog?.chapter_name || ''
    const cur = conceptMap.get(slug) || { name, chapter, total: 0, sum: 0 }
    cur.total += 1
    cur.sum += row.accuracy_score || 0
    conceptMap.set(slug, cur)
  }
  const topWeak = Array.from(conceptMap.entries())
    .map(([slug, v]) => ({
      slug,
      name: v.name,
      chapter: v.chapter,
      avgMastery: v.total ? Math.round((v.sum / v.total) * 100) : 0,
      studentsAffected: v.total,
    }))
    .filter(x => x.studentsAffected >= 2)        // require ≥2 students for stat-validity
    .sort((a, b) => a.avgMastery - b.avgMastery)
    .slice(0, 5)

  return c.json({
    school: {
      id: schoolData.id,
      name: schoolData.name,
      inviteCodeStudent: schoolData.invite_code_student,
      inviteCodeTeacher: schoolData.invite_code_teacher,
      maxStudents: schoolData.max_students,
      maxDoubtsPerDay: schoolData.max_doubts_per_day,
      createdAt: schoolData.created_at,
    },
    counts: {
      students: settledValue(studentsCount as any, 'studentsCount', { count: 0 }).count || 0,
      teachers: settledValue(teachersCount as any, 'teachersCount', { count: 0 }).count || 0,
      doubtsToday: settledValue(doubtsTodayCount as any, 'doubtsTodayCount', { count: 0 }).count || 0,
      doubtsLast7d: settledValue(doubtsLast7dCount as any, 'doubtsLast7dCount', { count: 0 }).count || 0,
    },
    recentSignups: settledValue(recentSignups as any, 'recentSignups', { data: [] }).data || [],
    topWeakConcepts: topWeak,
  })
}

export default school
