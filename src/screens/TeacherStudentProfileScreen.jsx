// ═══════════════════════════════════════════════════════════════════════════
// TeacherStudentProfileScreen — drill-down into one student's learning state.
// ═══════════════════════════════════════════════════════════════════════════
// Entry points:
//   1. Amber alert one-tap ("Priya hasn't studied in 5 days") → directly here
//   2. /teacher/students list → click a row → here
//
// Surfaces:
//   - Header: name, class, track, streak, level, XP
//   - Stat row: doubts / practice sessions / tests taken / avg score / active days
//   - Activity sparkline (last 30 days)
//   - Subject mastery bars
//   - Top weak concepts (score < 0.5 + attempts >= 3, per PRD 8C)
//   - Doubt history (expandable)
//   - Recent test & practice results
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStudentProfile } from '../services/api'

export default function TeacherStudentProfileScreen({ onNavigate }) {
  const { id } = useParams()
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedDoubt, setExpandedDoubt] = useState(null)

  useEffect(() => {
    if (!token || !id) return
    setLoading(true)
    getStudentProfile(token, id).then(res => {
      setLoading(false)
      if (res.error) { setError(res.error); return }
      setData(res)
    })
  }, [token, id])

  if (loading) return <div className="p-8 text-center text-[13px]" style={{ color: '#6B7280' }}>Loading student profile…</div>
  if (error) return <div className="m-6 p-4 rounded-lg text-[13px]" style={{ background: '#FEF2F2', color: '#991B1B' }}>⚠ {error}</div>
  if (!data) return null

  const { student, streak, xp, subject_mastery, weak_concepts, doubts, practice, tests, stats, activity_30d } = data
  const lastActive = streak.last_active_date
  const daysSinceActive = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : null

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
      {/* Back link */}
      <button onClick={() => onNavigate?.('students')}
        className="text-[13px] mb-4 flex items-center gap-1 hover:underline"
        style={{ color: '#0F766E' }}>
        ← Back to students
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border p-4 lg:p-6 mb-5" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-bold flex-shrink-0"
            style={{ background: '#CCFBF1', color: '#0F766E' }}>
            {(student.name || 'S').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold" style={{ color: '#111827' }}>
              {student.name || <span style={{ color: '#9CA3AF' }}>(no name)</span>}
            </h1>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>
              {student.email} · Class {student.class_level}
              {student.active_track && ` · ${student.active_track}`}
            </p>
            {daysSinceActive != null && (
              <p className="text-[11px] mt-1"
                style={{ color: daysSinceActive > 4 ? '#DC2626' : daysSinceActive > 1 ? '#D97706' : '#0F766E' }}>
                {daysSinceActive === 0 ? '● Active today'
                  : daysSinceActive === 1 ? 'Active yesterday'
                  : `Last active ${daysSinceActive} days ago`}
              </p>
            )}
          </div>

          {/* Right-side mini-stats */}
          <div className="flex gap-4 text-center flex-wrap">
            <MiniStat label="Streak" value={streak.current_streak} suffix="🔥" />
            <MiniStat label="Level" value={xp.current_level} />
            <MiniStat label="XP" value={xp.total_xp} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Doubts asked" value={stats.total_doubts} color="#0D9488" />
        <StatCard label="Practice sessions" value={stats.total_practice} color="#7C3AED" />
        <StatCard label="Tests completed" value={stats.total_tests} color="#2563EB" />
        <StatCard label="Avg test score" value={stats.avg_test_pct != null ? `${stats.avg_test_pct}%` : '—'} color="#059669" />
        <StatCard label="Active days / 30" value={stats.active_days_30} color="#D97706" />
      </div>

      {/* Activity sparkline */}
      {activity_30d.length > 0 && (
        <Section title="Activity — last 30 days">
          <ActivitySparkline data={activity_30d} />
        </Section>
      )}

      {/* Subject mastery */}
      {subject_mastery.length > 0 && (
        <Section title="Subject mastery">
          <div className="space-y-2">
            {subject_mastery.map(s => (
              <div key={s.subject}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-medium" style={{ color: '#111827' }}>{s.subject}</span>
                  <span style={{ color: '#6B7280' }}>{s.accuracy_percent}% · {s.total_questions} Qs</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${s.accuracy_percent}%`,
                    background: s.accuracy_percent >= 70 ? '#059669' : s.accuracy_percent >= 50 ? '#D97706' : '#DC2626',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Weak concepts (critical gaps per PRD 8C) */}
      {weak_concepts.length > 0 && (
        <Section title={`Weak concepts (${weak_concepts.length})`}
          subtitle="Composite score < 0.5 with at least 3 attempts. Prioritise these in class intervention.">
          <div className="space-y-2">
            {weak_concepts.map(c => (
              <div key={c.concept_slug} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold" style={{ color: '#92400E' }}>
                    {c.concept?.concept_name || c.concept_slug}
                  </p>
                  <p className="text-[11px]" style={{ color: '#78350F' }}>
                    {c.concept?.subject} · {c.concept?.chapter_name}
                    {c.concept?.exam_weight_percent != null && ` · ${c.concept.exam_weight_percent}% exam weight`}
                  </p>
                  <div className="flex gap-3 mt-1 text-[11px]" style={{ color: '#78350F' }}>
                    <span>Score: <b>{Math.round(c.composite_score * 100)}%</b></span>
                    <span>Attempts: <b>{c.attempt_count}</b></span>
                    <span>Accuracy: <b>{Math.round((c.accuracy || 0) * 100)}%</b></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent tests */}
      {tests.filter(t => t.completed).length > 0 && (
        <Section title="Recent test results">
          <div className="space-y-1">
            {tests.filter(t => t.completed).slice(0, 8).map(t => {
              const pct = t.score != null && t.total_marks ? Math.round((t.score / t.total_marks) * 100) : null
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded" style={{ background: '#F9FAFB' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: '#111827' }}>{t.title}</p>
                    <p className="text-[11px]" style={{ color: '#6B7280' }}>
                      {t.subject} · {new Date(t.completed_at || t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {pct != null && (
                    <span className="text-[13px] font-semibold px-2.5 py-1 rounded"
                      style={{
                        background: pct >= 70 ? '#ECFDF5' : pct >= 50 ? '#FEF3C7' : '#FEE2E2',
                        color: pct >= 70 ? '#065F46' : pct >= 50 ? '#92400E' : '#991B1B',
                      }}>
                      {pct}% ({t.score}/{t.total_marks})
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Recent practice */}
      {practice.filter(p => p.completed).length > 0 && (
        <Section title="Recent practice">
          <div className="space-y-1">
            {practice.filter(p => p.completed).slice(0, 8).map(p => {
              const pct = p.total_questions ? Math.round((p.correct_count / p.total_questions) * 100) : null
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded" style={{ background: '#F9FAFB' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: '#111827' }}>
                      {p.subject}{p.chapter ? ` · ${p.chapter}` : ''}
                    </p>
                    <p className="text-[11px]" style={{ color: '#6B7280' }}>
                      {p.difficulty} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: '#6B7280' }}>
                    {p.correct_count}/{p.total_questions}{pct != null && ` (${pct}%)`}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Doubt history (expandable) */}
      {doubts.length > 0 && (
        <Section title={`Doubt history (last ${doubts.length})`}>
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {doubts.slice(0, 15).map(d => (
              <li key={d.id} className="py-2">
                <button onClick={() => setExpandedDoubt(expandedDoubt === d.id ? null : d.id)}
                  className="w-full text-left group">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                      style={{ background: '#ECFDF5', color: '#065F46' }}>
                      {d.subject}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] group-hover:underline" style={{ color: '#111827' }}>
                        {d.question_text}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                        {new Date(d.created_at).toLocaleString()}
                        {d.cache_hit && ' · ⚡ cached'}
                        {d.ncert_source && ` · 📚 ${d.ncert_source}`}
                      </p>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                      {expandedDoubt === d.id ? '▾' : '▸'}
                    </span>
                  </div>
                </button>
                {expandedDoubt === d.id && d.ai_response && (
                  <div className="mt-2 ml-14 p-3 rounded-lg text-[12px] whitespace-pre-wrap"
                    style={{ background: '#F9FAFB', color: '#374151' }}>
                    {d.ai_response}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Empty state */}
      {doubts.length === 0 && practice.length === 0 && tests.length === 0 && (
        <div className="text-center py-12 rounded-xl border" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          <p className="text-[14px] font-semibold" style={{ color: '#111827' }}>No activity yet</p>
          <p className="text-[12px] mt-1" style={{ color: '#6B7280' }}>
            This student hasn't asked a doubt, completed practice, or taken a test yet.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Small reusable bits ───

function MiniStat({ label, value, suffix }) {
  return (
    <div>
      <p className="text-[18px] font-bold leading-tight" style={{ color: '#111827' }}>
        {value}{suffix && <span className="ml-0.5 text-[14px]">{suffix}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: '#6B7280' }}>{label}</p>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg border p-3" style={{ borderColor: '#E5E7EB' }}>
      <p className="text-[20px] font-bold leading-tight" style={{ color: color || '#111827' }}>{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>{label}</p>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="mb-5 bg-white rounded-xl border p-4 lg:p-5" style={{ borderColor: '#E5E7EB' }}>
      <h2 className="text-[14px] font-bold" style={{ color: '#111827' }}>{title}</h2>
      {subtitle && <p className="text-[12px] mb-3" style={{ color: '#6B7280' }}>{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}

// Minimal SVG sparkline. Good enough at 200px wide.
function ActivitySparkline({ data }) {
  const W = 600, H = 60, PAD = 4
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count))
  const dx = (W - PAD * 2) / Math.max(1, data.length - 1)
  const path = data.map((d, i) => {
    const x = PAD + i * dx
    const y = H - PAD - (d.count / Math.max(1, max)) * (H - PAD * 2)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 60 }}>
        <path d={path} fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = PAD + i * dx
          const y = H - PAD - (d.count / Math.max(1, max)) * (H - PAD * 2)
          return <circle key={i} cx={x} cy={y} r={2.5} fill="#0D9488" />
        })}
      </svg>
      <div className="flex justify-between text-[10px] mt-1" style={{ color: '#9CA3AF' }}>
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
