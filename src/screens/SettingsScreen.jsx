// ═══════════════════════════════════════════════════════════════════════════
// SettingsScreen — change your daily pledge, study days, goal track, subjects.
// ═══════════════════════════════════════════════════════════════════════════
// Mounted at /settings. Reachable from:
//   • The user-chip dropdown in HomeTopNav (planned in this PR)
//   • The home Re-plan check-in banner ("Re-plan my week" CTA)
//
// Each section is independently editable + savable. Submitting one section
// doesn't disturb the others — relies on the partial-update-safe behaviour
// of /api/user/onboarding (any field absent from the body is preserved).
//
// Class + board are read-only here. They imply curriculum scope and
// changing them mid-year would invalidate XP/mastery — point to support.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { saveOnboarding } from '../services/api'
import HomeTopNav from '../components/home-v4/HomeTopNav'
import PaMascot from '../components/home-v4/PaMascot'
import Ico from '../components/home-v4/Ico'
import '../styles/home-v4.css'
import '../styles/settings-v4.css'

const PLEDGES = [
  { xp: 15,  label: 'Chill',      hint: '2-3 questions', estMinutes: 6 },
  { xp: 35,  label: 'Steady',     hint: '~15 min',       estMinutes: 15 },
  { xp: 60,  label: 'Serious',    hint: '30-40 min',     estMinutes: 35 },
  { xp: 100, label: 'Beast mode', hint: '1+ hour',       estMinutes: 60 },
]

const DAYS = [
  { code: 'mon', label: 'M' }, { code: 'tue', label: 'T' }, { code: 'wed', label: 'W' },
  { code: 'thu', label: 'T' }, { code: 'fri', label: 'F' }, { code: 'sat', label: 'S' },
  { code: 'sun', label: 'S' },
]

// Phase 1: only School Learning is supported. Others rendered as
// "Coming soon" — disabled, can't be picked, but visible on the roadmap.
const TRACKS = [
  { id: 'school', name: 'School Learning',  sub: 'Boards + daily classwork',  color: '#7C5CFF' },
  { id: 'jee',    name: 'JEE — Engineering', sub: 'Main + Advanced',          color: '#8A5A00', comingSoon: true },
  { id: 'neet',   name: 'NEET / Medical',    sub: 'Bio-focused · PCB',        color: '#0F7A4F', comingSoon: true },
  { id: 'ca',     name: 'CA Foundation',     sub: 'Accounts · Law · Econ',    color: '#1D47C4', comingSoon: true },
]

// Match the onboarding subject list (kept in sync with OnboardingSubjects.tsx)
const SUBJECTS_8_10 = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Sanskrit', 'Computer Science', '2nd Language']
const SUBJECTS_11_12 = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Computer Science', 'Hindi', 'Economics', 'Business Studies', 'Accounts']

