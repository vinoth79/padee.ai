// ═══════════════════════════════════════════════════════════════════════════
// OnboardingTrack — Step 3/3 (Apr 25 mockup).
// ═══════════════════════════════════════════════════════════════════════════
// Captures three things and POSTs the full onboarding payload:
//   • Goal track (school | jee | neet | ca)
//   • Daily XP pledge (15/35/60/100 — Chill / Steady / Serious / Beast mode)
//   • Study days (any subset of mon-sun; defaults to Mon-Fri)
//
// The pledge XP becomes the student's personal daily goal (overrides the
// admin's config.dailyGoal). Migration 010 adds the columns.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Calculator, Sparkles, Stethoscope, Zap } from 'lucide-react'
import { useUser, Track } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { saveOnboarding } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'

interface GoalOption {
  id: Track
  name: string
  sub: string
  icon: any
  iconBg: string
  iconFg: string
  badge?: string
  comingSoon?: boolean
}

// Phase 1 supports School Learning only. JEE / NEET / CA are surfaced
// disabled with a "Coming soon" badge so the roadmap is visible.
const GOALS: GoalOption[] = [
  { id: 'school', name: 'School Learning',  sub: 'Boards + daily classwork', icon: BookOpen,    iconBg: '#ECE5FF', iconFg: '#7C5CFF', badge: 'Most students' },
  { id: 'jee',    name: 'JEE — Engineering', sub: 'Main + Advanced',          icon: Zap,         iconBg: '#FFEFC9', iconFg: '#8A5A00', comingSoon: true },
  { id: 'neet',   name: 'NEET / Medical',    sub: 'Bio-focused · PCB',        icon: Stethoscope, iconBg: '#DDF6E9', iconFg: '#0F7A4F', comingSoon: true },
  { id: 'ca',     name: 'CA Foundation',     sub: 'Accounts · Law · Econ',    icon: Calculator,  iconBg: '#E0ECFF', iconFg: '#1D47C4', comingSoon: true },
]

interface PledgeOption {
  xp: number
  label: string
  hint: string
  estMinutes: number
}

const PLEDGES: PledgeOption[] = [
  { xp: 15,  label: 'Chill',      hint: '2-3 questions', estMinutes: 6 },
  { xp: 35,  label: 'Steady',     hint: '~15 min',       estMinutes: 15 },
  { xp: 60,  label: 'Serious',    hint: '30-40 min',     estMinutes: 35 },
  { xp: 100, label: 'Beast mode', hint: '1+ hour',       estMinutes: 60 },
]

const DAYS: Array<{ code: string; label: string }> = [
  { code: 'mon', label: 'M' },
  { code: 'tue', label: 'T' },
  { code: 'wed', label: 'W' },
  { code: 'thu', label: 'T' },
  { code: 'fri', label: 'F' },
  { code: 'sat', label: 'S' },
  { code: 'sun', label: 'S' },
]

const DEFAULT_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']

