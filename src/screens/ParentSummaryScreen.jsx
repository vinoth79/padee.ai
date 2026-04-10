import { parentSummaryData } from '../data/mockData'
import ProgressBar from '../components/ui/ProgressBar'
import ScoreRing from '../components/ui/ScoreRing'

export default function ParentSummaryScreen({ onNavigate }) {
  const data = parentSummaryData

  return (
    <div className="pb-10 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-4 pt-12 pb-8">
        <button onClick={() => onNavigate('home')} className="text-white/70 mb-4 block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex items-center gap-1 mb-1">
          <span className="text-teal-300 text-xs font-bold uppercase tracking-wider">Weekly Summary</span>
          <span className="text-teal-300/60 text-xs ml-1">· {data.week}</span>
        </div>
        <h1 className="text-white font-black text-2xl">{data.student}</h1>
        <p className="text-teal-200 text-sm">{data.class} · AI Tutor Weekly Report</p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 bg-white/10 rounded-2xl p-3 mt-4">
          {[
            { value: data.summary.activeDays, label: 'Active Days', icon: '📅' },
            { value: `${data.summary.avgScore}%`, label: 'Avg Score', icon: '📊' },
            { value: `${data.summary.streakDays}d`, label: 'Streak', icon: '🔥' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-white font-black text-xl">{s.value}</div>
              <div className="text-white/60 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Activity summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3">This Week's Activity</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '💬', value: data.summary.doubtsAsked, label: 'Doubts solved', color: 'bg-purple-50 text-purple-600' },
              { icon: '⚡', value: data.summary.practiceQuestions, label: 'Practice questions', color: 'bg-blue-50 text-blue-600' },
              { icon: '📋', value: data.summary.testsCompleted, label: 'Tests completed', color: 'bg-orange-50 text-orange-600' },
              { icon: '⚡', value: `+${data.summary.xpEarned}`, label: 'XP earned', color: 'bg-amber-50 text-amber-600' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${item.color.split(' ')[0]}`}>
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className={`font-black text-xl ${item.color.split(' ')[1]}`}>{item.value}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="font-black text-emerald-800 text-sm mb-3">🌟 Highlights</div>
          <div className="space-y-2">
            {data.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <p className="text-xs text-emerald-700 leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Concerns */}
        {data.concerns.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="font-black text-amber-800 text-sm mb-3">⚠️ Areas to Watch</div>
            <div className="space-y-2">
              {data.concerns.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <p className="text-xs text-amber-700 leading-relaxed">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teacher note */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">P</div>
            <div>
              <div className="text-xs font-bold text-gray-700">Ms. Priya Nair</div>
              <div className="text-[10px] text-gray-400">Class Teacher, Physics</div>
            </div>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed italic">"{data.teacherNote}"</p>
        </div>

        {/* Subject accuracy */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3">Subject Accuracy (30 days)</h2>
          {[
            { subject: 'Mathematics', accuracy: 85, icon: '📐', color: 'purple' },
            { subject: 'Computer Science', accuracy: 91, icon: '💻', color: 'cyan' },
            { subject: 'Physics', accuracy: 78, icon: '⚡', color: 'blue' },
            { subject: 'Biology', accuracy: 74, icon: '🌿', color: 'green' },
            { subject: 'Chemistry', accuracy: 62, icon: '🧪', color: 'orange' },
          ].map((sub, i) => (
            <div key={i} className="flex items-center gap-3 mb-2.5">
              <span className="text-base w-6 text-center">{sub.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-gray-700">{sub.subject}</span>
                  <span className={sub.accuracy >= 80 ? 'text-emerald-600' : sub.accuracy >= 70 ? 'text-blue-600' : 'text-orange-600'}>{sub.accuracy}%</span>
                </div>
                <ProgressBar value={sub.accuracy} max={100} color={sub.color} height="h-1.5" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => alert('Report shared!')}
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold py-3 rounded-2xl text-sm shadow-md active:scale-95"
        >
          📤 Share Report
        </button>
      </div>
    </div>
  )
}
