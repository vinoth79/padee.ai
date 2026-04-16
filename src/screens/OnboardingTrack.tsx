import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser, Track } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { saveOnboarding } from '../services/api'
import { BookOpen, Zap, Stethoscope, Calculator } from 'lucide-react'

interface TrackOption {
  id: Track
  name: string
  desc: string
  icon: any
  iconBg: string
  iconBorder: string
  iconColor: string
  selectedBg: string
  selectedBorder: string
  selectedText: string
}

const TRACKS: TrackOption[] = [
  {
    id: 'school', name: 'School Learning', desc: 'CBSE · IGCSE · NEP 2020. Board exam prep and daily study.',
    icon: BookOpen, iconBg: '#CCFBF1', iconBorder: '#5EEAD4', iconColor: '#0D9488',
    selectedBg: '#F0FDFA', selectedBorder: '#0D9488', selectedText: '#0F766E',
  },
  {
    id: 'jee', name: 'JEE — Engineering', desc: 'JEE Main + Advanced. Physics, Chemistry, Mathematics.',
    icon: Zap, iconBg: '#DBEAFE', iconBorder: '#93C5FD', iconColor: '#2563EB',
    selectedBg: '#EFF6FF', selectedBorder: '#2563EB', selectedText: '#1D4ED8',
  },
  {
    id: 'neet', name: 'NEET / Medical', desc: 'NEET · AIIMS · JIPMER. Biology-focused with Physics & Chemistry.',
    icon: Stethoscope, iconBg: '#D1FAE5', iconBorder: '#6EE7B7', iconColor: '#059669',
    selectedBg: '#ECFDF5', selectedBorder: '#059669', selectedText: '#065F46',
  },
  {
    id: 'ca', name: 'CA Foundation', desc: 'Accounting, Business Law, Economics, Maths.',
    icon: Calculator, iconBg: '#EDE9FE', iconBorder: '#C4B5FD', iconColor: '#7C3AED',
    selectedBg: '#F5F3FF', selectedBorder: '#7C3AED', selectedText: '#5B21B6',
  },
]

export default function OnboardingTrack() {
  const navigate = useNavigate()
  const user = useUser()
  const { token } = useAuth()
  const [selected, setSelected] = useState<Track>(user.activeTrack || 'school')
  const [saving, setSaving] = useState(false)

  const handleStart = async () => {
    if (!token) return
    setSaving(true)
    try {
      await saveOnboarding(token, {
        className: user.studentClass,
        subjects: user.selectedSubjects,
        track: selected,
      })
      user.updateUser({ activeTrack: selected, isOnboarded: true })
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Onboarding save failed:', err)
      // Still navigate -- localStorage has the data, backend can sync later
      user.updateUser({ activeTrack: selected, isOnboarded: true })
      navigate('/home', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
      <motion.div className="w-full max-w-xl"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        <button onClick={() => navigate('/onboarding/subjects')}
          className="text-xs font-medium mb-4 flex items-center gap-1 transition-colors hover:text-teal-600" style={{ color: '#9CA3AF' }}>
          ← Back
        </button>

        <p className="text-sm font-medium mb-1" style={{ color: '#9CA3AF' }}>Step 3 of 3 · Class {user.studentClass}</p>
        <h1 className="text-[22px] font-bold mb-1" style={{ color: '#111827' }}>What's your main goal?</h1>
        <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>I'll build your personalised learning plan. You can change this later.</p>

        <div className="space-y-3 mb-8">
          {TRACKS.map(track => {
            const isSelected = selected === track.id
            const Icon = track.icon
            return (
              <motion.button key={track.id} whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(track.id)}
                className="w-full flex items-center gap-4 p-[14px] rounded-[11px] text-left transition-all"
                style={isSelected
                  ? { background: track.selectedBg, border: `1.5px solid ${track.selectedBorder}` }
                  : { background: '#FFFFFF', border: '1.5px solid #E5E7EB' }
                }>
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: track.iconBg, border: `1px solid ${track.iconBorder}` }}>
                  <Icon size={18} color={track.iconColor} />
                </div>
                {/* Text */}
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: isSelected ? track.selectedText : '#111827' }}>{track.name}</p>
                  <p className="text-[11px]" style={{ color: '#4B5563' }}>{track.desc}</p>
                </div>
                {/* Radio */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={isSelected
                    ? { border: `2px solid ${track.selectedBorder}` }
                    : { border: '2px solid #D1D5DB' }
                  }>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: track.selectedBorder }} />}
                </div>
              </motion.button>
            )
          })}
        </div>

        <button onClick={handleStart} disabled={saving}
          className="w-full font-semibold py-3.5 rounded-[9px] text-base transition-all active:scale-95 disabled:opacity-60"
          style={{ background: '#EA580C', color: '#FFF7ED' }}>
          {saving ? 'Setting up...' : 'Build my study plan →'}
        </button>

        <button onClick={async () => {
            // Skip: default to 'school' track per UI spec
            if (!token) return
            setSaving(true)
            try {
              await saveOnboarding(token, {
                className: user.studentClass,
                subjects: user.selectedSubjects,
                track: 'school',
              })
            } catch {}
            user.updateUser({ activeTrack: 'school', isOnboarded: true })
            navigate('/home', { replace: true })
          }}
          className="w-full text-center text-[12px] mt-3 font-medium transition-colors hover:text-teal-600" style={{ color: '#9CA3AF' }}>
          Skip — I'll choose later
        </button>
      </motion.div>
    </div>
  )
}
