import { useState, useEffect } from 'react'
import AIOrb from '../components/AIOrb'

const CLASSES = ['8', '9', '10', '11', '12']

const SUBJECTS = [
  { name: 'Physics',         icon: '⚡', bg: '#EFF6FF', border: '#2563EB', text: '#1D4ED8', iconBg: '#BFDBFE' },
  { name: 'Chemistry',       icon: '🧪', bg: '#FFF7ED', border: '#EA580C', text: '#C2410C', iconBg: '#FED7AA' },
  { name: 'Mathematics',     icon: '📐', bg: '#F5F3FF', border: '#7C3AED', text: '#5B21B6', iconBg: '#DDD6FE' },
  { name: 'Biology',         icon: '🌿', bg: '#ECFDF5', border: '#059669', text: '#065F46', iconBg: '#A7F3D0' },
  { name: 'Computer Science',icon: '💻', bg: '#ECFEFF', border: '#0891B2', text: '#0E7490', iconBg: '#A5F3FC' },
  { name: 'English',         icon: '📖', bg: '#FFF1F2', border: '#E11D48', text: '#BE123C', iconBg: '#FECDD3' },
  { name: 'Social Science',  icon: '🌍', bg: '#FFFBEB', border: '#D97706', text: '#92400E', iconBg: '#FDE68A' },
]