export default function SettingsScreen({ onNavigate }) {
  const navigate = useNavigate()
  const user = useUser()
  const { token } = useAuth()
  const homeData = user.homeData

  // ─── Section state — initialised from server-truth on home-data load ───
  const [pledge, setPledge] = useState(35)
  const [days, setDays] = useState(['mon','tue','wed','thu','fri'])
  const [track, setTrack] = useState('school')
  const [subjects, setSubjects] = useState([])

  const [saving, setSaving] = useState(null)   // 'pledge' | 'days' | 'track' | 'subjects' | null
  const [savedAt, setSavedAt] = useState(null) // section name briefly highlighted after save

  useEffect(() => {
    if (!homeData?.profile) return
    const p = homeData.profile
    if (typeof p.daily_pledge_xp === 'number') setPledge(p.daily_pledge_xp)
    else if (homeData.dailyGoal) setPledge(homeData.dailyGoal)
    if (Array.isArray(homeData.studyDays) && homeData.studyDays.length > 0) {
      setDays(homeData.studyDays)
    }
    if (p.active_track) setTrack(p.active_track)
    if (Array.isArray(homeData.selectedSubjects)) setSubjects(homeData.selectedSubjects)
  }, [homeData])

  const klass = user.studentClass || 9
  const board = user.board || 'CBSE'
  const subjectChoices = klass <= 10 ? SUBJECTS_8_10 : SUBJECTS_11_12

  async function save(section, payload) {
    if (!token) return
    setSaving(section)
    try {
      await saveOnboarding(token, payload)
      await user.refreshUser?.()
      setSavedAt(section)
      setTimeout(() => setSavedAt(null), 2200)
    } catch (err) {
      console.error('[Settings] save failed:', err)
      alert('Could not save. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  function toggleDay(code) {
    setDays(prev => prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code])
  }

  function toggleSubject(s) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const pledgeOption = PLEDGES.find(p => p.xp === pledge) || PLEDGES[1]

  return (
    <div className="home-v4 settings-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeTopNav
        user={{ ...homeData?.profile, level: user.level }}
        streak={homeData?.streak?.current_streak || 0}
        onNavigate={onNavigate}
        active="settings"
      />

      <div className="pd-page">
        <div className="settings-page-head">
          <button className="settings-back" onClick={() => navigate(-1)}>
            <Ico name="chevronR" size={14} /> <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>›</span> Back
          </button>
          <h1 className="t-h1" style={{ marginTop: 4 }}>Settings</h1>
          <p className="t-sm" style={{ marginTop: 4 }}>
            Adjust how Pa works for you. Each section saves on its own.
          </p>
        </div>

        <div className="settings-grid">

          {/* ── Daily pledge ── */}
          <Section
            title="Daily pledge"
            subtitle="How much XP you aim to earn each pledged day."
            saving={saving === 'pledge'}
            saved={savedAt === 'pledge'}
            onSave={() => save('pledge', { dailyPledgeXp: pledge })}>
            <div className="pledge-grid">
              {PLEDGES.map(p => (
                <button key={p.xp} onClick={() => setPledge(p.xp)}
                  className={`pledge-tile ${pledge === p.xp ? 'is-active' : ''}`}>
                  <div className="pledge-xp">{p.xp}</div>
                  <div className="pledge-label">{p.label}</div>
                  <div className="pledge-hint">{p.hint}</div>
                </button>
              ))}
            </div>
            <p className="t-xs" style={{ marginTop: 12 }}>
              ~{pledgeOption.estMinutes} min/day. Lower it if you've been missing days — Pa won't judge.
            </p>
          </Section>

          {/* ── Study days ── */}
          <Section
            title="Study days"
            subtitle="Which days you'll show up. Other days are rest days — your streak doesn't break on them."
            saving={saving === 'days'}
            saved={savedAt === 'days'}
            onSave={() => save('days', { studyDays: days })}
            disabled={days.length === 0}>
            <div className="days-row">
              {DAYS.map(d => (
                <button key={d.code} onClick={() => toggleDay(d.code)}
                  className={`day-tile ${days.includes(d.code) ? 'is-active' : ''}`}>
                  {d.label}
                </button>
              ))}
            </div>
            <p className="t-xs" style={{ marginTop: 12 }}>
              <b>{days.length}</b> day{days.length === 1 ? '' : 's'} a week ·
              {' '}{pledgeOption.xp * days.length} XP target ·
              {' '}~{pledgeOption.estMinutes * days.length} min total.
            </p>
            {days.length === 0 && (
              <p className="t-xs" style={{ color: '#B2381B', marginTop: 6 }}>
                Pick at least one day before saving.
              </p>
            )}
          </Section>

          {/* ── Goal track ── */}
          <Section
            title="Main goal"
            subtitle="What you're really studying for. Pa adapts recommendations and exam prep accordingly."
            saving={saving === 'track'}
            saved={savedAt === 'track'}
            onSave={() => save('track', { track })}>
            <div className="track-grid">
              {TRACKS.map(t => {
                const disabled = !!t.comingSoon
                return (
                  <button key={t.id}
                    onClick={() => !disabled && setTrack(t.id)}
                    disabled={disabled}
                    className={`track-tile ${track === t.id ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
                    style={{ ['--track-color']: t.color }}>
                    <div className="track-name">{t.name}</div>
                    <div className="track-sub">{t.sub}</div>
                    {disabled
                      ? <span className="track-coming-soon">Coming soon</span>
                      : (
                        <span className="track-radio">
                          {track === t.id && <span className="track-radio-dot" />}
                        </span>
                      )
                    }
                  </button>
                )
              })}
            </div>
          </Section>

          {/* ── Subjects ── */}
          <Section
            title="Subjects"
            subtitle={`Class ${klass} ${board} — pick the subjects you actually study this year.`}
            saving={saving === 'subjects'}
            saved={savedAt === 'subjects'}
            onSave={() => save('subjects', { subjects })}
            disabled={subjects.length === 0}>
            <div className="subjects-chips">
              {subjectChoices.map(s => (
                <button key={s} onClick={() => toggleSubject(s)}
                  className={`subject-chip ${subjects.includes(s) ? 'is-active' : ''}`}>
                  <span className="subject-chip-tick">{subjects.includes(s) ? '✓' : '+'}</span>
                  {s}
                </button>
              ))}
            </div>
            <p className="t-xs" style={{ marginTop: 12 }}>
              <b>{subjects.length}</b> subject{subjects.length === 1 ? '' : 's'} selected.
            </p>
          </Section>

          {/* ── About you (read-only) ── */}
          <div className="settings-card">
            <div className="settings-card-head">
              <h2 className="settings-card-title">About you</h2>
              <span className="settings-card-readonly">Read-only</span>
            </div>
            <div className="about-grid">
              <AboutRow label="Name" value={homeData?.profile?.name || '—'} />
              <AboutRow label="Class" value={`Class ${klass}`} />
              <AboutRow label="Board" value={board} />
              <AboutRow label="Level" value={`Level ${user.level || 1} · ${user.levelName || 'Beginner'}`} />
            </div>
            <p className="t-xs" style={{ marginTop: 14 }}>
              Need to change your class or board? <a href="mailto:support@padee.ai" style={{ color: '#E85D3A', fontWeight: 600 }}>Contact support</a> — we'll reset your syllabus while preserving your XP.
            </p>
          </div>

          {/* ── Pa nudge ── */}
          <div className="settings-pa-nudge">
            <PaMascot size={42} mood="speaking" />
            <p>
              <b>Tip:</b> If you've been missing days, try lowering your pledge before lowering your days.
              Daily presence beats weekly heroics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable section card with save button ────────────────────────────
function Section({ title, subtitle, children, onSave, saving, saved, disabled }) {
  return (
    <div className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2 className="settings-card-title">{title}</h2>
          {subtitle && <p className="settings-card-sub">{subtitle}</p>}
        </div>
        <button className="settings-save-btn"
          onClick={onSave} disabled={saving || disabled}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      {children}
    </div>
  )
}

function AboutRow({ label, value }) {
  return (
    <div className="about-row">
      <span className="about-label">{label}</span>
      <span className="about-value">{value}</span>
    </div>
  )
}