export default function OnboardingTrack() {
  const navigate = useNavigate()
  const user = useUser()
  const { token } = useAuth()

  const [goal, setGoal] = useState<Track>(user.activeTrack || 'school')
  const [pledgeXp, setPledgeXp] = useState<number>(35)
  const [days, setDays] = useState<string[]>(DEFAULT_DAYS)
  const [saving, setSaving] = useState(false)

  const pledge = PLEDGES.find(p => p.xp === pledgeXp)!
  const totalWeeklyXp = pledge.xp * days.length
  const totalWeeklyMin = pledge.estMinutes * days.length

  const goalName = useMemo(() => GOALS.find(g => g.id === goal)?.name || 'School Learning', [goal])

  function toggleDay(code: string) {
    setDays(prev => prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code])
  }

  async function handleFinish() {
    if (!token || saving) return
    setSaving(true)
    try {
      await saveOnboarding(token, {
        className: user.studentClass,
        board: user.board,
        subjects: user.selectedSubjects,
        track: goal,
        dailyPledgeXp: pledgeXp,
        studyDays: days,
      })
    } catch (err) {
      console.warn('Onboarding save failed (proceeding anyway):', err)
      // Don't block — localStorage already has the data; user can retry on home
    }
    user.updateUser({
      activeTrack: goal,
      isOnboarded: true,
      dailyGoal: pledgeXp, // home reads this from context until refresh
    })
    navigate('/home', { replace: true })
  }

  function handleSkip() {
    handleFinish()
  }

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
            <StepIndicator step={3} />
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
            <b>Last step!</b> What are you <b>really</b> studying for — and how much effort can
            you promise me per day? Don't over-pledge. I'd rather see you show up daily than
            burn out Tuesday.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-[1fr_1.05fr]">

          {/* ── LEFT: Goal picker ── */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              color: '#E85D3A', textTransform: 'uppercase', marginBottom: 12,
            }}>
              What's your main goal?
            </p>

            <div className="space-y-3">
              {GOALS.map(g => {
                const Icon = g.icon
                const selected = goal === g.id
                const disabled = !!g.comingSoon
                return (
                  <button key={g.id} onClick={() => !disabled && setGoal(g.id)}
                    disabled={disabled}
                    className={disabled ? 'transition-all' : 'w-full active:scale-[0.99] transition-all'}
                    aria-disabled={disabled}
                    style={{
                      width: '100%',
                      padding: 14, textAlign: 'left',
                      background: '#fff',
                      border: `1.5px solid ${selected ? '#7C5CFF' : '#ECECEE'}`,
                      borderRadius: 14,
                      display: 'flex', alignItems: 'center', gap: 14,
                      boxShadow: selected ? '0 6px 18px rgba(124,92,255,0.10)' : 'none',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.55 : 1,
                    }}>
                    <span style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: g.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      filter: disabled ? 'grayscale(0.4)' : 'none',
                    }}>
                      <Icon size={20} color={g.iconFg} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#13131A' }}>{g.name}</span>
                        {g.badge && !disabled && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                            background: '#13131A', color: '#fff',
                            padding: '3px 8px', borderRadius: 999,
                          }}>
                            {g.badge}
                          </span>
                        )}
                        {disabled && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                            background: '#FFEFC9', color: '#8A5A00',
                            border: '1px solid #F6D98A',
                            padding: '2px 8px', borderRadius: 999,
                          }}>
                            Coming soon
                          </span>
                        )}
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: '#8A8A95', marginTop: 2 }}>
                        {g.sub}
                      </span>
                    </span>
                    {!disabled && (
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${selected ? '#7C5CFF' : '#D1D1D6'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {selected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#7C5CFF' }} />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <p style={{ fontSize: 12, color: '#8A8A95', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              You can add another track later — e.g. School + JEE prep from Class 10.
            </p>
          </div>

          {/* ── RIGHT: Dark pledge panel ── */}
          <div style={{
            background: '#13131A', color: '#fff',
            borderRadius: 18, padding: 22,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              color: '#FFB547', textTransform: 'uppercase', marginBottom: 6,
            }}>
              Your daily pledge
            </p>
            <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.25, marginBottom: 14 }}>
              How much XP per day do you pledge?
            </h3>

            {/* XP option grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
              {PLEDGES.map(p => {
                const selected = pledgeXp === p.xp
                return (
                  <button key={p.xp} onClick={() => setPledgeXp(p.xp)}
                    className="active:scale-[0.97] transition-all"
                    style={{
                      padding: '14px 10px', textAlign: 'center',
                      background: selected ? '#E85D3A' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selected ? '#E85D3A' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12,
                      color: '#fff',
                    }}>
                    <div style={{
                      fontSize: 26, fontWeight: 700, lineHeight: 1,
                      letterSpacing: '-0.4px',
                      color: '#fff',
                    }}>
                      {p.xp}
                    </div>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600,
                      color: selected ? '#fff' : 'rgba(255,255,255,0.85)',
                      marginTop: 6,
                    }}>
                      {p.label}
                    </div>
                    <div style={{
                      fontSize: 10.5,
                      color: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                      marginTop: 2,
                    }}>
                      {p.hint}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Days picker */}
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              color: '#FFB547', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Which days?
            </p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {DAYS.map(d => {
                const selected = days.includes(d.code)
                return (
                  <button key={d.code} onClick={() => toggleDay(d.code)}
                    className="active:scale-95 transition-transform"
                    style={{
                      width: 46, height: 46, borderRadius: 10,
                      background: selected ? '#FFB547' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selected ? '#FFB547' : 'rgba(255,255,255,0.08)'}`,
                      color: selected ? '#5C3A00' : 'rgba(255,255,255,0.5)',
                      fontSize: 15, fontWeight: 700,
                    }}>
                    {d.label}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <b style={{ color: '#fff' }}>{days.length} day{days.length !== 1 ? 's' : ''} a week</b>
              {' · '}{totalWeeklyXp} XP target · ~{totalWeeklyMin} min total
            </p>

            {/* Streak warning */}
            <div style={{
              marginTop: 22,
              background: 'rgba(232,93,58,0.12)',
              border: '1px solid rgba(232,93,58,0.35)',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1.2 }}>🔥</span>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                <b style={{ color: '#fff' }}>Your streak starts tomorrow.</b>{' '}
                Miss a pledged day and Pa hits pause — no judgement.
                Skip 3 and I'll check in to re-plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sticky footer ─── */}
      <footer style={{
        background: '#fff', borderTop: '1px solid #ECECEE',
        position: 'sticky', bottom: 0, zIndex: 30,
      }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-7 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p style={{ fontSize: 13.5, color: '#3A3A45' }}>
            Ready: <b style={{ color: '#13131A' }}>{goalName}</b>
            {' · '}{pledgeXp} XP/day · {days.length} day{days.length !== 1 ? 's' : ''}/week
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/onboarding/subjects')}
              className="active:translate-y-[1px] transition-transform"
              style={{
                fontSize: 14, fontWeight: 600, color: '#3A3A45',
                background: '#fff', border: '1px solid #ECECEE',
                padding: '11px 18px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={handleFinish} disabled={saving}
              className="active:translate-y-[1px] transition-transform"
              style={{
                fontSize: 14, fontWeight: 600,
                background: '#E85D3A', color: '#fff',
                padding: '11px 22px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 0 #B2381B',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
              <Sparkles size={14} />
              {saving ? 'Building plan…' : 'Build my plan & go home'}
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
