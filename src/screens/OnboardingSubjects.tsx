// ═══════════════════════════════════════════════════════════════════════════
// OnboardingSubjects — Step 2/3 (Apr 25 mockup).
// ═══════════════════════════════════════════════════════════════════════════
// Pa auto-selects the standard board subjects for the chosen class. Student
// can deselect what they don't study or add electives. Reset returns to the
// auto-selected defaults.
//
// Subject sets vary by class:
//   8-10: Maths, Science, English, Social Studies, Hindi (auto)
//         + Sanskrit, Computer Science, 2nd Language (optional)
//   11-12: Maths, Physics, Chemistry, English (auto, science default)
//          + Biology, Computer Science, Economics, Business Studies, Accounts (12 only)
//          + Hindi, 2nd Language (optional)
//
// Subject codes are stored verbatim as strings — backend matches them against
// ncert_uploads.subject and concept_catalog.subject.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useUser } from '../context/UserContext'
import PaMascot from '../components/home-v4/PaMascot'

interface SubjectDef {
  id: string
  display: string
  glyph: string
  tagline: string
  loadedTagline: string
  iconBg: string
  iconFg: string
  selectedBorder: string
  selectedBg: string
  selectedTick: string
  chapters: number
}

// ─── Subject palette (kid-friendly, matched to mockup colours) ────────────
const PALETTE: Record<string, Pick<SubjectDef, 'iconBg' | 'iconFg' | 'selectedBorder' | 'selectedBg' | 'selectedTick'>> = {
  purple: { iconBg: '#ECE5FF', iconFg: '#7C5CFF', selectedBorder: '#7C5CFF', selectedBg: '#fff',     selectedTick: '#7C5CFF' },
  coral:  { iconBg: '#FFE7DD', iconFg: '#E85D3A', selectedBorder: '#E85D3A', selectedBg: '#fff',     selectedTick: '#E85D3A' },
  green:  { iconBg: '#DDF6E9', iconFg: '#0F7A4F', selectedBorder: '#36D399', selectedBg: '#fff',     selectedTick: '#0F7A4F' },
  amber:  { iconBg: '#FFEFC9', iconFg: '#8A5A00', selectedBorder: '#FFB547', selectedBg: '#fff',     selectedTick: '#8A5A00' },
  pink:   { iconBg: '#FFE0EC', iconFg: '#A61E57', selectedBorder: '#FF4D8B', selectedBg: '#fff',     selectedTick: '#A61E57' },
  cyan:   { iconBg: '#D6F5FB', iconFg: '#0E6A82', selectedBorder: '#2BD3F5', selectedBg: '#fff',     selectedTick: '#0E6A82' },
  blue:   { iconBg: '#E0ECFF', iconFg: '#1D47C4', selectedBorder: '#4C7CFF', selectedBg: '#fff',     selectedTick: '#1D47C4' },
  rose:   { iconBg: '#FCE0E8', iconFg: '#A6234A', selectedBorder: '#E85D75', selectedBg: '#fff',     selectedTick: '#A6234A' },
}

// Subject set for Classes 8-10 — Science is taught as one combined subject.
const SET_MIDDLE: SubjectDef[] = [
  { id: 'Mathematics',     display: 'Mathematics',  glyph: '∠',  tagline: 'Algebra · Geometry · Trig',     loadedTagline: 'Algebra · Geometry · Trig',     chapters: 15, ...PALETTE.purple },
  { id: 'Science',         display: 'Science',      glyph: '✏', tagline: 'Physics · Chem · Bio',          loadedTagline: 'Physics · Chem · Bio',          chapters: 15, ...PALETTE.coral },
  { id: 'English',         display: 'English',      glyph: '📖', tagline: 'CBSE syllabus loaded',          loadedTagline: 'CBSE syllabus loaded',          chapters: 11, ...PALETTE.green },
  { id: 'Social Studies',  display: 'Social Studies', glyph: '🌍', tagline: 'CBSE syllabus loaded',        loadedTagline: 'CBSE syllabus loaded',          chapters: 23, ...PALETTE.amber },
  { id: 'Hindi',           display: 'Hindi',        glyph: 'क',  tagline: 'CBSE syllabus loaded',          loadedTagline: 'CBSE syllabus loaded',          chapters: 17, ...PALETTE.rose },
  { id: 'Sanskrit',        display: 'Sanskrit',     glyph: 'ॐ',  tagline: 'Tap to add',                    loadedTagline: 'CBSE syllabus loaded',          chapters: 18, ...PALETTE.purple },
  { id: 'Computer Science', display: 'Computer Sci', glyph: '💻', tagline: 'Tap to add',                   loadedTagline: 'CBSE syllabus loaded',          chapters: 8,  ...PALETTE.cyan },
  { id: '2nd Language',    display: '2nd Language', glyph: '💬', tagline: 'Tap to add',                    loadedTagline: 'CBSE syllabus loaded',          chapters: 12, ...PALETTE.pink },
]