const DEMO_LINES = [
  { type: 'student', text: "Explain Ohm's Law simply", delay: 0 },
  { type: 'ai', text: 'V = I × R. Think of it like water in a pipe — voltage is pressure, current is flow, resistance is how narrow the pipe is.', delay: 1200 },
  { type: 'chip', text: 'Quiz me on this ⚡', delay: 3000 },
  { type: 'ai', text: 'A 6V battery connects to a 2Ω resistor. What current flows?', delay: 3800 },
  { type: 'answer', text: '3 A ✓  +5 XP', delay: 5200 },
]

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState('welcome')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [demoStep, setDemoStep] = useState(0)

  const toggleSubject = (name) =>
    setSelectedSubjects(p => p.includes(name) ? p.filter(s => s !== name) : [...p, name])

  useEffect(() => {
    if (step !== 'welcome') return
    const timers = DEMO_LINES.map((_, i) =>
      setTimeout(() => setDemoStep(i + 1), DEMO_LINES[i].delay + 800)
    )
    const loopTimer = setTimeout(() => setDemoStep(0), 7500)
    return () => { timers.forEach(clearTimeout); clearTimeout(loopTimer) }
  }, [step, demoStep === 0])

  const handleFinish = () => {
    setStep('loading')
    setTimeout(() => onComplete({ class: selectedClass, subjects: selectedSubjects }), 2000)
  }

  return (
    <div className="min-h-screen overflow-hidden relative flex flex-col" style={{ background: step === 'welcome' ? '#F0FDFA' : '#FFFFFF' }}>

      {/* ═══ WELCOME ═══ */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col lg:flex-row relative animate-fade-in">
          {/* Left: Demo */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:py-0">
            <AIOrb size="lg" state="idle" className="shadow-orb mb-6" />

            {/* Mini demo chat */}
            <div className="w-full max-w-sm rounded-xl p-3 space-y-2 min-h-[160px]" style={{ background: '#FFFFFF', border: '0.5px solid #D1FAE5' }}>
              {demoStep >= 1 && (
                <div className="flex justify-end animate-fade-in">
                  <div className="rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]" style={{ background: '#0D9488' }}>
                    <p className="text-white text-xs font-medium">{DEMO_LINES[0].text}</p>
                  </div>
                </div>
              )}
              {demoStep >= 2 && (
                <div className="flex gap-2 animate-fade-in">
                  <div className="w-6 h-6 ai-orb-sm rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]" style={{ background: '#F0FDFA', border: '0.5px solid #99F6E4' }}>
                    <p className="text-xs leading-relaxed" style={{ color: '#111827' }}>{DEMO_LINES[1].text}</p>
                  </div>
                </div>
              )}
              {demoStep >= 3 && (
                <div className="flex justify-end animate-fade-in">
                  <div className="rounded-full px-3 py-1.5" style={{ background: '#CCFBF1', border: '0.5px solid #99F6E4' }}>
                    <p className="text-[11px] font-semibold" style={{ color: '#0F766E' }}>{DEMO_LINES[2].text}</p>
                  </div>
                </div>
              )}
              {demoStep >= 4 && (
                <div className="flex gap-2 animate-fade-in">
                  <div className="w-6 h-6 ai-orb-sm rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]" style={{ background: '#F0FDFA', border: '0.5px solid #99F6E4' }}>
                    <p className="text-xs" style={{ color: '#111827' }}>{DEMO_LINES[3].text}</p>
                  </div>
                </div>
              )}
              {demoStep >= 5 && (
                <div className="flex justify-center animate-scale-in">
                  <div className="rounded-full px-4 py-1.5" style={{ background: '#059669' }}>
                    <p className="text-white text-xs font-bold">{DEMO_LINES[4].text}</p>
                  </div>
                </div>
              )}
              {demoStep === 0 && (
                <div className="flex items-center justify-center h-full min-h-[130px]">
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>Watch how it works...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Copy + CTA */}
          <div className="flex-1 flex flex-col items-center lg:items-start justify-center px-6 lg:px-10 pb-10 lg:pb-0">
            <h1 className="text-2xl lg:text-3xl font-extrabold leading-tight text-center lg:text-left mb-4" style={{ color: '#111827' }}>
              Study smarter with AI that<br />
              <span className="gradient-text">knows your CBSE syllabus</span>
            </h1>

            <div className="flex flex-col gap-2.5 w-full max-w-sm mb-6">
              {[
                { icon: '🧠', text: 'Get any doubt solved in 30 seconds' },
                { icon: '📝', text: 'Practice questions matched to your level' },
                { icon: '📊', text: 'Know exactly where you\'re weak — and fix it' },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: '#CCFBF1', border: '0.5px solid #99F6E4' }}>
                  <span className="text-base">{v.icon}</span>
                  <span className="text-sm font-medium" style={{ color: '#0F766E' }}>{v.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {['Classes 8–12', 'CBSE Aligned', 'Works 24/7'].map(t => (
                <span key={t} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: '#CCFBF1', color: '#0F766E', border: '0.5px solid #99F6E4' }}>{t}</span>
              ))}
            </div>

            <div className="w-full max-w-sm space-y-3">
              <button onClick={() => setStep('class')}
                className="w-full font-bold py-3.5 rounded-xl text-base shadow-action transition-all active:scale-95" style={{ background: '#EA580C', color: '#FFF7ED' }}>
                Start my free study session →
              </button>
              <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>Takes 30 seconds to set up</p>
              <button onClick={() => onComplete({ isTeacher: true })}
                className="w-full text-sm py-2 rounded-xl transition-colors" style={{ color: '#374151', border: '0.5px solid #D1D5DB' }}>
                I'm a teacher →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CLASS SELECT ═══ */}
      {step === 'class' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative animate-fade-in">
          <div className="w-full max-w-md">
            <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Step 1 of 2</p>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>What class are you in?</h2>
            <p className="text-sm mb-8" style={{ color: '#9CA3AF' }}>This helps your AI tutor match your exact syllabus</p>
            <div className="grid grid-cols-5 gap-3 mb-8">
              {CLASSES.map(cls => (
                <button key={cls}
                  onClick={() => { setSelectedClass(cls); setTimeout(() => setStep('subjects'), 300) }}
                  className="aspect-square rounded-xl font-bold text-lg transition-all active:scale-90"
                  style={selectedClass === cls
                    ? { background: '#CCFBF1', border: '1.5px solid #0D9488', color: '#0F766E' }
                    : { background: 'transparent', border: '1.5px solid #D1D5DB', color: '#6B7280' }
                  }>
                  {cls}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUBJECTS SELECT ═══ */}
      {step === 'subjects' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative animate-fade-in">
          <div className="w-full max-w-lg">
            <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Step 2 of 2 · Class {selectedClass}</p>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Which subjects do you study?</h2>
            <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>I'll set up your personalised dashboard</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {SUBJECTS.map(sub => {
                const selected = selectedSubjects.includes(sub.name)
                return (
                  <button key={sub.name} onClick={() => toggleSubject(sub.name)}
                    className="relative flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition-all active:scale-95"
                    style={selected
                      ? { background: sub.bg, border: `1.5px solid ${sub.border}`, color: sub.text }
                      : { background: 'transparent', border: '1.5px solid #D1D5DB', color: '#374151' }
                    }>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: selected ? sub.iconBg : '#F3F4F6' }}>{sub.icon}</span>
                    <span className="text-left leading-tight">{sub.name}</span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white" style={{ background: sub.border }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
            <button onClick={() => selectedSubjects.length > 0 && handleFinish()}
              disabled={selectedSubjects.length === 0}
              className="w-full font-bold py-3.5 rounded-xl text-base transition-all active:scale-95"
              style={selectedSubjects.length > 0
                ? { background: '#EA580C', color: '#FFF7ED' }
                : { background: '#F3F4F6', color: '#9CA3AF' }
              }>
              {selectedSubjects.length > 0
                ? `Start learning (${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''}) →`
                : 'Select at least one subject'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ LOADING ═══ */}
      {step === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 relative animate-fade-in" style={{ background: '#F0FDFA' }}>
          <AIOrb size="lg" state="thinking" className="shadow-orb" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold" style={{ color: '#111827' }}>Setting up your AI tutor...</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>Loading Class {selectedClass} CBSE syllabus</p>
          </div>
          <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: '#CCFBF1' }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: '#0D9488', width: '70%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
