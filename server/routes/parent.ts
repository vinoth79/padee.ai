// ═══════════════════════════════════════════════════════════════════════════
// /api/parent — parent ↔ student linking + read-only child progress
// ═══════════════════════════════════════════════════════════════════════════
// Endpoints:
//   POST /api/parent/link      — parent enters a student's email, gets back
//                                 an 8-char code to show the student.
//                                 Inserts an UNVERIFIED row into
//                                 parent_student_links.
//   POST /api/parent/verify    — student enters the parent's code; we set
//                                 verified_at and clear link_code.
//   GET  /api/parent/children  — parent's verified children with the
//                                 stats their dashboard needs (XP, streak,
//                                 weakest subject, last active).
//   GET  /api/parent/pending-incoming
//                              — student-side: any unverified rows where I
//                                 am the student. Used by PendingLinkBanner
//                                 on the home screen.
//
// Verification flow (PRD v5 §F5):
//   1. Parent at /parent/link enters student's email → /link
//   2. Backend creates parent_student_links row with random 8-char code
//   3. Parent shows the code to the student (in person / WhatsApp / phone)
//   4. Student logs in, banner on /home: "<parent name> wants to link as
//      a parent. Enter their code: [____]"
//   5. Student submits code → /verify sets verified_at, clears code
//   6. Parent's /parent now lists that child
//
// What parents CANNOT see (v5 read-only floor):
//   - Full doubt question text (only count + last-active timestamp)
//   - Test answer breakdowns (only score + accuracy)
//   - Live session data
// These are deliberate. v5.1 may relax some of them after privacy review.
//
// Multi-link semantics:
//   - One parent : N students  (siblings) — supported
//   - Two parents : 1 student  (mum + dad) — supported, separate rows
//   - Self-link (parent_id == student_id) — blocked at DB level (CHECK)
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { requireAuth, requireRole, generateLinkCode } from '../lib/schoolAuth.js'
import { checkRateLimit } from '../lib/rateLimit.js'

const parent = new Hono()

// ─── POST /api/parent/link ───────────────────────────────────────────────
// body: { studentEmail: string }
// Creates a pending parent_student_links row. Returns the link_code that
// the parent will read out / show to the student.
parent.post('/link', async (c) => {
  const auth = await requireRole(c.req.header('Authorization'), ['parent'])
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  // 10/hr/parent. Higher than school_create (5) because a parent might
  // legitimately mistype an email or want to link siblings sequentially.
  const limited = checkRateLimit(c, `parent-link:${auth.userId}`, 10, 60 * 60_000)
  if (limited) return limited

  const body = await c.req.json().catch(() => ({}))
  const rawEmail = (body.studentEmail || '').toString().trim().toLowerCase()
  if (!rawEmail || !rawEmail.includes('@')) {
    return c.json({ error: 'Provide the student’s email address' }, 400)
  }

  // Look up the student. Service-role key bypasses RLS so this just works.
  // Restrict to role=student to prevent linking to teachers/admins.
  const { data: student } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('email', rawEmail)
    .eq('role', 'student')
    .maybeSingle()

  if (!student) {
    // Generic message: don't leak whether the email is registered.
    return c.json({
      error: 'No student account found for that email. Ask your child to sign up first.',
    }, 404)
  }

  // Self-link guard (defence-in-depth — DB also has a CHECK constraint).
  if (student.id === auth.userId) {
    return c.json({ error: 'You cannot link to yourself' }, 400)
  }

  // Already linked? Two cases:
  //   - verified_at IS NOT NULL → already confirmed, return ok with status
  //   - verified_at IS NULL → pending, regenerate the code so the parent
  //     can see it again (UX: a parent who lost the code shouldn't be
  //     stuck — they own this row).
  const { data: existing } = await supabase
    .from('parent_student_links')
    .select('verified_at')
    .eq('parent_id', auth.userId)
    .eq('student_id', student.id)
    .maybeSingle()

  if (existing?.verified_at) {
    return c.json({
      alreadyLinked: true,
      studentName: student.name || rawEmail,
    }, 200)
  }

  // Generate a fresh code (regen path: overwrites any previous pending code).
  const code = await generateLinkCode()

  const { error: upsertErr } = await supabase
    .from('parent_student_links')
    .upsert({
      parent_id: auth.userId,
      student_id: student.id,
      link_code: code,
      verified_at: null,
    }, { onConflict: 'parent_id,student_id' })

  if (upsertErr) {
    console.error('[parent/link] upsert failed:', upsertErr)
    return c.json({ error: 'Could not create link' }, 500)
  }

  return c.json({
    linkCode: code,
    studentName: student.name || rawEmail,
  })
})

