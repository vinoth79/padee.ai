// ═══════════════════════════════════════════════════════════════════════════
// OnboardingClass — Step 1/3 (Apr 25 mockup).
// ═══════════════════════════════════════════════════════════════════════════
// Captures: class_level (8-12) + board (CBSE | ICSE | IGCSE | IB | STATE | OTHER).
// Both persist to UserContext; the final POST happens at the end of step 3
// via saveOnboarding(token, { className, board, subjects, track }).
//
// Phase 1 supports Classes 8-12 (CBSE secondary + senior). DPDP-wise these
// students are all under 18, so parental consent is required at signup.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useUser, Board } from '../context/UserContext'
import PaMascot from '../components/home-v4/PaMascot'

const CLASSES = [
  { n: 8,  sub: 'Middle school' },
  { n: 9,  sub: 'Secondary' },
  { n: 10, sub: 'Boards year' },
  { n: 11, sub: 'Senior · stream chosen' },
  { n: 12, sub: 'Senior · boards + entrance' },
]

const BOARDS: Array<{ id: Board; name: string; sub: string; badge?: string }> = [
  { id: 'CBSE',   name: 'CBSE',        sub: 'Central board · NCERT aligned',         badge: 'Most common' },
  { id: 'ICSE',   name: 'ICSE',        sub: 'Council for Indian School Certificate' },
  { id: 'IGCSE',  name: 'IGCSE',       sub: 'Cambridge International' },
  { id: 'IB',     name: 'IB',          sub: 'International Baccalaureate' },
  { id: 'STATE',  name: 'State board', sub: 'Karnataka · Maharashtra · Tamil Nadu · …' },
  { id: 'OTHER',  name: 'Other',       sub: 'Tell Pa and we\'ll map it' },
]

