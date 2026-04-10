import { useState } from 'react'
import { physicsChapters, mathChapters, subjects } from '../data/mockData'
import ProgressBar from '../components/ui/ProgressBar'
import MasteryChip from '../components/ui/MasteryChip'

const chaptersBySubject = {
  Physics: physicsChapters,
  Mathematics: mathChapters,
  Chemistry: physicsChapters.map((c, i) => ({
    ...c, id: `cch${i}`, name: ['Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Periodic Classification'][i] || c.name,
    progress: [100, 75, 40, 0][i] ?? c.progress,
    status: ['completed', 'in-progress', 'in-progress', 'not-started'][i] ?? c.status,
  })),
}

export default function ChapterViewScreen({ subject: initialSubject, onNavigate }) {
  const [activeSubject, setActiveSubject] = useState(initialSubject?.name || 'Physics')
  const [expandedChapter, setExpandedChapter] = useState(null)

  const sub = subjects.find(s => s.name === activeSubject) || subjects[0]
  const chapters = chaptersBySubject[activeSubject] || physicsChapters

  const statusIcon = (status) => {
    if (status === 'completed') return <span className="text-emerald-500 text-lg">✅</span>
    if (status === 'in-progress') return <span className="text-blue-500 text-lg">🔵</span>
    return <span className="text-gray-300 text-lg">⬜</span>
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Subject Header */}
      <div className={`px-4 pt-12 pb-6 bg-gradient-to-br ${
        activeSubject === 'Physics' ? 'from-blue-600 to-blue-800' :
        activeSubject === 'Mathematics' ? 'from-purple-600 to-purple-800' :
        activeSubject === 'Chemistry' ? 'from-orange-500 to-orange-700' :
        activeSubject === 'Biology' ? 'from-green-600 to-green-800' :
        'from-cyan-600 to-cyan-800'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate('home')} className="text-white/70 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <h1 className="text-white font-black text-xl">{activeSubject}</h1>
          <div className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">Class 10</div>
        </div>

        {/* Subject picker */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                activeSubject === s.name
                  ? 'bg-white text-gray-800 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Progress summary */}
        <div className="mt-4 bg-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-base">{sub.completed}/{sub.chapters} chapters</div>
            <div className="text-white/70 text-xs">completed</div>
          </div>
          <div className="w-32">
            <ProgressBar value={sub.completed} max={sub.chapters} color="amber" height="h-2" />
            <div className="text-white/70 text-xs text-right mt-1">{Math.round((sub.completed / sub.chapters) * 100)}%</div>
          </div>
        </div>
      </div>

      {/* AI Suggestion */}
      <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-xl">🤖</span>
        <div className="flex-1">
          <div className="text-amber-800 text-sm font-bold">AI suggests</div>
          <div className="text-amber-700 text-xs mt-0.5">Review <strong>Series & Parallel Circuits</strong> — you got 3 wrong last time.</div>
        </div>
        <button
          onClick={() => onNavigate('practice')}
          className="text-xs font-bold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors"
        >
          Review →
        </button>
      </div>

      {/* Chapter list */}
      <div className="px-4 mt-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Chapters</h2>

        {chapters.map(chapter => (
          <div key={chapter.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Chapter header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id)}
            >
              {statusIcon(chapter.status)}
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-medium">Chapter {chapter.number}</div>
                <div className="font-bold text-gray-800 text-sm leading-snug">{chapter.name}</div>
                <div className="mt-1.5">
                  <ProgressBar value={chapter.progress} max={100} color={
                    chapter.progress === 100 ? 'green' : chapter.progress > 0 ? 'blue' : 'purple'
                  } height="h-1.5" />
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs font-bold text-gray-600">{chapter.progress}%</div>
                <div className={`text-gray-400 text-sm transition-transform ${expandedChapter === chapter.id ? 'rotate-90' : ''}`}>›</div>
              </div>
            </button>

            {/* Expanded topics */}
            {expandedChapter === chapter.id && chapter.topics && chapter.topics.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2 animate-slide-up bg-gray-50">
                {chapter.topics.map(topic => (
                  <div key={topic.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{topic.name}</div>
                      {topic.doubts > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">{topic.doubts} doubts asked</div>
                      )}
                    </div>
                    <MasteryChip mastery={topic.mastery} />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onNavigate('doubt')}
                        className="text-xs bg-purple-50 text-purple-700 border border-purple-200 font-semibold px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        Ask
                      </button>
                      <button
                        onClick={() => onNavigate('practice')}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Practice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chapter actions */}
            <div className="border-t border-gray-100 px-4 py-2.5 flex gap-2">
              <button
                onClick={() => onNavigate('practice')}
                className="flex-1 text-xs font-semibold bg-blue-50 text-blue-700 py-2 rounded-xl hover:bg-blue-100 transition-colors active:scale-95"
              >
                ⚡ Practice
              </button>
              <button
                onClick={() => onNavigate('test')}
                className="flex-1 text-xs font-semibold bg-purple-50 text-purple-700 py-2 rounded-xl hover:bg-purple-100 transition-colors active:scale-95"
              >
                📋 Test
              </button>
              <button
                onClick={() => onNavigate('doubt')}
                className="flex-1 text-xs font-semibold bg-gray-50 text-gray-600 py-2 rounded-xl hover:bg-gray-100 transition-colors active:scale-95"
              >
                💬 Ask
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
