import { motion } from 'framer-motion'
import { teacherAIAlerts, teacherRecentCreations } from '../../data/mockData'
import { AlertTriangle, TrendingDown, CheckCircle, Flame, FileText, ClipboardList } from 'lucide-react'

const SEVERITY_STYLES: Record<string, { border: string; iconColor: string; actionBg: string; actionText: string }> = {
  high:   { border: '#DC2626', iconColor: '#DC2626', actionBg: '#FEF2F2', actionText: '#DC2626' },
  medium: { border: '#D97706', iconColor: '#D97706', actionBg: '#FFFBEB', actionText: '#92400E' },
  low:    { border: '#059669', iconColor: '#059669', actionBg: '#ECFDF5', actionText: '#065F46' },
}

const SEVERITY_ICONS: Record<string, any> = {
  struggle:   AlertTriangle,
  decline:    TrendingDown,
  completion: CheckCircle,
  streak:     Flame,
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

interface Props {
  onNavigate: (screen: string) => void
}

export default function TeacherAlertFeed({ onNavigate }: Props) {
  return (
    <div className="space-y-6">
      {/* AI Alert Feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#CCFBF1' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#0D9488' }} />
          </div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9CA3AF' }}>What AI noticed today</h2>
        </div>

        <motion.div className="space-y-2" variants={stagger} initial="hidden" animate="visible">
          {teacherAIAlerts.map(alert => {
            const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low
            const IconComp = SEVERITY_ICONS[alert.type] || AlertTriangle
            return (
              <motion.div key={alert.id} variants={fadeUp}
                className="bg-white rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ border: '0.5px solid #E5E7EB', borderLeft: `3px solid ${styles.border}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${styles.border}10` }}>
                  <IconComp size={14} color={styles.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#F0FDFA', color: '#0F766E' }}>AI noticed</span>
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{alert.time}</span>
                  </div>
                  <p className="text-[14px] font-medium leading-snug" style={{ color: '#111827' }}>{alert.message}</p>
                </div>
                <button onClick={() => onNavigate(alert.actionScreen)}
                  className="text-[13px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 active:scale-95 transition-transform whitespace-nowrap"
                  style={{ background: styles.actionBg, color: styles.actionText }}>
                  {alert.action} →
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: '#9CA3AF' }}>Recent activity</h2>
        <div className="bg-white rounded-xl" style={{ border: '0.5px solid #E5E7EB' }}>
          {teacherRecentCreations.map((item, i) => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3"
              style={i < teacherRecentCreations.length - 1 ? { borderBottom: '0.5px solid #F3F4F6' } : {}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: item.type === 'worksheet' ? '#F0FDFA' : '#EFF6FF' }}>
                {item.type === 'worksheet'
                  ? <FileText size={14} color="#0D9488" />
                  : <ClipboardList size={14} color="#2563EB" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate" style={{ color: '#111827' }}>{item.title}</p>
                <p className="text-[12px]" style={{ color: '#6B7280' }}>{item.class} · {item.chapter} · {item.questions} questions</p>
              </div>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