// Subject set for Classes 11-12 — Science splits into Phy/Chem/Bio + Commerce options.
const SET_SENIOR: SubjectDef[] = [
  { id: 'Mathematics',     display: 'Mathematics',     glyph: '∠',  tagline: 'Algebra · Calculus · Stats', loadedTagline: 'Algebra · Calculus · Stats', chapters: 14, ...PALETTE.purple },
  { id: 'Physics',         display: 'Physics',         glyph: '⚡', tagline: 'NCERT + JEE concepts',       loadedTagline: 'NCERT + JEE concepts',       chapters: 15, ...PALETTE.blue },
  { id: 'Chemistry',       display: 'Chemistry',       glyph: '🧪', tagline: 'Organic + Physical + Inorganic', loadedTagline: 'Organic + Physical + Inorganic', chapters: 14, ...PALETTE.coral },
  { id: 'Biology',         display: 'Biology',         glyph: '🌿', tagline: 'NEET + boards',              loadedTagline: 'NEET + boards',              chapters: 16, ...PALETTE.green },
  { id: 'English',         display: 'English',         glyph: '📖', tagline: 'CBSE syllabus loaded',       loadedTagline: 'CBSE syllabus loaded',       chapters: 9,  ...PALETTE.green },
  { id: 'Computer Science', display: 'Computer Sci',   glyph: '💻', tagline: 'Tap to add',                 loadedTagline: 'CBSE syllabus loaded',       chapters: 12, ...PALETTE.cyan },
  { id: 'Economics',       display: 'Economics',       glyph: '📊', tagline: 'Tap to add',                 loadedTagline: 'CBSE syllabus loaded',       chapters: 10, ...PALETTE.amber },
  { id: 'Business Studies', display: 'Business Studies', glyph: '💼', tagline: 'Tap to add',               loadedTagline: 'CBSE syllabus loaded',       chapters: 12, ...PALETTE.purple },
  { id: 'Accounts',        display: 'Accounts',        glyph: '📋', tagline: 'Tap to add',                 loadedTagline: 'CBSE syllabus loaded',       chapters: 13, ...PALETTE.blue },
  { id: 'Hindi',           display: 'Hindi',           glyph: 'क',  tagline: 'Tap to add',                 loadedTagline: 'CBSE syllabus loaded',       chapters: 14, ...PALETTE.rose },
]

function getSubjects(klass: number): { all: SubjectDef[]; defaults: string[] } {
  if (klass <= 10) {
    return {
      all: SET_MIDDLE,
      defaults: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'],
    }
  }
  return {
    all: SET_SENIOR,
    defaults: ['Mathematics', 'Physics', 'Chemistry', 'English'], // science stream by default
  }
}

