// ═══════════════════════════════════════════════════════════════════════════
// /api/auth — invite-code redemption (school join flow)
// ═══════════════════════════════════════════════════════════════════════════
// Endpoints:
//   POST /api/auth/redeem-invite  — student/teacher submits a 6-digit code
//                                    received from their school admin. On
//                                    match: profile.school_id is set, and if
//                                    the code was a TEACHER code, role is
//                                    promoted to 'teacher'.
//
// Why a separate file (not in school.ts):
//   - school.ts is school_admin-only; this endpoint is called by NON-admins.
//   - Keeps the auth surface explicit at /api/auth/* — easier to reason
//     about access in security review.
//
// Refusal cases:
//   - Code doesn't match any school: 404 (no leak about which schools exist)
//   - Caller already in a school: 409 (must contact school_admin to migrate)
//   - School at max_students cap (student code only): 403 with cap message
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { requireAuth, type SchoolRole } from '../lib/schoolAuth.js'
import { checkRateLimit } from '../lib/rateLimit.js'

const auth = new Hono()

// ─── POST /api/auth/redeem-invite ────────────────────────────────────────
// body: { code: string } — 6 digits, with or without hyphen
auth.post('/redeem-invite', async (c) => {
  const session = await requireAuth(c.req.header('Authorization'))
  if ('error' in session) return c.json({ error: session.error }, session.status)

  // Cap at 20 attempts per user per hour. Higher than school create because
  // a legit user might mistype the code a few times.
  const limited = checkRateLimit(c, `redeem:${session.userId}`, 20, 60 * 60_000)
  if (limited) return limited

  const body = await c.req.json().catch(() => ({}))
  const raw = (body.code || '').toString()
  // Strip non-digit chars so "042-195" and "042 195" and "042195" all work.
  const code = raw.replace(/\D+/g, '')
  if (code.length !== 6) {
    return c.json({ error: 'Code must be 6 digits' }, 400)
  }

  // Refuse if caller already in a school. They'd need school_admin help to
  // migrate — not exposed in v5.
  if (session.profile.school_id) {
    return c.json({ error: 'You are already in a school' }, 409)
  }

  // Refuse if caller is a school_admin or super_admin — those roles join
  // schools through different flows.
  if (session.profile.role === 'school_admin' || session.profile.role === 'super_admin') {
    return c.json({ error: 'School admins cannot redeem invite codes' }, 403)
  }

  // Look up the school. The .or() chain checks both code columns; one match
  // is expected (UNIQUE constraints + cross-column generator) so .single()
  // either gives us the school or 404s.
  const { data: schoolRow } = await supabase
    .from('schools')
    .select('id, name, invite_code_student, invite_code_teacher, max_students')
    .or(`invite_code_student.eq.${code},invite_code_teacher.eq.${code}`)
    .maybeSingle()

  if (!schoolRow) {
    return c.json({ error: 'That code did not match a school. Check with your teacher?' }, 404)
  }

  const isStudentCode = schoolRow.invite_code_student === code
  const isTeacherCode = schoolRow.invite_code_teacher === code

  // Determine the role this code grants. Caller's existing role matters:
  //   - student code: stays 'student' (or 'parent' if a parent is joining as
  //     a student, which doesn't really make sense — block).
  //   - teacher code: requires existing role be 'teacher' OR promote a
  //     'student' to 'teacher' (covers the case where a teacher signed up
  //     as a student by mistake; rare but realistic).
  let newRole: SchoolRole = session.profile.role
  if (isTeacherCode) {
    if (session.profile.role === 'parent') {
      return c.json({ error: 'Parents cannot use teacher codes' }, 403)
    }
    newRole = 'teacher'
  } else if (isStudentCode) {
    if (session.profile.role !== 'student') {
      return c.json({ error: 'Only students can use student codes' }, 403)
    }
  }

  // Cap check: student code only. Teacher count is uncapped (a school with
  // 50 teachers is fine; a school with 50,001 students is the abuse case).
  if (isStudentCode) {
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolRow.id)
      .eq('role', 'student')
    if ((studentCount || 0) >= schoolRow.max_students) {
      return c.json({
        error: `${schoolRow.name} has reached its student limit. Ask your school admin to request more capacity.`,
      }, 403)
    }
  }

  // Apply the join.
  const update: { school_id: string; role?: SchoolRole } = { school_id: schoolRow.id }
  if (newRole !== session.profile.role) update.role = newRole

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', session.userId)

  if (updateErr) {
    console.error('[redeem-invite] profile update failed:', updateErr)
    return c.json({ error: 'Could not join school' }, 500)
  }

  // If this is a teacher who joined, ensure a teacher_classes row exists if
  // they have a class_level (backwards-compatibility — student promoted to
  // teacher without picking a class won't have one yet; settings prompts).
  if (newRole === 'teacher' && session.profile.class_level) {
    await supabase.from('teacher_classes')
      .upsert({
        teacher_id: session.userId,
        class_level: session.profile.class_level,
      }, { onConflict: 'teacher_id,class_level' })
  }

  return c.json({
    school: { id: schoolRow.id, name: schoolRow.name },
    role: newRole,
    promoted: newRole !== session.profile.role,
  })
})

export default auth
