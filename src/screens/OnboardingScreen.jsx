import { useState } from 'react'
import AIOrb from '../components/AIOrb'

const CLASSES = ['8', '9', '10', '11', '12']
const SUBJECTS = [
  { name: 'Physics',         icon: '⚡', from: 'from-blue-500',   to: 'to-indigo-600' },
  { name: 'Chemistry',       icon: '🧪', from: 'from-orange-400', to: 'to-amber-600' },
  { name: 'Mathematics',     icon: '📐', from: 'from-violet-500', to: 'to-purple-700' },
  { name: 'Biology',         icon: '🌿', from: 'from-emerald-400',to: 'to-green-600' },
  { name: 'Computer Science',icon: '💻', from: 'from-cyan-400',   to: 'to-sky-600' },
  { name: 'English',         icon: '📖', from: 'from-rose-400',   to: 'to-pink-600' },
  { name: 'Social Science',  icon: '🌍', from: 'from-amber-400',  to: 'to-orange-600' },
]

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState('welcome') // welcome | class | subjects
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])

  const toggleSubject = (name) =>
    setSelectedSubjects(p => p.includes(name) ? p.filter(s => s !== name) : [...p, name])

  return (
    <div className="min-h-screen bg-brand-dark overflow-hidden relative flex flex-col">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-violet-400/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-32 h-48 bg-teal-400/10 rounded-full blur-2xl" />
      </div>

      {/* WELCOME STEP */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6 relative animate-fade-in">
          {/* AI Orb — the product's personality */}
          <AIOrb size="xl" state="idle" className="shadow-orb" />

          {/* AI speaking */}
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Hey. I'm your<br />
              <span className="gradient-text">AI tutor.</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xs mx-auto">
              I know your CBSE syllabus inside out. Ask me anything — doubts, concepts, practice questions — anytime.
            </p>
          </div>

          {/* Social proof chips */}
          <div className="flex gap-2 flex-wrap justify-center">
            {['Classes 8–12', 'CBSE Aligned', 'Available 24/7'].map(t => (
              <span key={t} className="text-xs font-semibold text-white/50 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {t}
              </span>
            ))}
          </div>

          <button
            onClick={() => setStep('class')}
            className="w-full max-w-xs bg-brand-primary hover:bg-violet-600 text-white font-black py-4 rounded-2xl text-base shadow-action transition-all active:scale-95"
          >
            Let's go →
          </button>

          <button
            onClick={() => onComplete({ isTeacher: true })}
            className="text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            I'm a teacher
          </button>
        </div>
      )}

      {/* CLASS STEP */}
      {step === 'class' && (
        <div className="flex-1 flex flex-col px-6 pt-16 pb-8 relative animate-fade-in">
          <div className="mb-8">
            <p className="text-white/50 text-sm font-semibold mb-1">Step 1 of 2</p>
            <h2 className="text-2xl font-black text-white">What class are you in?</h2>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-auto">
            {CLASSES.map(cls => (
              <button
                key={cls}
                onClick={() => { setSelectedClass(cls); setTimeout(() => setStep('subjects'), 250) }}
                className={`aspect-square rounded-2xl font-black text-lg transition-all active:scale-90 ${
                  selectedClass === cls
                    ? 'bg-brand-primary text-white shadow-action scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          <p className="text-white/30 text-xs text-center mt-6">Your syllabus content will be tailored to your class.</p>
        </div>
      )}

      {/* SUBJECTS STEP */}
      {step === 'subjects' && (
        <div className="flex-1 flex flex-col px-6 pt-16 pb-8 relative animate-fade-in">
          <div className="mb-6">
            <p className="text-white/50 text-sm font-semibold mb-1">Step 2 of 2 · Class {selectedClass}</p>
            <h2 className="text-2xl font-black text-white">Pick your subjects</h2>
            <p className="text-white/50 text-sm mt-1">Select all that you study.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {SUBJECTS.map(sub => {
              const selected = selectedSubjects.includes(sub.name)
              return (
                <button
                  key={sub.name}
                  onClick={() => toggleSubject(sub.name)}
                  className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 font-semibold text-sm transition-all active:scale-95 overflow-hidden ${
                    selected
                      ? 'border-transparent text-white shadow-md scale-[1.02]'
                      : 'border-white/15 bg-white/8 text-white/70 hover:border-white/30'
                  }`}
                  style={selected ? {} : {}}
                >
                  {selected && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${sub.from} ${sub.to} opacity-90`} />
                  )}
                  <span className="text-2xl relative z-10">{sub.icon}</span>
                  <span className="relative z-10 text-left leading-tight">{sub.name}</span>
                  {selected && (
                    <span className="absolute top-2 right-2 z-10 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-[10px]">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => onComplete({ class: selectedClass, subjects: selectedSubjects })}
            disabled={selectedSubjects.length === 0}
            className={`w-full font-black py-4 rounded-2xl text-base transition-all active:scale-95 ${
              selectedSubjects.length > 0
                ? 'bg-brand-primary text-white shadow-action hover:bg-violet-600'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {selectedSubjects.length > 0
              ? `Start Learning (${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''}) →`
              : 'Select at least one subject'}
          </button>
        </div>
      )}
    </div>
  )
}
