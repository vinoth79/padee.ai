import { useUser } from '../context/UserContext'

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖', 'Social Science': '🌍',
}

const SUBJECT_COLORS = {
  Physics: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  Chemistry: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  Mathematics: { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  Biology: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  'Computer Science': { bg: '#ECFEFF', border: '#A5F3FC', text: '#0E7490' },
  English: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' },
}

export default function LearnScreen({ onNavigate }) {
  const user = useUser()
  const homeData = user.homeData
  const ncertContent = homeData?.ncertContent || []
  const subjectHealth = homeData?.subjectHealth || []
  const selectedSubjects = homeData?.selectedSubjects || user.selectedSubjects || []

  // Group NCERT content by subject
  const bySubject = {}
  for (const item of ncertContent) {
    if (!bySubject[item.subject]) bySubject[item.subject] = []
    bySubject[item.subject].push(item)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-8">
      <h1 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>Learn</h1>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Browse your NCERT content by subject</p>

      {selectedSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border text-center">
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Complete onboarding to see your subjects.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedSubjects.map(subject => {
            const colors = SUBJECT_COLORS[subject] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' }
            const chapters = bySubject[subject] || []
            const mastery = subjectHealth.find(s => s.subject === subject)
            const icon = SUBJECT_ICONS[subject] || '📖'

            return (
              <div key={subject} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {/* Subject header */}
                <div className="p-4 flex items-center gap-3" style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold" style={{ color: colors.text }}>{subject}</h2>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {chapters.length > 0
                        ? `${chapters.length} chapter${chapters.length > 1 ? 's' : ''} · ${chapters.reduce((s, c) => s + c.chunk_count, 0)} passages indexed`
                        : 'No NCERT content uploaded yet'}
                      {mastery?.accuracy !== null && mastery?.accuracy !== undefined
                        ? ` · ${mastery.accuracy}% mastery`
                        : ''}
                    </p>
                  </div>
                  <button onClick={() => onNavigate('ask-ai', { subject })}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
                    style={{ background: colors.text }}>
                    Ask AI
                  </button>
                </div>

                {/* Chapters list */}
                {chapters.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                    {chapters.map((ch, i) => (
                      <button key={i} onClick={() => onNavigate('ask-ai', { subject })}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: colors.bg, color: colors.text }}>
                          {ch.chapter_number || (i + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                            {ch.chapter_name || `Chapter ${ch.chapter_number || i + 1}`}
                          </p>
                          <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{ch.chunk_count} passages</p>
                        </div>
                        <span style={{ color: '#9CA3AF' }}>›</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>No NCERT content uploaded for {subject} yet.</p>
                    <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>Ask your admin to upload the {subject} textbook.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
