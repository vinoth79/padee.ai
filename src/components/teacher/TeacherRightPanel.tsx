import { spotlightStudents } from '../../data/mockData'
import { FileText, ClipboardList, Radio, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const CLASS_HEALTH = [
  { subject: 'Physics', accuracy: 68, struggling: 3, trend: 'down', status: 'Needs work', color: '#2563EB' },
  { subject: 'Chemistry', accuracy: 74, struggling: 2, trend: 'up', status: 'Improving', color: '#EA580C' },
  { subject: 'Mathematics', accuracy: 82, struggling: 0, trend: 'up', status: 'On track', color: '#7C3AED' },
  { subject: 'Biology', accuracy: 71, struggling: 1, trend: 'stable', status: 'Improving', color: '#059669' },
]

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'On track':      { bg: '#ECFDF5', text: '#065F46' },
  'Improving':     { bg: '#FEF3C7', text: '#92400E' },
  'Needs work':    { bg: '#FEF2F2', text: '#DC2626' },
}

interface Props {
  onNavigate: (screen: string) => void
}

export default function TeacherRightPanel({ onNavigate }: Props) {
  return (
    <div className="space-y-4">

      {/* ═══ AI-RECOMMENDED ACTION ═══ */}
      <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: '#0F1729' }}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#5EEAD4' }}>AI recommends</p>
          <p className="text-[14px] font-semibold mb-1" style={{ color: '#F1F5F9' }}>Generate remedial worksheet for Ohm's Law</p>
          <p className="text-[12px] mb-3" style={{ color: '#94A3B8' }}>8 students scored below 40%</p>
          <button onClick={() => onNavigate('worksheet')}
            className="w-full text-[13px] font-semibold py-2 rounded-lg active:scale-95 transition-transform" style={{ background: '#0D9488', color: '#F0FDFA' }}>
            Create worksheet →
          </button>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#9CA3AF' }}>Quick actions</h3>
        <div className="space-y-1.5">
          {[
            { icon: FileText, label: 'New worksheet', desc: 'AI-generated in 10s', screen: 'worksheet', iconBg: '#ECFDF5', iconColor: '#0D9488' },
            { icon: ClipboardList, label: 'New test paper', desc: 'Full CBSE pattern', screen: 'test-generator', iconBg: '#EFF6FF', iconColor: '#2563EB' },
            { icon: Radio, label: 'Start live class', desc: 'Real-time doubt handler', screen: 'live-class', iconBg: '#FFF7ED', iconColor: '#EA580C' },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.screen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg transition-all hover:shadow-card active:scale-[0.98]"
              style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: a.iconBg }}>
                <a.icon size={14} color={a.iconColor} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-semibold" style={{ color: '#111827' }}>{a.label}</p>
                <p className="text-[12px]" style={{ color: '#6B7280' }}>{a.desc}</p>
              </div>
              <ArrowRight size={12} color="#9CA3AF" />
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CLASS HEALTH ═══ */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#9CA3AF' }}>Class health</h3>
        <div className="bg-white rounded-xl p-3" style={{ border: '0.5px solid #E5E7EB' }}>
          {/* AI summary */}
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-3" style={{ background: '#F0FDFA', border: '0.5px solid #99F6E4' }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#CCFBF1' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0D9488' }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: '#0F766E' }}>
              72% avg · 5 need intervention · Weakest: Ohm's Law
            </p>
          </div>

          <div className="space-y-2">
            {CLASS_HEALTH.map(s => {
              const statusStyle = STATUS_STYLES[s.status] || STATUS_STYLES['Improving']
              return (
                <div key={s.subject} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-medium" style={{ color: '#111827' }}>{s.subject}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold font-mono" style={{ color: '#111827' }}>{s.accuracy}%</span>
                        {s.trend === 'up' && <TrendingUp size={10} color="#059669" />}
                        {s.trend === 'down' && <TrendingDown size={10} color="#DC2626" />}
                        {s.trend === 'stable' && <Minus size={10} color="#6B7280" />}
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-full" style={{ background: s.color, width: `${s.accuracy}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                    {s.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ STUDENT SPOTLIGHT ═══ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#9CA3AF' }}>Need attention</h3>
          <button onClick={() => onNavigate('students')} className="text-[10px] font-semibold" style={{ color: '#0D9488' }}>View all →</button>
        </div>
        <div className="space-y-1.5">
          {spotlightStudents.map((s, i) => (
            <div key={i} className="bg-white rounded-lg px-3 py-2.5 flex items-center gap-2.5" style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={s.color === 'red'
                  ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }
                  : { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }
                }>
                {s.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-semibold" style={{ color: '#111827' }}>{s.name}</p>
                  <span className="text-[8px] font-semibold px-1 py-0.5 rounded"
                    style={s.color === 'red'
                      ? { background: '#FEF2F2', color: '#DC2626' }
                      : { background: '#FEF3C7', color: '#92400E' }
                    }>{s.status}</span>
                </div>
                <p className="text-[12px] truncate" style={{ color: '#6B7280' }}>{s.insight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
