// ═══════════════════════════════════════════════════════════════════════════
// TeacherDashboardScreen — "Command Centre". The teacher's morning open.
// ═══════════════════════════════════════════════════════════════════════════
// Pulls /api/teacher/dashboard (one parallelized call) for:
//   - Top stat strip (students, alerts, flagged, tests this week)
//   - Alert feed (red/amber/green — existing component)
//   - Class health by subject (aggregated from subject_mastery)
//   - Concept hotspots (aggregated from class_concept_health — nightly job)
//   - Recent student activity (doubts + practice + tests, merged timeline)
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { getTeacherDashboard } from '../services/api'
import TeacherAlertFeed from '../components/teacher/TeacherAlertFeed'
import TeacherRightPanel from '../components/teacher/TeacherRightPanel'

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function TeacherDashboardScreen({ onNavigate }) {
  const user = useUser()
  const { token } = useAuth()
  const firstName = (user.studentName || 'Teacher').split(' ')[0]

  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getTeacherDashboard(token).then(res => {
      if (cancelled) return
      setLoading(false)
      if (!res.error) setDash(res)
    })
    return () => { cancelled = true }
  }, [token])

  const stats = dash?.stats
  const summaryLine = stats
    ? `${stats.students} students · ${stats.alerts} active alerts · ${stats.flaggedPending} flagged · ${stats.testsThisWeek} tests this week`
    : 'AI is watching your class. Alerts appear below when intervention is needed.'

  return (
    <div className="pt-6 pb-10">
      {/* Header */}
      <div className="px-5 lg:px-6 mb-5">
        <h1 className="text-[22px] font-bold" style={{ color: '#111827' }}>
          {greet()}, {firstName} 👋
        </h1>
        <p className="text-[14px] mt-0.5" style={{ color: '#6B7280' }}>{summaryLine}</p>
      </div>

      {/* Top stats strip */}
      <div className="px-5 lg:px-6 mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Students in class"
            value={loading ? '—' : (stats?.students ?? 0)}
            sub={dash?.classLevel ? `Class ${dash.classLevel}` : ''}
            color="#0D9488"
            onClick={() => onNavigate?.('students')}
          />
          <StatCard
            label="Active alerts"
            value={loading ? '—' : (stats?.alerts ?? 0)}
            sub={stats?.alertsByType
              ? `${stats.alertsByType.red} red · ${stats.alertsByType.amber} amber · ${stats.alertsByType.green} green`
              : ''}
            color={stats?.alertsByType?.red ? '#DC2626' : '#0D9488'}
          />
          <StatCard
            label="Flagged for review"
            value={loading ? '—' : (stats?.flaggedPending ?? 0)}
            sub={stats?.flaggedPending ? 'needs your attention' : 'all caught up'}
            color={stats?.flaggedPending ? '#D97706' : '#059669'}
            onClick={() => onNavigate?.('teacher-review')}
          />
          <StatCard
            label="Tests this week"
            value={loading ? '—' : (stats?.testsThisWeek ?? 0)}
            sub="completed by students"
            color="#2563EB"
          />
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="px-5 lg:px-6">
        <div className="flex gap-5">
          <div className="flex-1 min-w-0 space-y-5">
            <TeacherAlertFeed onNavigate={onNavigate} />

            {/* Recent activity */}
            <RecentActivity items={dash?.recentActivity || []} loading={loading} onNavigate={onNavigate} />
          </div>

          {/* Right pane (desktop): real class health + hotspots + quick actions */}
          <div className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-6">
              <TeacherRightPanel
                onNavigate={onNavigate}
                classHealth={dash?.classHealth || []}
                hotspots={dash?.hotspots || []}
              />
            </div>
          </div>
        </div>

        {/* Mobile: right panel content stacked below */}
        <div className="lg:hidden mt-5">
          <TeacherRightPanel
            onNavigate={onNavigate}
            classHealth={dash?.classHealth || []}
            hotspots={dash?.hotspots || []}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={`bg-white rounded-xl border p-4 text-left ${onClick ? 'hover:shadow-card transition-shadow cursor-pointer' : ''}`}
      style={{ borderColor: '#E5E7EB' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
        {label}
      </p>
      <p className="text-[26px] font-bold leading-tight mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
    </Tag>
  )
}

function RecentActivity({ items, loading, onNavigate }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
        <p className="text-[13px]" style={{ color: '#6B7280' }}>Loading activity…</p>
      </div>
    )
  }
  if (!items.length) {
    return (
      <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
        <h2 className="text-[14px] font-bold mb-1" style={{ color: '#111827' }}>Recent activity</h2>
        <p className="text-[12px]" style={{ color: '#6B7280' }}>
          No student activity yet today. It'll show up here as they ask doubts, practice, or take tests.
        </p>
      </div>
    )
  }
  const icons = { doubt: '💬', practice: '⚡', test: '📝' }
  const labels = { doubt: 'asked', practice: 'practised', test: 'took test' }
  return (
    <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
      <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Recent student activity</h2>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={`${it.type}-${it.id}`}>
            <button onClick={() => it.student_id && onNavigate?.('student-profile', { studentId: it.student_id })}
              className="w-full text-left flex items-start gap-3 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
              <span className="text-[18px] flex-shrink-0">{icons[it.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px]" style={{ color: '#111827' }}>
                  <span className="font-semibold">{it.student_name || 'student'}</span>{' '}
                  <span style={{ color: '#6B7280' }}>{labels[it.type]} · {it.subject || 'general'}</span>
                </p>
                <p className="text-[11px] truncate" style={{ color: '#6B7280' }}>
                  {it.summary}
                  {it.score && <span className="font-medium ml-1" style={{ color: '#374151' }}>· {it.score}</span>}
                </p>
              </div>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>{timeAgo(it.timestamp)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