// ─── POST /api/parent/verify ─────────────────────────────────────────────
// body: { linkCode: string }
// Student-side: looks up a pending row addressed to this student that has
// the given link_code, sets verified_at, clears the code (no stale codes
// hanging around in the DB).
parent.post('/verify', async (c) => {
  const auth = await requireRole(c.req.header('Authorization'), ['student'])
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  // 30/hr/student. Realistically a student types a code 1–3 times in their
  // life; this is purely an abuse fuse against brute-forcing the 8-char
  // alphabet (32^8 ≈ 1 trillion — already astronomically high).
  const limited = checkRateLimit(c, `parent-verify:${auth.userId}`, 30, 60 * 60_000)
  if (limited) return limited

  const body = await c.req.json().catch(() => ({}))
  // Strip whitespace + uppercase. The alphabet is uppercase-only.
  const code = (body.linkCode || '').toString().replace(/\s+/g, '').toUpperCase()
  if (code.length !== 8) {
    return c.json({ error: 'Link code must be 8 characters' }, 400)
  }

  // Find a pending row for this student with this code.
  const { data: link } = await supabase
    .from('parent_student_links')
    .select('parent_id')
    .eq('student_id', auth.userId)
    .eq('link_code', code)
    .is('verified_at', null)
    .maybeSingle()

  if (!link) {
    return c.json({
      error: 'That code didn’t match. Ask the person who shared it to send it again.',
    }, 404)
  }

  // Set verified_at, clear code.
  const { error: updateErr } = await supabase
    .from('parent_student_links')
    .update({ verified_at: new Date().toISOString(), link_code: null })
    .eq('parent_id', link.parent_id)
    .eq('student_id', auth.userId)

  if (updateErr) {
    console.error('[parent/verify] update failed:', updateErr)
    return c.json({ error: 'Could not confirm link' }, 500)
  }

  // Hydrate the parent's name for the success toast.
  const { data: parentRow } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', link.parent_id)
    .single()

  return c.json({ parentName: parentRow?.name || null })
})

// ─── GET /api/parent/children ────────────────────────────────────────────
// Returns every VERIFIED child for this parent, with the stat bundle the
// dashboard needs. Excludes pending links by design — a parent shouldn't
// see a child until that child has confirmed.
parent.get('/children', async (c) => {
  const auth = await requireRole(c.req.header('Authorization'), ['parent'])
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  // Step 1: get verified student IDs.
  const { data: links } = await supabase
    .from('parent_student_links')
    .select('student_id, verified_at')
    .eq('parent_id', auth.userId)
    .not('verified_at', 'is', null)

  const studentIds = (links || []).map((l: any) => l.student_id)
  if (studentIds.length === 0) {
    return c.json({ children: [] })
  }

  // Step 2: parallel fetches for each child's stats.
  // We could RPC this, but parents typically have 1–3 children — N+1 is fine
  // and the code stays readable.
  const children = await Promise.all(studentIds.map(async (sid: string) => {
    const [profileRes, xpRes, streakRes, masteryRes, lastActiveRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, name, class_level, board')
        .eq('id', sid).single(),
      supabase.from('student_xp')
        .select('amount')
        .eq('student_id', sid),
      supabase.from('student_streaks')
        .select('current_streak, longest_streak')
        .eq('student_id', sid).single(),
      supabase.from('subject_mastery')
        .select('subject_code, mastery_score')
        .eq('student_id', sid),
      // "Last active" = most recent doubt OR practice OR test. Doubts is the
      // most-frequent activity for engaged students; one query covers the 95%.
      // Edge case (kid only takes tests): handled by Math.max() across all 3.
      supabase.from('doubt_sessions')
        .select('created_at')
        .eq('student_id', sid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const profile = profileRes.data
    const totalXP = (xpRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
    const masteryRows = masteryRes.data || []
    const weakest = masteryRows.length
      ? masteryRows.reduce((min: any, r: any) =>
          (min === null || r.mastery_score < min.mastery_score) ? r : min, null as any)
      : null

    return {
      studentId: sid,
      name: profile?.name || null,
      classLevel: profile?.class_level || null,
      board: profile?.board || null,
      totalXP,
      streak: streakRes.data?.current_streak || 0,
      longestStreak: streakRes.data?.longest_streak || 0,
      weakestSubject: weakest ? {
        code: weakest.subject_code,
        masteryPct: Math.round((weakest.mastery_score || 0)),
      } : null,
      lastActiveAt: lastActiveRes.data?.created_at || null,
      // Concept-level mastery summary — counts only, no concept names exposed
      // (avoids leaking per-concept performance until v5.1 review).
      masterySummary: {
        subjects: masteryRows.length,
        avgPct: masteryRows.length
          ? Math.round(masteryRows.reduce((s: number, r: any) =>
              s + (r.mastery_score || 0), 0) / masteryRows.length)
          : null,
      },
    }
  }))

  return c.json({ children })
})

// ─── GET /api/parent/pending-incoming ────────────────────────────────────
// Student-side helper for PendingLinkBanner. Returns ALL unverified rows
// where the caller is the student (a kid could in theory receive multiple
// pending links — e.g. mum first, then dad). The home banner shows the
// most recent one.
parent.get('/pending-incoming', async (c) => {
  const auth = await requireAuth(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  // Only students can have incoming parent links. Other roles → empty list
  // (defensive — frontend won't call this for non-students anyway).
  if (auth.profile.role !== 'student') {
    return c.json({ pending: [] })
  }

  const { data: rows } = await supabase
    .from('parent_student_links')
    .select('parent_id, created_at')
    .eq('student_id', auth.userId)
    .is('verified_at', null)
    .order('created_at', { ascending: false })

  if (!rows || rows.length === 0) {
    return c.json({ pending: [] })
  }

  // Resolve parent display names. One IN-query covers all parents.
  const parentIds = rows.map((r: any) => r.parent_id)
  const { data: parentProfiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', parentIds)
  const nameById: Record<string, string | null> = {}
  for (const p of parentProfiles || []) nameById[p.id] = p.name

  return c.json({
    pending: rows.map((r: any) => ({
      parentId: r.parent_id,
      parentName: nameById[r.parent_id] || null,
      createdAt: r.created_at,
    })),
  })
})

export default parent
