import { useState } from 'react'
import { subjects, physicsChapters, mathChapters } from '../data/mockData'
import ScoreRing from '../components/ScoreRing'
import AIOrb from '../components/AIOrb'

const SUBJECT_GRADIENTS = {
  physics:     { from: 'from-blue-500',     to: 'to-blue-700',    light: 'bg-[#EFF6FF]',  text: 'text-[#1D4ED8]' },
  chemistry:   { from: 'from-orange-500',   to: 'to-orange-700',  light: 'bg-[#FFF7ED]',  text: 'text-[#C2410C]' },
  mathematics: { from: 'from-purple-500',   to: 'to-purple-700',  light: 'bg-[#F5F3FF]',  text: 'text-[#5B21B6]' },
  biology:     { from: 'from-emerald-500',  to: 'to-emerald-700', light: 'bg-[#ECFDF5]',  text: 'text-[#065F46]' },
  cs:          { from: 'from-cyan-500',     to: 'to-cyan-700',    light: 'bg-[#ECFEFF]',  text: 'text-[#0E7490]' },
}

const MASTERY_COLORS = {
  mastered:    { dot: 'bg-brand-success', label: 'Mastered',     text: 'text-emerald-600' },
  learning:    { dot: 'bg-brand-xp',     label: 'Learning',     text: 'text-amber-600' },
  beginner:    { dot: 'bg-blue-400',     label: 'Started',      text: 'text-blue-600' },
  'not-started': { dot: 'bg-gray-300',   label: 'Not started',  text: 'text-gray-400' },
}

const GENERIC_CHAPTERS = [
  { number: 1, name: 'Introduction', progress: 100 },
  { number: 2, name: 'Core Concepts', progress: 75 },
  { number: 3, name: 'Key Reactions & Formulas', progress: 40 },
  { number: 4, name: 'Applications', progress: 10 },
  { number: 5, name: 'Advanced Topics', progress: 0 },
]

function getChapters(subjectId) {
  if (subjectId === 'physics') return physicsChapters
  if (subjectId === 'mathematics') return mathChapters
  return GENERIC_CHAPTERS.map((c, i) => ({ ...c, id: `${subjectId}-ch${i}`, status: c.progress === 100 ? 'completed' : c.progress > 0 ? 'in-progress' : 'not-started', topics: [] }))
}

function ChapterRow({ chapter, gradient, onPractice, onAsk }) {
  const [open, setOpen] = useState(false)
  const hasTopic = chapter.topics && chapter.topics.length > 0
  const statusIcon = chapter.status === 'completed' ? '✓' : chapter.status === 'in-progress' ? '…' : '○'
  const statusColor = chapter.status === 'completed' ? 'text-brand-success' : chapter.status === 'in-progress' ? 'text-brand-xp' : 'text-gray-400'

  return (
    <div className="bg-white rounded-xl shadow-card border border-white overflow-hidden">
      <button
        onClick={() => hasTopic && setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <ScoreRing percent={chapter.progress} size={40} strokeWidth={4} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-brand-navy">{chapter.progress}%</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-brand-slate font-medium">Ch. {chapter.number}</span>
            <span className={`text-[10px] font-bold ${statusColor}`}>{statusIcon}</span>
          </div>
          <p className="text-sm font-bold text-brand-navy leading-tight">{chapter.name}</p>
        </div>

        {hasTopic && (
          <span className={`text-brand-slate text-lg transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        )}
      </button>

      {open && hasTopic && (
        <div className="border-t border-gray-100 px-4 pb-3">
          <div className="space-y-2 pt-2">
            {chapter.topics.map(topic => {
              const m = MASTERY_COLORS[topic.mastery] || MASTERY_COLORS['not-started']
              return (
                <div key={topic.id} className="flex items-center gap-3 py-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.dot}`} />
                  <div className="flex-1">
                    <p className="text-sm text-brand-navy font-medium leading-snug">{topic.name}</p>
                    <p className={`text-[10px] font-semibold ${m.text}`}>{m.label}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAsk(topic.name)}
                      className="text-[10px] font-bold text-brand-primary bg-brand-light px-2.5 py-1 rounded-full border border-brand-pale/30 active:scale-95 transition-all"
                    >
                      Ask AI
                    </button>
                    <button
                      onClick={() => onPractice(topic.name)}
                      className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 active:scale-95 transition-all"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LearnScreen({ onNavigate }) {
  const [activeSubject, setActiveSubject] = useState('physics')
  const subject = subjects.find(s => s.id === activeSubject) || subjects[0]
  const chapters = getChapters(activeSubject)
  const g = SUBJECT_GRADIENTS[activeSubject] || SUBJECT_GRADIENTS.physics
  const overallProgress = Math.round(chapters.reduce((sum, c) => sum + c.progress, 0) / chapters.length)

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg pb-36 md:pb-8">
      {/* Header */}
      <div className="px-5 pt-12 md:pt-6 pb-4">
        <h1 className="text-2xl font-black text-brand-navy">Learn</h1>
        <p className="text-brand-slate text-sm mt-0.5">Your CBSE Class 10 syllabus</p>
      </div>

      {/* Subject scroll */}
      <div className="px-4 mb-5">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {subjects.map(sub => {
            const sg = SUBJECT_GRADIENTS[sub.id] || SUBJECT_GRADIENTS.physics
            const isActive = sub.id === activeSubject
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubject(sub.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? `bg-gradient-to-br ${sg.from} ${sg.to} shadow-action`
                    : 'bg-white shadow-card border border-white'
                }`}
              >
                <span className="text-2xl">{sub.icon}</span>
                <span className={`text-[10px] font-black ${isActive ? 'text-white' : 'text-brand-navy'}`}>
                  {sub.name.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Subject hero */}
      <div className="px-4 mb-4">
        <div className={`bg-gradient-to-br ${g.from} ${g.to} rounded-xl p-4 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="relative flex items-center gap-4">
            <span className="text-4xl">{subject.icon}</span>
            <div className="flex-1">
              <h2 className="text-white font-black text-lg leading-tight">{subject.name}</h2>
              <p className="text-white/70 text-xs mt-0.5">{subject.chapters} chapters · Class 10 CBSE</p>
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${overallProgress}%` }} />
              </div>
              <p className="text-white/60 text-[10px] mt-1">{overallProgress}% complete</p>
            </div>
            <div className="relative flex-shrink-0">
              <ScoreRing percent={overallProgress} size={52} strokeWidth={5} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI suggestion */}
      <div className="px-4 mb-4">
        <button
          onClick={() => onNavigate('doubt')}
          className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-card"
        >
          <AIOrb size="xs" state="idle" />
          <div className="flex-1 text-left">
            <p className="text-xs text-brand-slate">AI suggests practicing next:</p>
            <p className="text-sm font-bold text-brand-navy">Power Formulas (P=VI) · Ch. 12</p>
          </div>
          <span className="text-xs font-bold text-brand-primary bg-brand-light px-2.5 py-1 rounded-full">Start →</span>
        </button>
      </div>

      {/* Chapter list */}
      <div className="px-4 space-y-2">
        <h3 className="text-xs font-bold text-brand-slate uppercase tracking-wider mb-3">Chapters</h3>
        {chapters.map(chapter => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            gradient={g}
            onPractice={(topic) => onNavigate('practice')}
            onAsk={(topic) => onNavigate('doubt')}
          />
        ))}
      </div>
    </div>
  )
}
