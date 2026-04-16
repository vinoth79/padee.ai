import { Hono } from 'hono'
import { supabase, getUserFromToken } from '../lib/supabase.js'

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

export default teacher
