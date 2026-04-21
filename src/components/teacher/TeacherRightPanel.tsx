import { FileText, ClipboardList, FileStack, ShieldAlert, ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// TeacherRightPanel — sidebar content for the command centre dashboard.
// Takes class health + concept hotspots as props (from /api/teacher/dashboard).
// ═══════════════════════════════════════════════════════════════════════════

interface ClassHealthRow {
  subject: string
  accuracy: number
  studentsTracked: number
  struggling: number
}
interface HotspotRow {
  concept_slug: string
  class_avg_score: number | null
  total_students: number | null
  struggling_students: number | null
  concept?: {
    concept_name: string
    subject: string
    chapter_name: string | null
    exam_weight_percent: number | null
  } | null
}
interface Props {
  onNavigate: (screen: string, params?: any) => void
  classHealth: ClassHealthRow[]
  hotspots: HotspotRow[]
}

function healthBand(pct: number) {
  if (pct >= 70) return { label: 'On track', bg: '#ECFDF5', text: '#065F46', bar: '#059669' }
  if (pct >= 50) return { label: 'Improving', bg: '#FEF3C7', text: '#92400E', bar: '#D97706' }
  return { label: 'Needs work', bg: '#FEE2E2', text: '#991B1B', bar: '#DC2626' }
}

export default function TeacherRightPanel({ onNavigate, classHealth, hotspots }: Props) {
  return (
    <div className="space-y-4">

      {/* ═══ CONCEPT HOTSPOTS ═══ */}
      {hotspots.length > 0 && (
        <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: '#0F1729' }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#5EEAD4' }}>
              Concept hotspots
            </p>
            <p className="text-[13px] mb-3" style={{ color: '#94A3B8' }}>
              Topics where the class needs the most help
            </p>
            <ul className="space-y-2 mb-3">
              {hotspots.slice(0, 3).map(h => (
                <li key={h.concept_slug} className="rounded p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: '#F1F5F9' }}>
                    {h.concept?.concept_name || h.concept_slug}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#94A3B8' }}>
                    {h.concept?.subject}
                    {h.concept?.chapter_name && ` · ${h.concept.chapter_name}`}
                    {h.concept?.exam_weight_percent != null && ` · ${h.concept.exam_weight_percent}% exam weight`}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#FCA5A5' }}>
                    {h.struggling_students}/{h.total_students} struggling · class avg {Math.round((h.class_avg_score || 0) * 100)}%
                  </p>
                </li>
              ))}
            </ul>
            <button onClick={() => onNavigate('worksheet')}
              className="w-full text-[13px] font-semibold py-2 rounded-lg active:scale-95 transition-transform"
              style={{ background: '#0D9488', color: '#F0FDFA' }}>
              Create remedial worksheet →
            </button>
          </div>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#9CA3AF' }}>
          Quick actions
        </h3>
        <div className="space-y-1.5">
          {[
            { icon: FileText, label: 'New worksheet', desc: 'Free-text brief → quality-checked paper', screen: 'worksheet', iconBg: '#ECFDF5', iconColor: '#0D9488' },
            { icon: FileStack, label: 'Mimic a paper', desc: 'Upload past paper, get a fresh one', screen: 'paper-mimic', iconBg: '#E0E7FF', iconColor: '#3730A3' },
            { icon: ClipboardList, label: 'Assign a test', desc: 'Pre-filled from AI recommendation', screen: 'test-generator', iconBg: '#EFF6FF', iconColor: '#2563EB' },
            { icon: ShieldAlert, label: 'Review queue', desc: 'Triage flagged AI responses', screen: 'teacher-review', iconBg: '#FEF3C7', iconColor: '#D97706' },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.screen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg transition-all hover:shadow-card active:scale-[0.98]"
              style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: a.iconBg }}>
                <a.icon size={16} style={{ color: a.iconColor }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold" style={{ color: '#111827' }}>{a.label}</p>
                <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>{a.desc}</p>
              </div>
              <ArrowRight size={14} style={{ color: '#9CA3AF' }} />
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CLASS HEALTH ═══ */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#9CA3AF' }}>
          Class health
        </h3>
        {classHealth.length === 0 ? (
          <div className="bg-white rounded-lg p-3 text-[12px]" style={{ border: '0.5px solid #E5E7EB', color: '#6B7280' }}>
            No student activity yet to compute health. Once students start practising or taking tests, subject-level accuracy appears here.
          </div>
        ) : (
          <div className="space-y-1.5">
            {classHealth.map(s => {
              const band = healthBand(s.accuracy)
              return (
                <div key={s.subject} className="bg-white rounded-lg px-3 py-2" style={{ border: '0.5px solid #E5E7EB' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[13px] font-semibold" style={{ color: '#111827' }}>{s.subject}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: band.bg, color: band.text }}>
                      {band.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, background: band.bar }} />
                    </div>
                    <span className="text-[11px] font-semibold w-9 text-right" style={{ color: '#374151' }}>
                      {s.accuracy}%
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                    {s.studentsTracked} tracked{s.struggling > 0 && ` · ${s.struggling} struggling`}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
