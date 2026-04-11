import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Stethoscope, Calculator, Video, ArrowRight, Zap, Camera, Menu, X } from 'lucide-react'
import { useState } from 'react'

const TRACKS = [
  { name: 'School Learning', desc: 'CBSE · IGCSE · NEP 2020 aligned. Classes 8–12.', icon: BookOpen, bg: '#F0FDFA', border: '#5EEAD4', text: '#0F766E', iconBg: '#CCFBF1' },
  { name: 'JEE Prep', desc: 'Main + Advanced. Physics, Chemistry, Maths.', icon: Zap, bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', iconBg: '#DBEAFE' },
  { name: 'NEET / Medical', desc: 'NEET · AIIMS · JIPMER. Full syllabus coverage.', icon: Stethoscope, bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', iconBg: '#D1FAE5' },
  { name: 'CA Foundation', desc: 'Accounts, Law, Economics, Maths.', icon: Calculator, bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', iconBg: '#EDE9FE' },
  { name: 'Live Tutoring', desc: 'Book AI or human tutors. Any subject, any time.', icon: Video, bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', iconBg: '#FFEDD5' },
]

const CHIPS = ['CBSE Classes 8–12', 'IGCSE Cambridge', 'JEE Main + Advanced', 'NEET · AIIMS · JIPMER', 'CA Foundation']

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>

      {/* ═══ NAVBAR ═══ */}
      <nav className="sticky top-0 z-40 bg-white" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: '#0D9488' }}>
              <div className="w-[9px] h-[9px] rounded-full" style={{ background: '#99F6E4' }} />
            </div>
            <span className="font-bold text-[16px]" style={{ color: '#111827' }}>Padee.ai</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {['School Learning', 'JEE', 'NEET', 'CA Foundation', 'For Schools'].map(link => (
              <span key={link} className="text-[15px] font-medium cursor-pointer transition-colors hover:text-[#0D9488]" style={{ color: '#6B7280' }}>{link}</span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/onboarding/class')}
              className="text-[14px] font-semibold px-4 py-2 rounded-lg transition-all active:scale-95" style={{ background: '#EA580C', color: '#FFF7ED' }}>
              Start free
            </button>
            <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={20} color="#6B7280" /> : <Menu size={20} color="#6B7280" />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white px-4 pb-4 space-y-2" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
            {['School Learning', 'JEE', 'NEET', 'CA Foundation', 'For Schools'].map(link => (
              <div key={link} className="py-2 text-sm font-medium" style={{ color: '#6B7280' }}>{link}</div>
            ))}
          </motion.div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ background: '#F0FDFA' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-[52px]">
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-10 items-center"
            variants={stagger} initial="hidden" animate="visible">

            {/* Left: Copy */}
            <motion.div variants={fadeUp} className="space-y-5">
              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#0D9488' }} />
                <span className="text-[13px] font-semibold tracking-wide" style={{ color: '#0F766E' }}>NEP 2020 · CBSE · IGCSE · JEE · NEET · CA</span>
              </div>

              <h1 className="text-[30px] lg:text-[34px] font-bold leading-[1.2]" style={{ color: '#111827' }}>
                One platform.<br />
                <span style={{ color: '#0D9488' }}>Every exam.</span><br />
                AI that never stops.
              </h1>

              <p className="text-[16px] leading-[1.65] max-w-md" style={{ color: '#4B5563' }}>
                Padee.ai is your AI-powered study companion for CBSE, IGCSE, JEE, NEET, and CA Foundation.
                Get doubts solved instantly, practice at your level, and know exactly where to improve — on any device, any time.
              </p>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {CHIPS.map(chip => (
                  <span key={chip} className="text-[12px] font-semibold px-[11px] py-1 rounded-full" style={{ background: '#CCFBF1', color: '#0F766E', border: '0.5px solid #5EEAD4' }}>
                    {chip}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={() => navigate('/onboarding/class')}
                  className="text-[15px] font-semibold px-5 py-3 rounded-[9px] transition-all active:scale-95 flex items-center gap-2" style={{ background: '#EA580C', color: '#FFF7ED' }}>
                  Start my free study session <ArrowRight size={14} />
                </button>
                <button onClick={() => navigate('/teacher')}
                  className="text-[14px] font-semibold px-5 py-3 rounded-[9px] transition-all active:scale-95" style={{ color: '#374151', border: '0.5px solid #D1D5DB' }}>
                  I'm a teacher →
                </button>
              </div>
              <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Takes 30 seconds · No credit card required</p>
            </motion.div>

            {/* Right: Product preview */}
            <motion.div variants={fadeUp}>
              <div className="rounded-[14px] p-5" style={{ background: '#FFFFFF', border: '0.5px solid #D1FAE5' }}>
                {/* AI label */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#CCFBF1' }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: '#0D9488' }} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#0F766E' }}>AI Recommendation for today</span>
                </div>

                {/* Navy inner card */}
                <div className="rounded-[10px] p-4 mb-3" style={{ background: '#0F1729' }}>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: '#818CF8' }}>NEET · 47 DAYS TO EXAM</p>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#F1F5F9' }}>Organic Chemistry is your weakest at 43%.</p>
                  <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>I've prepared a 20-question targeted set — takes 15 minutes.</p>
                  <div className="flex gap-2">
                    <button className="flex-1 text-xs font-semibold py-2 rounded-lg" style={{ background: '#0D9488', color: '#F0FDFA' }}>Fix Organic Chem now →</button>
                    <button className="text-xs font-medium py-2 px-3 rounded-lg" style={{ border: '1px solid #334155', color: '#94A3B8' }}>Full plan</button>
                  </div>
                </div>

                {/* Mini cards row */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg p-3" style={{ background: '#ECFDF5', border: '0.5px solid #A7F3D0' }}>
                    <p className="text-[10px] font-medium mb-1" style={{ color: '#065F46' }}>NEET Readiness</p>
                    <p className="text-xl font-bold font-mono" style={{ color: '#059669' }}>68%</p>
                    <p className="text-[10px]" style={{ color: '#6B7280' }}>↑ 5% this week</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: '#FFF7ED', border: '0.5px solid #FED7AA' }}>
                    <p className="text-[10px] font-medium mb-1" style={{ color: '#C2410C' }}>Weak Area</p>
                    <p className="text-sm font-semibold" style={{ color: '#EA580C' }}>Organic Chem</p>
                    <p className="text-[10px]" style={{ color: '#6B7280' }}>43% accuracy</p>
                  </div>
                </div>

                {/* Ask bar */}
                <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB' }}>
                  <div className="w-6 h-6 ai-orb-sm rounded-full flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white/50 rounded-full" />
                  </div>
                  <span className="flex-1 text-xs" style={{ color: '#9CA3AF' }}>Ask me anything from your syllabus...</span>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#F9FAFB' }}>
                    <Camera size={12} color="#9CA3AF" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#0D9488' }}>
                    <ArrowRight size={12} color="#F0FDFA" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ 5-TRACK SECTION ═══ */}
      <section className="bg-white" style={{ borderTop: '0.5px solid #E5E7EB' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-9 lg:py-[36px]">
          <p className="text-[11px] font-bold tracking-[0.15em] text-center mb-6" style={{ color: '#9CA3AF' }}>5 LEARNING TRACKS — ONE PLATFORM</p>
          <motion.div className="grid grid-cols-2 lg:grid-cols-5 gap-3"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {TRACKS.map(track => {
              const Icon = track.icon
              return (
                <motion.button key={track.name} variants={fadeUp}
                  onClick={() => navigate('/onboarding/class')}
                  className="rounded-[10px] p-4 text-left transition-all active:scale-[0.98]" style={{ background: track.bg, border: `0.5px solid ${track.border}` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: track.iconBg }}>
                    <Icon size={18} color={track.text} />
                  </div>
                  <p className="text-[15px] font-semibold mb-1" style={{ color: track.text }}>{track.name}</p>
                  <p className="text-[13px] leading-[1.5]" style={{ color: '#4B5563' }}>{track.desc}</p>
                </motion.button>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══ BOTTOM CTA ═══ */}
      <section style={{ background: '#F0FDFA', borderTop: '0.5px solid #5EEAD4' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: '#111827' }}>Ready to study smarter?</h2>
            <p className="text-[14px]" style={{ color: '#4B5563' }}>Join thousands of students already learning with AI.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/onboarding/class')}
              className="text-[15px] font-semibold px-5 py-3 rounded-[9px] transition-all active:scale-95" style={{ background: '#EA580C', color: '#FFF7ED' }}>
              Get started free →
            </button>
            <button onClick={() => navigate('/teacher')}
              className="text-[15px] font-semibold px-5 py-3 rounded-[9px] transition-all active:scale-95" style={{ background: '#0D9488', color: '#F0FDFA' }}>
              For schools
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-white py-6 text-center" style={{ borderTop: '0.5px solid #E5E7EB' }}>
        <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Padee.ai · AI-powered learning for every Indian student · © 2026</p>
      </footer>
    </div>
  )
}