export default function OnboardingClass() {
  const navigate = useNavigate()
  const user = useUser()
  // Only honour a previously-saved class if it's still in the supported range
  const savedClass = user.studentClass && user.studentClass >= 8 && user.studentClass <= 12
    ? user.studentClass : null
  const [klass, setKlass] = useState<number | null>(savedClass)
  const [board, setBoard] = useState<Board | null>(user.board || 'CBSE')

  const canContinue = klass != null && board != null

  function handleNext() {
    if (!canContinue) return
    user.updateUser({ studentClass: klass!, board: board! })
    navigate('/onboarding/subjects')
  }

  function handleSkip() {
    // Skip → store sensible defaults (Class 10 + CBSE) and advance
    user.updateUser({ studentClass: klass || 10, board: board || 'CBSE' })
    navigate('/onboarding/subjects')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAF8F4',
      fontFamily: "'Lexend Deca', -apple-system, system-ui, sans-serif",
      color: '#13131A', WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ─── Top nav with step indicator ─── */}
      <header style={{
        background: 'rgba(250,248,244,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #ECECEE',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-7 flex items-center justify-between h-[60px]">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <PaMascot size={32} mood="idle" />
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Padee<span style={{ color: '#E85D3A' }}>.ai</span>
            </span>
          </button>
          <div className="flex items-center gap-4">
            <StepIndicator step={1} />
            <button onClick={handleSkip}
              style={{ fontSize: 13, fontWeight: 500, color: '#8A8A95' }}
              className="hover:text-[#13131A]">
              Skip for now
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-7 py-7">

        {/* Pa greeting bubble */}
        <div style={{
          background: '#FFEFC9', border: '1px solid #F6D98A',
          borderRadius: 16, padding: '14px 18px',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          marginBottom: 28,
        }}>
          <PaMascot size={42} mood="speaking" />
          <p style={{ fontSize: 14, lineHeight: 1.55, color: '#5C3A00', margin: 0, flex: 1 }}>
            <b>Hi, I'm Pa!</b> Tell me what class you're in and which board you study under.
            I'll pull up the right syllabus so every lesson matches your school.
          </p>
        </div>

        {/* Class picker */}
        <SectionLabel>Which class are you in?</SectionLabel>
        <div className="grid gap-3 mb-9"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {CLASSES.map(c => {
            const selected = klass === c.n
            return (
              <button key={c.n} onClick={() => setKlass(c.n)}
                className="active:scale-[0.98] transition-all"
                style={{
                  padding: '18px 14px',
                  background: selected ? '#13131A' : '#fff',
                  color: selected ? '#fff' : '#13131A',
                  border: selected ? '1.5px solid #13131A' : '1.5px solid #ECECEE',
                  borderRadius: 14,
                  textAlign: 'center',
                  boxShadow: selected ? '0 8px 22px rgba(19,19,26,0.15)' : 'none',
                }}>
                <div style={{
                  fontSize: 32, fontWeight: 700, lineHeight: 1,
                  letterSpacing: '-0.6px',
                  color: selected ? '#FFB547' : '#13131A',
                  marginBottom: 4,
                }}>
                  {c.n}
                </div>
                <div style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
                  color: selected ? 'rgba(255,255,255,0.6)' : '#8A8A95',
                  textTransform: 'uppercase', marginBottom: 4,
                }}>
                  Class
                </div>
                <div style={{
                  fontSize: 11.5, lineHeight: 1.3,
                  color: selected ? 'rgba(255,255,255,0.85)' : '#3A3A45',
                }}>
                  {c.sub}
                </div>
              </button>
            )
          })}
        </div>

        {/* Board picker */}
        <SectionLabel>And which board?</SectionLabel>
        <div className="grid gap-3 mb-8"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {BOARDS.map(b => {
            const selected = board === b.id
            return (
              <button key={b.id} onClick={() => setBoard(b.id)}
                className="active:scale-[0.99] transition-all relative"
                style={{
                  padding: 16, textAlign: 'left',
                  background: selected ? '#FFE7DD' : '#fff',
                  border: selected ? '1.5px solid #E85D3A' : '1.5px solid #ECECEE',
                  borderRadius: 14,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${selected ? '#E85D3A' : '#D1D1D6'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E85D3A' }} />}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#13131A' }}>
                    {b.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#8A8A95', marginTop: 1 }}>
                    {b.sub}
                  </span>
                </span>
                {b.badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                    background: '#FFB547', color: '#5C3A00',
                    padding: '4px 9px', borderRadius: 999, flexShrink: 0,
                  }}>
                    {b.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Sticky footer ─── */}
      <footer style={{
        background: '#fff', borderTop: '1px solid #ECECEE',
        position: 'sticky', bottom: 0, zIndex: 30,
      }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-7 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p style={{ fontSize: 13.5, color: '#3A3A45' }}>
            {klass && board ? (
              <>Selected: <b style={{ color: '#13131A' }}>Class {klass} · {board}</b></>
            ) : klass ? (
              <>Selected: <b style={{ color: '#13131A' }}>Class {klass}</b> · pick a board</>
            ) : (
              <>Pick your class and board to continue</>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="active:translate-y-[1px] transition-transform"
              style={{
                fontSize: 14, fontWeight: 600, color: '#3A3A45',
                background: '#fff', border: '1px solid #ECECEE',
                padding: '11px 18px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={handleNext} disabled={!canContinue}
              className="active:translate-y-[1px] transition-transform"
              style={{
                fontSize: 14, fontWeight: 600,
                background: canContinue ? '#E85D3A' : '#F1EDE2',
                color: canContinue ? '#fff' : '#B8B8C0',
                padding: '11px 20px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: canContinue ? '0 4px 0 #B2381B' : 'none',
                cursor: canContinue ? 'pointer' : 'not-allowed',
              }}>
              Next: Subjects <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Atoms ──

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
      color: '#E85D3A', textTransform: 'uppercase', marginBottom: 12,
    }}>
      {children}
    </p>
  )
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3].map(s => {
          const active = s === step
          const done = s < step
          return (
            <span key={s} style={{
              height: 6,
              width: active ? 28 : 6,
              borderRadius: 3,
              background: active ? '#E85D3A' : done ? '#E85D3A' : '#D1D1D6',
              opacity: done && !active ? 0.4 : 1,
              transition: 'all 0.2s ease',
            }} />
          )
        })}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#8A8A95', textTransform: 'uppercase' }}>
        Step {step} / 3
      </span>
    </div>
  )
}
