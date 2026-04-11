import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'

const CLASSES = [8, 9, 10, 11, 12]

export default function OnboardingClass() {
  const navigate = useNavigate()
  const user = useUser()
  const [selected, setSelected] = useState<number | null>(user.studentClass || null)

  const handleSelect = (cls: number) => {
    setSelected(cls)
    user.updateUser({ studentClass: cls })
    setTimeout(() => navigate('/onboarding/subjects'), 300)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <motion.div className="w-full max-w-md"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        <p className="text-sm font-medium mb-1" style={{ color: '#9CA3AF' }}>Step 1 of 3</p>
        <h1 className="text-[22px] font-bold mb-1" style={{ color: '#111827' }}>What class are you in?</h1>
        <p className="text-sm mb-8" style={{ color: '#9CA3AF' }}>This helps your AI tutor match your exact syllabus</p>

        <div className="grid grid-cols-5 gap-3 mb-10">
          {CLASSES.map(cls => (
            <motion.button key={cls} whileTap={{ scale: 0.92 }}
              onClick={() => handleSelect(cls)}
              className="w-[52px] h-[52px] rounded-[10px] text-base font-semibold transition-all flex items-center justify-center"
              style={selected === cls
                ? { background: '#CCFBF1', border: '1.5px solid #0D9488', color: '#0F766E' }
                : { background: 'transparent', border: '1.5px solid #D1D5DB', color: '#6B7280' }
              }>
              {cls}
            </motion.button>
          ))}
        </div>

        <button onClick={() => selected && navigate('/onboarding/subjects')}
          disabled={!selected}
          className="w-full font-semibold py-3.5 rounded-[9px] text-base transition-all active:scale-95"
          style={selected
            ? { background: '#EA580C', color: '#FFF7ED' }
            : { background: '#F3F4F6', color: '#9CA3AF' }
          }>
          Continue →
        </button>
      </motion.div>
    </div>
  )
}