export default function OnboardingSubjects() {
  const navigate = useNavigate()
  const user = useUser()
  const klass = user.studentClass || 9
  const board = user.board || 'CBSE'

  const { all: subjects, defaults } = useMemo(() => getSubjects(klass), [klass])

  // First load: use saved selection if it exists; otherwise auto-select Pa's defaults
  const initialSelection = (user.selectedSubjects && user.selectedSubjects.length > 0)
    ? user.selectedSubjects
    : defaults
  const [selected, setSelected] = useState<string[]>(initialSelection)

  // Re-derive defaults when class changes (e.g. user goes Back → changes class → returns)
  useEffect(() => {
    if (!user.selectedSubjects || user.selectedSubjects.length === 0) {
      setSelected(defaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klass])

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function reset() {
    setSelected(defaults)
  }

  function handleNext() {
    if (selected.length === 0) return
    user.updateUser({ selectedSubjects: selected })
    navigate('/onboarding/track')
  }

  function handleSkip() {
    user.updateUser({ selectedSubjects: selected.length ? selected : defaults })
    navigate('/onboarding/track')
  }

  // Sum chapters across selected subjects for the footer count
  const chapterCount = subjects
    .filter(s => selected.includes(s.id))
    .reduce((sum, s) => sum + s.chapters, 0)

  return (
    <div style={{
      minHeight: '100vh', background: '#FAF8F4',
      fontFamily: "'Lexend Deca', -apple-system, system-ui, sans-serif",
      color: '#13131A', WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── Top nav ─── */}
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
            <StepIndicator step={2} />
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
          marginBottom: 24,
        }}>
          <PaMascot size={42} mood="speaking" />
          <p style={{ fontSize: 14, lineHeight: 1.55, color: '#5C3A00', margin: 0, flex: 1 }}>
            Great — <b>Class {klass} · {board}</b> locked in. Now pick every subject you study
            this year. I'll load the full chapter list so we're ready on day one.
          </p>
        </div>

        {/* Section label */}
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: '#E85D3A', textTransform: 'uppercase', marginBottom: 12,
        }}>
          Subjects · {selected.length} selected
        </p>

        {/* Subject grid */}
        <div className="grid gap-3 mb-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {subjects.map(s => {
            const isSelected = selected.includes(s.id)
            return (
              <button key={s.id} onClick={() => toggle(s.id)}
                className="active:scale-[0.98] transition-all relative"
                style={{
                  padding: 16, textAlign: 'left',
                  background: isSelected ? s.selectedBg : '#fff',
                  border: `1.5px solid ${isSelected ? s.selectedBorder : '#ECECEE'}`,
                  borderRadius: 16,
                  boxShadow: isSelected ? '0 6px 18px rgba(19,19,26,0.06)' : 'none',
                }}>
                <div className="flex items-start gap-3 mb-2.5">
                  <span style={{
                    width: 44, height: 44, borderRadius: 11,
                    background: s.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, lineHeight: 1,
                    color: s.iconFg,
                    flexShrink: 0,
                  }}>
                    {s.glyph}
                  </span>
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: isSelected ? '#13131A' : '#13131A',
                  marginBottom: 2,
                }}>
                  {s.display}
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: isSelected ? '#3A3A45' : '#8A8A95',
                  lineHeight: 1.4,
                }}>
                  {isSelected ? s.loadedTagline : s.tagline}
                </div>
                {isSelected && (
                  <span aria-hidden style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 22, height: 22, borderRadius: '50%',
                    background: s.selectedBorder,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckIcon />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Pa info banner */}
        <div style={{
          background: '#DDF6E9', border: '1px solid #5BB371',
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#36D399',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={16} color="#fff" />
          </span>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: '#0F5D33', margin: 0, flex: 1, minWidth: 220 }}>
            Pa auto-selected the <b>{defaults.length} standard {board} Class {klass} subjects</b>.
            Deselect what you don't study or add electives.
          </p>
          <button onClick={reset}
            className="active:scale-95 transition-transform"
            style={{
              fontSize: 13, fontWeight: 600, color: '#0F5D33',
              background: '#fff', border: '1px solid #5BB371',
              padding: '7px 16px', borderRadius: 10, cursor: 'pointer',
            }}>
            Reset
          </button>
        </div>
      </div>

      {/* ─── Sticky footer ─── */}
      <footer style={{
        background: '#fff', borderTop: '1px solid #ECECEE',
        position: 'sticky', bottom: 0, zIndex: 30,
      }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-7 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p style={{ fontSize: 13.5, color: '#3A3A45' }}>
            <b style={{ color: '#13131A' }}>{selected.length}</b> of {subjects.length} subjects
            <span style={{ color: '#8A8A95' }}> · {chapterCount} chapters loaded</span>
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/onboarding/class')}
              className="active:translate-y-[1px] transition-transform"
              style={{
                fontSize: 14, fontWeight: 600, color: '#3A3A45',
                background: '#fff', border: '1px solid #ECECEE',
                padding: '11px 18px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={handleNext} disabled={selected.length === 0}
              className="active:translate-y-[1px] transition-transform"
              style={{
                fontSize: 14, fontWeight: 600,
                background: selected.length > 0 ? '#E85D3A' : '#F1EDE2',
                color: selected.length > 0 ? '#fff' : '#B8B8C0',
                padding: '11px 20px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: selected.length > 0 ? '0 4px 0 #B2381B' : 'none',
                cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              }}>
              Next: Goals <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Atoms ──

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
              background: active || done ? '#E85D3A' : '#D1D1D6',
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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="4 12 10 18 20 6" />
    </svg>
  )
}
