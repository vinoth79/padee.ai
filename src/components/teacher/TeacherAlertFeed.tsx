import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'

interface Alert {
  id: string
  alert_type: 'red' | 'amber' | 'green'
  concept_slug: string | null
  student_id: string | null
  title: string
  message: string
  action_label: string | null
  action_type: string | null
  action_payload: any
  generated_at: string
  expires_at: string
  acted_on_at: string | null
}

const STYLES = {
  red:   { border: '#DC2626', bg: '#FEF2F2',  iconColor: '#DC2626', actionBg: '#DC2626', actionText: '#FFFFFF', label: 'Class intervention', Icon: AlertTriangle },
  amber: { border: '#D97706', bg: '#FFFBEB',  iconColor: '#D97706', actionBg: '#D97706', actionText: '#FFFFFF', label: 'Individual risk',    Icon: TrendingDown },
  green: { border: '#059669', bg: '#ECFDF5',  iconColor: '#059669', actionBg: '#059669', actionText: '#FFFFFF', label: 'Readiness signal',    Icon: CheckCircle },
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try {
    const s = JSON.parse(localStorage.getItem(key) || '{}')
    return s?.access_token || s?.currentSession?.access_token || null
  } catch { return null }
}

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function TeacherAlertFeed({ onNavigate }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) { setLoading(false); return }
    try {
      const r = await fetch('/api/teacher/alerts', { headers: { Authorization: `Bearer ${token}` } })
      const data = await r.json()
      setAlerts(data.alerts || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function dismissAlert(id: string) {
    setBusy(id)
    const token = getToken()
    await fetch(`/api/teacher/alerts/${id}/dismiss`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    await load()
    setBusy(null)
  }

  async function actOnAlert(a: Alert) {
    setBusy(a.id)
    const token = getToken()
    await fetch(`/api/teacher/alerts/${a.id}/acted`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })

    // Execute action
    if (a.action_type === 'create_test' || a.action_type === 'generate_chapter_test') {
      // Pre-fill test assignment and navigate there
      const payload = a.action_payload || {}
      // Stash the pre-fill for TeacherAssignTestScreen to pick up
      sessionStorage.setItem('padee-prefill-test', JSON.stringify({
        title: payload.title,
        subject: payload.subject,
        classLevel: payload.classLevel,
        questionCount: payload.questionCount || 10,
        difficulty: payload.difficulty || 'medium',
      }))
      onNavigate('test-generator')
    } else if (a.action_type === 'view_student' && a.student_id) {
      onNavigate('student-profile', { studentId: a.student_id })
    }
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
            AI Alerts ({alerts.length})
          </h2>
          <button onClick={load} className="text-xs font-semibold hover:underline" style={{ color: '#0D9488' }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border p-6 text-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border p-6 text-center">
            <p className="text-sm mb-1" style={{ color: '#6B7280' }}>No active alerts.</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Alerts appear when class data triggers a threshold — try the "Recompute recommendations" button on the admin panel after students practise.
            </p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
            {alerts.map(alert => {
              const s = STYLES[alert.alert_type]
              const isActedOn = !!alert.acted_on_at
              return (
                <motion.div key={alert.id} variants={fadeUp}
                  className="bg-white rounded-2xl p-4 shadow-sm transition-all"
                  style={{ borderLeft: `4px solid ${s.border}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.bg }}>
                      <s.Icon size={18} color={s.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.iconColor }}>
                          {s.label}
                        </p>
                        {isActedOn && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                            Acted
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                        {alert.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
                        {alert.message}
                      </p>

                      <div className="flex gap-2 mt-3">
                        {alert.action_label && !isActedOn && (
                          <button onClick={() => actOnAlert(alert)}
                            disabled={busy === alert.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                            style={{ background: s.actionBg, color: s.actionText }}>
                            {busy === alert.id ? 'Working...' : alert.action_label}
                          </button>
                        )}
                        <button onClick={() => dismissAlert(alert.id)}
                          disabled={busy === alert.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: '#F3F4F6', color: '#6B7280' }}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
