// ═══════════════════════════════════════════════════════════════════════════
// LandingPage — Padee.ai marketing front page.
// ═══════════════════════════════════════════════════════════════════════════
// Layout (matches design handoff Apr 25):
//   • Top nav: logo+mascot · Product · For schools · For parents · Pricing · Log in · Start free
//   • Hero (2-col on lg): copy on the left, chat mockup with floating XP + streak chips on the right
//   • Trust strip: "Backed by NCERT-aligned curriculum" + "As seen in" press chips
//
// All Padee colour tokens are inline (this page renders before any auth/v4
// stylesheet is mounted, so we don't depend on `.home-v4` scoped vars).
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Camera, Menu, Play, Star, X } from 'lucide-react'
import PaMascot from '../components/home-v4/PaMascot'

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'For schools', href: '#for-schools' },
  { label: 'For parents', href: '#for-parents' },
  { label: 'Pricing', href: '#pricing' },
]

const PRESS = ['The Hindu', 'HT', 'YourStory']
const SUBJECTS = ['Maths', 'Science', 'English', 'Social', 'Hindi']

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)

  const goLogin = () => navigate('/login')

  return (
    <div className="landing-v4" style={{
      minHeight: '100vh',
      background: '#FAF8F4',
      fontFamily: "'Lexend Deca', -apple-system, system-ui, sans-serif",
      color: '#13131A',
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* ═══ TOP NAV ═══ */}
      <header className="sticky top-0 z-40" style={{
        background: 'rgba(250, 248, 244, 0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #ECECEE',
      }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-7 flex items-center justify-between h-[60px]">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <PaMascot size={32} mood="idle" />
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Padee<span style={{ color: '#E85D3A' }}>.ai</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                style={{ fontSize: 14, fontWeight: 500, color: '#3A3A45' }}
                className="hover:text-[#E85D3A] transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={goLogin} className="hidden sm:inline-block"
              style={{ fontSize: 14, fontWeight: 600, color: '#3A3A45', padding: '8px 12px' }}>
              Log in
            </button>
            <button onClick={goLogin}
              style={{
                fontSize: 14, fontWeight: 600, color: '#fff',
                background: '#E85D3A',
                padding: '10px 18px', borderRadius: 12,
                boxShadow: '0 3px 0 #B2381B',
              }}
              className="active:translate-y-[1px] transition-transform">
              Start free
            </button>
            <button className="md:hidden" onClick={() => setMobileMenu(v => !v)}>
              {mobileMenu ? <X size={20} color="#3A3A45" /> : <Menu size={20} color="#3A3A45" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden px-5 pb-4 space-y-2"
            style={{ borderBottom: '1px solid #ECECEE', background: '#FAF8F4' }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="block py-2"
                style={{ fontSize: 15, fontWeight: 500, color: '#3A3A45' }}>
                {l.label}
              </a>
            ))}
            <button onClick={goLogin} className="block py-2 w-full text-left sm:hidden"
              style={{ fontSize: 15, fontWeight: 600, color: '#3A3A45' }}>
              Log in
            </button>
          </motion.div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <section className="max-w-6xl mx-auto px-5 sm:px-7 pt-10 lg:pt-16 pb-10">
        <motion.div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center"
          variants={stagger} initial="hidden" animate="visible">

          {/* ── Left: copy ── */}
          <motion.div variants={fadeUp}>
            {/* Eyebrow */}
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              color: '#E85D3A', textTransform: 'uppercase', marginBottom: 18,
            }}>
              AI study buddy · CBSE · IGCSE · JEE · NEET
            </p>

            {/* Headline */}
            <h1 style={{
              fontSize: 44, fontWeight: 700, lineHeight: 1.08,
              letterSpacing: '-1.2px', marginBottom: 22,
            }}
              className="lg:text-[52px]">
              Meet Pa.<br />
              <span style={{ color: '#E85D3A' }}>Your personal tutor</span><br />
              that actually teaches.
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 16, lineHeight: 1.55, color: '#3A3A45',
              maxWidth: 520, marginBottom: 28,
            }}>
              Snap a textbook question. Pa explains it in your language, grades your
              practice, and builds a plan that fits the next three hours of your life
              — not a 6-month course.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: 36 }}>
              <button onClick={goLogin}
                style={{
                  fontSize: 15, fontWeight: 600, color: '#fff',
                  background: '#E85D3A',
                  padding: '14px 22px', borderRadius: 12,
                  boxShadow: '0 4px 0 #B2381B',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
                className="active:translate-y-[2px] transition-transform">
                Start free — it's ₹0 <ArrowRight size={16} />
              </button>
              <button
                style={{
                  fontSize: 14, fontWeight: 600, color: '#13131A',
                  background: 'transparent',
                  padding: '13px 18px', borderRadius: 12,
                  border: '1px solid #ECECEE',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
                className="hover:bg-white transition-colors">
                <Play size={14} fill="currentColor" /> Watch 90-second demo
              </button>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-9 gap-y-4">
              <Stat number="18,400+" label="students studying now" />
              <Stat number="240" label="schools · 9 states" />
              <RatingStat />
            </div>
          </motion.div>

          {/* ── Right: chat mockup with floating chips ── */}
          <motion.div variants={fadeUp} className="relative">
            <div style={{
              background: 'linear-gradient(135deg, #FFC9AE 0%, #FFB58E 100%)',
              borderRadius: 28,
              padding: 28,
              boxShadow: '0 30px 60px rgba(232, 93, 58, 0.2)',
              transform: 'rotate(-1.2deg)',
              position: 'relative',
            }}>
              {/* Floating "+10 XP earned" chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotate: 6 }}
                animate={{ opacity: 1, scale: 1, rotate: 4 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                style={{
                  position: 'absolute', top: -16, right: -10,
                  background: '#fff', borderRadius: 999,
                  padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700,
                  boxShadow: '0 8px 22px rgba(19,19,26,0.12)',
                  zIndex: 2,
                }}>
                <span style={{ fontSize: 14 }}>✨</span>
                <span style={{ color: '#13131A' }}>+10 XP earned</span>
              </motion.div>

              {/* Chat card */}
              <div style={{
                background: '#fff',
                borderRadius: 18,
                padding: 16,
                transform: 'rotate(1.2deg)',
              }}>
                {/* Pa header */}
                <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid #F3EFE4' }}>
                  <PaMascot size={32} mood="idle" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pa · Class 9 Physics</div>
                    <div style={{ fontSize: 11, color: '#36D399', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#36D399' }} />
                      <span style={{ color: '#8A8A95' }}>Online · ready to help</span>
                    </div>
                  </div>
                </div>

                {/* Student bubble */}
                <div className="flex justify-end mt-3">
                  <div style={{
                    background: '#13131A', color: '#fff',
                    borderRadius: '14px 14px 3px 14px',
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.4,
                    maxWidth: '88%',
                  }}>
                    Pa, why does a ball roll faster downhill?
                  </div>
                </div>

                {/* Pa response bubble */}
                <div className="mt-3" style={{
                  background: '#FFEFC9',
                  borderRadius: '14px 14px 14px 3px',
                  padding: '12px 14px',
                  fontSize: 13, lineHeight: 1.5, color: '#3A3A45',
                }}>
                  Think of gravity as a hand pushing the ball{' '}
                  <b style={{ color: '#13131A' }}>down the slope</b>. On flat ground, the
                  push is sideways into the floor — it goes nowhere.
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    <Chip>📖 NCERT Ch 9</Chip>
                    <Chip>gravity</Chip>
                  </div>
                </div>

                {/* Pa's whiteboard */}
                <div className="mt-3" style={{
                  background: '#FAF8F4',
                  border: '1px dashed #FFB58E',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    color: '#E85D3A', marginBottom: 4, textTransform: 'uppercase',
                  }}>
                    ✏️ Pa's whiteboard
                  </div>
                  <div style={{
                    fontFamily: "'Kalam', 'Lexend Deca', sans-serif",
                    fontSize: 14, color: '#13131A', lineHeight: 1.4,
                  }}>
                    F = mg sin θ → bigger θ = bigger push!
                  </div>
                </div>

                {/* Input bar */}
                <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{
                  background: '#FAF8F4', border: '1px solid #ECECEE',
                }}>
                  <Camera size={14} color="#8A8A95" />
                  <span style={{ flex: 1, fontSize: 12.5, color: '#8A8A95' }}>Ask Pa anything…</span>
                  <button style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: '#E85D3A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowRight size={13} color="#fff" />
                  </button>
                </div>
              </div>

              {/* Floating "🔥 7-day streak!" chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: -3 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                style={{
                  position: 'absolute', bottom: -14, left: 6,
                  background: '#13131A', color: '#fff',
                  borderRadius: 999,
                  padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700,
                  boxShadow: '0 8px 22px rgba(19,19,26,0.25)',
                }}>
                <span style={{ fontSize: 14 }}>🔥</span>
                <span>7-day streak!</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="max-w-6xl mx-auto px-5 sm:px-7 pb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-6"
          style={{ borderTop: '1px solid #ECECEE' }}>
          <p style={{ fontSize: 13, color: '#3A3A45', lineHeight: 1.5 }}>
            Backed by NCERT-aligned curriculum · Used in{' '}
            {SUBJECTS.map((s, i) => (
              <span key={s}>
                <b style={{ color: '#13131A' }}>{s}</b>
                {i < SUBJECTS.length - 1 ? ' · ' : ''}
              </span>
            ))}{' '}
            Class 6–12
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span style={{ fontSize: 12, color: '#8A8A95', fontWeight: 600 }}>As seen in</span>
            {PRESS.map(p => (
              <span key={p}
                style={{
                  fontSize: 11.5, fontWeight: 600, color: '#3A3A45',
                  padding: '5px 12px', borderRadius: 8,
                  border: '1px solid #ECECEE', background: '#fff',
                }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>{number}</div>
      <div style={{ fontSize: 12.5, color: '#8A8A95', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function RatingStat() {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map(i => (
            <Star key={i} size={13} color="#FFB547" fill="#FFB547" />
          ))}
        </div>
        <span style={{ fontSize: 16, fontWeight: 700 }}>4.8</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#8A8A95', marginTop: 2 }}>Play Store · 2.3k reviews</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: '#8A5A00',
      background: '#fff', border: '1px solid #FFD98A',
      padding: '3px 8px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {children}
    </span>
  )
}
