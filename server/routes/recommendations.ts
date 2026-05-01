import { Hono } from 'hono'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { recomputeForStudent, recomputeAll } from '../cron/recompute-recommendations.js'
import { ADMIN_PASSWORD } from '../lib/adminAuth.js'

const recommendations = new Hono()

// ═══ GET /api/recommendations/today ═══
// Student-facing: returns pre-computed recommendation + supporting cards.
recommendations.get('/today', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { data } = await supabase
    .from('student_recommendations')
    .select('*')
    .eq('student_id', u.id)
    .maybeSingle()

  // If none exists, or expired, trigger a fresh compute
  const expired = !data || (data.expires_at && new Date(data.expires_at) < new Date())
  if (!data || expired) {
    try {
      await recomputeForStudent(u.id)
      const { data: fresh } = await supabase
        .from('student_recommendations').select('*').eq('student_id', u.id).maybeSingle()
      return c.json(fresh || { hero_type: 'none', supporting_cards: [] })
    } catch {
      return c.json({ hero_type: 'none', supporting_cards: [] })
    }
  }

  return c.json(data)
})

// ═══ POST /api/recommendations/acted-on ═══
recommendations.post('/acted-on', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  await supabase.from('student_recommendations')
    .update({ acted_on: true, acted_on_at: new Date().toISOString() })
    .eq('student_id', u.id)
  return c.json({ ok: true })
})

// ═══ POST /api/recommendations/recompute ═══ (admin trigger)
// Runs the full nightly job on demand. Can be called from admin panel.
//
// Response: 202 Accepted, returns IMMEDIATELY. The job runs in the
// background — progress visible in the LLM Audit panel and server logs.
//
// Why async: at school scale (200+ students × ~2s LLM hero copy each + 20+
// concepts × class-health aggregation) the job can take several minutes.
// Reverse proxies kill the connection at 30-60s and the admin's browser
// shows an unhelpful timeout. Returning 202 immediately is friendlier and
// matches the real shape of the work.
//
// Caller still gets the started/in-progress signal. If a status endpoint
// is added later it can read from a recompute_jobs table (Phase 2).
recommendations.post('/recompute', async (c) => {
  const pwd = c.req.header('X-Admin-Password')
  if (pwd !== ADMIN_PASSWORD) {
    // Also allow admin role via token
    const u = await getUserFromToken(c.req.header('Authorization'))
    if (!u) return c.json({ error: 'Unauthorized' }, 401)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', u.id).single()
    if (profile?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  }

  // Fire-and-track. The recomputeAll() promise is intentionally not awaited.
  const startedAt = new Date().toISOString()
  recomputeAll()
    .then(result => {
      const ms = Date.now() - new Date(startedAt).getTime()
      console.log(`[recompute] complete in ${ms}ms:`, result)
    })
    .catch(err => {
      console.error('[recompute] background job failed:', err)
    })

  return c.json({ ok: true, status: 'started', startedAt }, 202)
})

export default recommendations
