import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'

const SUBJECTS = [
  { name: 'Physics',          icon: '⚡', bg: '#EFF6FF', border: '#2563EB', text: '#1D4ED8', iconBg: '#BFDBFE' },
  { name: 'Chemistry',        icon: '🧪', bg: '#FFF7ED', border: '#EA580C', text: '#C2410C', iconBg: '#FED7AA' },
  { name: 'Mathematics',      icon: '📐', bg: '#F5F3FF', border: '#7C3AED', text: '#5B21B6', iconBg: '#DDD6FE' },
  { name: 'Biology',          icon: '🌿', bg: '#ECFDF5', border: '#059669', text: '#065F46', iconBg: '#A7F3D0' },
  { name: 'Computer Science', icon: '💻', bg: '#ECFEFF', border: '#0891B2', text: '#0E7490', iconBg: '#A5F3FC' },
  { name: 'English',          icon: '📖', bg: '#FFF1F2', border: '#E11D48', text: '#BE123C', iconBg: '#FECDD3' },
  { name: 'Social Science',   icon: '🌍', bg: '#FFFBEB', border: '#D97706', text: '#92400E', iconBg: '#FDE68A' },
]

export default function OnboardingSubjects() {
  const navigate = useNavigate()
  const user = useUser()
  const [selected, setSelected] = useState<string[]>(user.selectedSubjects || [])

  const toggle = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  const handleContinue = () => {
    user.updateUser({ selectedSubjects: selected })
    navigate('/onboarding/track')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
      <motion.div className="w-full max-w-lg"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        <p className="text-sm font-medium mb-1" style={{ color: '#9CA3AF' }}>Step 2 of 3 · Class {user.studentClass}</p>
        <h1 className="text-[22px] font-bold mb-1" style={{ color: '#111827' }}>Which subjects do you study?</h1>
        <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>I'll set up your personalised dashboard</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {SUBJECTS.map(sub => {
            const isSelected = selected.includes(sub.name)
            return (
              <motion.button key={sub.name} whileTap={{ scale: 0.96 }}
                onClick={() => toggle(sub.name)}
                className="relative flex items-center gap-3 p-4 rounded-[10px] text-sm font-medium transition-all text-left"
                style={isSelected
                  ? { background: sub.bg, border: `1.5px solid ${sub.border}`, color: sub.text }
                  : { background: 'transparent', border: '1.5px solid #D1D5DB', color: '#374151' }
                }>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ background: isSelected ? sub.iconBg : '#F3F4F6' }}>
                  {sub.icon}
                </span>
                <span className="leading-tight">{sub.name}</span>
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                    style={{ background: sub.border }}>✓</span>
                )}
              </motion.button>
            )
          })}
        </div>

        <button onClick={handleContinue}
          disabled={selected.length === 0}
          className="w-full font-semibold py-3.5 rounded-[9px] text-base transition-all active:scale-95"
          style={selected.length > 0
            ? { background: '#EA580C', color: '#FFF7ED' }
            : { background: '#F3F4F6', color: '#9CA3AF' }
          }>
          {selected.length > 0
            ? `Continue (${selected.length} subject${selected.length > 1 ? 's' : ''}) →`
            : 'Select at least one subject'}
        </button>
      </motion.div>
    </div>
  )
}
