// ═══════════════════════════════════════════════════════════════════════════
// /api/super-admin — Padee staff dashboard
// ═══════════════════════════════════════════════════════════════════════════
// Sprint 0: schema + auth plumbing only. Real metrics + drill-down land in
// Sprint 5 per PRD_v5.md sequencing.
//
// Promotion: a super_admin is created manually via SQL. There is intentionally
// NO endpoint that promotes a user to super_admin. To grant the role:
//
//   UPDATE profiles SET role = 'super_admin' WHERE email = 'you@padee.ai';
//
// Documented in DEPLOYMENT.md follow-ups.
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { requireSuperAdmin } from '../lib/schoolAuth.js'

const superAdmin = new Hono()

// ─── GET /api/super-admin/schools ────────────────────────────────────────
// Sprint 0 stub: returns the schools list with basic counts. Sprint 5
// extends with MAU, doubts/day, churn risk, LLM cost.
superAdmin.get('/schools', async (c) => {
  const auth = await requireSuperAdmin(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name, max_students, max_doubts_per_day, created_at')
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)

  // Per-school counts (single round-trip via aggregate would be faster; for
  // 12-school pilot scale this O(N) fan-out is fine).
  const enriched = await Promise.all((schools || []).map(async (s) => {
    const [studentsRes, teachersRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .eq('school_id', s.id).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .eq('school_id', s.id).eq('role', 'teacher'),
    ])
    return {
      id: s.id,
      name: s.name,
      students: studentsRes.count || 0,
      teachers: teachersRes.count || 0,
      maxStudents: s.max_students,
      maxDoubtsPerDay: s.max_doubts_per_day,
      createdAt: s.created_at,
    }
  }))

  return c.json({ schools: enriched })
})

// ─── GET /api/super-admin/metrics ────────────────────────────────────────
// Sprint 0 stub: platform-wide aggregates. Sprint 5 adds error rates from
// server logs, LLM cost from llm-calls.jsonl, and topReportedTopics.
superAdmin.get('/metrics', async (c) => {
  const auth = await requireSuperAdmin(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [schoolsRes, studentsRes, doubtsTotalRes, doubts7dRes] = await Promise.all([
    supabase.from('schools').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', 'student'),
    supabase.from('doubt_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('doubt_sessions').select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
  ])

  return c.json({
    platform: {
      totalSchools: schoolsRes.count || 0,
      totalStudents: studentsRes.count || 0,
      doubtsTotal: doubtsTotalRes.count || 0,
      doubts7d: doubts7dRes.count || 0,
    },
    // Sprint 5 fills these:
    financial: { totalLLMCost7d: null, costPerActiveUser: null },
    topErrors: [],
    topReportedTopics: [],
  })
})

// ─── GET /api/super-admin/school/:id ─────────────────────────────────────
// Sprint 0 stub: minimal school detail. Sprint 5 returns the same shape as
// /api/school/dashboard so the frontend can reuse <SchoolDashboardScreen>
// internals with a read-only banner overlay.
superAdmin.get('/school/:id', async (c) => {
  const auth = await requireSuperAdmin(c.req.header('Authorization'))
  if ('error' in auth) return c.json({ error: auth.error }, auth.status)

  const id = c.req.param('id')
  const { data: schoolRow, error } = await supabase
    .from('schools')
    .select('id, name, invite_code_student, invite_code_teacher, max_students, max_doubts_per_day, created_at')
    .eq('id', id).single()

  if (error || !schoolRow) return c.json({ error: 'School not found' }, 404)

  return c.json({ school: schoolRow })
})

export default superAdmin
