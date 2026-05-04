// ═══════════════════════════════════════════════════════════════════════════
// SignupScreen — v4 redesign (Apr 25 mockup), v5 Sprint 1 expansion.
// ═══════════════════════════════════════════════════════════════════════════
// Layout: two-column on desktop. Left = role picker (Student/Parent/Teacher/
// School admin — v5 Sprint 1 added the 4th tile) + invite-code tip. Right =
// create-account form (with optional invite-code field for student/teacher).
// Top-right swap to /login.
//
// Behavior: signs up via supabase.auth.signUp with role in user_metadata.
// The auth-trigger creates the profile row server-side. Post-signup routing:
//   school_admin → /onboarding/school (provision school + see codes)
//   teacher      → /teacher (or /onboarding/invite-code if invite-code field
//                  was left blank — gives them a chance to join a school)
//   parent       → /parent
//   student      → /onboarding/class (or auto-redeem code first, then
//                  /onboarding/class continues)
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Heart, Users, School } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { authApi } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'

type Role = 'student' | 'parent' | 'teacher' | 'school_admin'

const ROLES: Array<{
  id: Role; title: string; subtitle: string; icon: any;
  iconBg: string; iconFg: string; selectedBorder: string; selectedBg: string;
}> = [
  { id: 'student', title: 'Student', subtitle: 'I want to study',
    icon: BookOpen, iconBg: '#E85D3A', iconFg: '#fff',
    selectedBorder: '#E85D3A', selectedBg: '#FFE7DD' },
  { id: 'parent', title: 'Parent', subtitle: 'Track my child',
    icon: Heart, iconBg: '#FFE0EC', iconFg: '#FF4D8B',
    selectedBorder: '#FF4D8B', selectedBg: '#FFE0EC' },
  { id: 'teacher', title: 'Teacher', subtitle: 'Run my class',
    icon: Users, iconBg: '#ECE5FF', iconFg: '#7C5CFF',
    selectedBorder: '#7C5CFF', selectedBg: '#ECE5FF' },
  { id: 'school_admin', title: 'Create school', subtitle: 'Onboard my whole school',
    icon: School, iconBg: '#FFEFC9', iconFg: '#6B4B00',
    selectedBorder: '#FFB547', selectedBg: '#FFEFC9' },
]

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#ECECEE' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 12) score++
  const labels = ['', 'Weak', 'OK', 'Good', 'Strong']
  const colors = ['#ECECEE', '#E85D75', '#FFB547', '#5BB371', '#36D399']
  return { score, label: labels[score], color: colors[score] }
}

export default function SignupScreen() {
  const nav = useNavigate()
  const [role, setRole] = useState<Role>('student')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')   // v5: optional school code (student / teacher)
  const [agree, setAgree] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => passwordStrength(password), [password])
  const canSubmit = firstName.trim() && email && password.length >= 8 && agree && !loading

  // Show invite-code field for student + teacher (B2B onboarding path).
  // Hidden for parent (no school flow) and school_admin (they'll create one).
  const showInviteCodeField = role === 'student' || role === 'teacher'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!canSubmit) return
    setLoading(true)
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, full_name: fullName } },
      })
      if (error) throw error

      // v5: if a code was provided (student/teacher path), redeem it now.
      // Auto-confirm is enabled per CLAUDE.md, so the session is live and
      // we can call /api/auth/redeem-invite immediately.
      const cleanCode = inviteCode.replace(/\D+/g, '')
      if (showInviteCodeField && cleanCode.length === 6 && data.session?.access_token) {
        try {
          const redeemed = await authApi.redeemInvite(data.session.access_token, cleanCode)
          // Server may have promoted student → teacher if a teacher code was used
          if (redeemed.role === 'teacher') {
            nav('/teacher', { replace: true })
            return
          }
        } catch (redeemErr: any) {
          // Soft-fail: account is created, just code didn't match. Surface
          // the error but proceed with onboarding so the user isn't stuck.
          console.warn('[signup] invite-code redemption failed:', redeemErr?.message)
          setError(`Account created, but ${redeemErr?.message || 'code didn\'t match'}. Try the code again from Settings.`)
          // Fall through to default routing below
        }
      }

      // Profile row is created by the auth trigger. Route by role.
      if (role === 'school_admin') nav('/onboarding/school', { replace: true })
      else if (role === 'teacher') {
        // Teacher with no code → give them a chance to join a school via /onboarding/invite-code
        nav(cleanCode.length === 6 ? '/teacher' : '/onboarding/invite-code', { replace: true })
      }
      else if (role === 'parent') nav('/parent', { replace: true })
      else nav('/onboarding/class', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    setError('Google sign-up is coming soon — please use email + password for now.')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAF8F4',
      fontFamily: "'Lexend Deca', -apple-system, system-ui, sans-serif",
      color: '#13131A',
      WebkitFontSmoothing: 'antialiased',
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
          <button onClick={() => nav('/')} className="flex items-center gap-2.5">
            <PaMascot size={32} mood="idle" />
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Padee<span style={{ color: '#E85D3A' }}>.ai</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 13, color: '#8A8A95' }}>Already here?</span>
            <button onClick={() => nav('/login')}
              style={{
                fontSize: 14, fontWeight: 600, color: '#13131A',
                background: '#F1EDE2',
                padding: '9px 16px', borderRadius: 12,
              }}>
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 lg:py-14
            grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">

          {/* ── LEFT: role picker ── */}
          <div>
            <div className="flex items-start gap-3 mb-5">
              <PaMascot size={56} mood="idle" />
              <div>
                <p style={{
                  fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
                  color: '#E85D3A', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  Step 0 · Pick your role
                </p>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                  Who's signing up?
                </h1>
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.55, color: '#3A3A45', marginBottom: 22, maxWidth: 460 }}>
              Padee works for students, parents, and teachers — but the home page looks
              very different for each. Pick yours so I know what to build.
            </p>

            <div className="space-y-3" style={{ maxWidth: 460 }}>
              {ROLES.map(r => {
                const Icon = r.icon
                const selected = role === r.id
                return (
                  <button key={r.id} onClick={() => setRole(r.id)}
                    className="w-full flex items-center gap-3.5 active:scale-[0.99] transition-all"
                    style={{
                      padding: 14,
                      background: selected ? r.selectedBg : '#fff',
                      border: `1.5px solid ${selected ? r.selectedBorder : '#ECECEE'}`,
                      borderRadius: 14, textAlign: 'left',
                    }}>
                    <span style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: r.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={20} color={r.iconFg} fill={r.id === 'parent' ? r.iconFg : 'none'} />
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#13131A' }}>
                        {r.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 13, color: '#8A8A95', marginTop: 1 }}>
                        {r.subtitle}
                      </span>
                    </span>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${selected ? r.selectedBorder : '#D1D1D6'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.selectedBorder }} />}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Invite-code tip pill */}
            <div style={{
              marginTop: 22,
              background: '#FFEFC9', border: '1px solid #F6D98A',
              borderRadius: 14, padding: '12px 16px',
              maxWidth: 460,
            }}>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: '#6B4B00' }}>
                <b>Tip:</b> If your school signed up for Padee, ask your teacher
                for an invite code — it skips onboarding.
              </p>
            </div>
          </div>

          {/* ── RIGHT: account form ── */}
          <div>
            <p style={{
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
              color: '#8A8A95', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Role · {role}
            </p>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.6px', marginBottom: 6 }}>
              Create your account
            </h2>
            <p style={{ fontSize: 14, color: '#8A8A95', marginBottom: 22 }}>
              Free forever. No credit card. 30 seconds.
            </p>

            <button onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 active:scale-[0.99] transition-transform"
              style={{
                background: '#fff', border: '1px solid #ECECEE',
                borderRadius: 12, padding: '12px 16px',
                fontSize: 14, fontWeight: 600, color: '#13131A',
              }}>
              <GoogleIcon />
              Sign up with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div style={{ flex: 1, height: 1, background: '#ECECEE' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#B8B8C0', letterSpacing: '0.1em' }}>OR FILL IN</span>
              <div style={{ flex: 1, height: 1, background: '#ECECEE' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Aarav" required autoComplete="given-name" />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Kumar" autoComplete="family-name" />
                </div>
              </div>

              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="aarav.kumar@dps-rkp.edu.in" required autoComplete="email" />

              <div className="flex items-center justify-between mt-3.5 mb-1.5">
                <Label inline>Password</Label>
                <span style={{ fontSize: 11, color: '#8A8A95' }}>· min 8 chars</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Input type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••" required minLength={8}
                  autoComplete="new-password" />
                {strength.label && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em',
                    color: strength.color,
                  }}>
                    {strength.label}
                  </span>
                )}
              </div>

              {/* Strength bars */}
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength.score ? strength.color : '#ECECEE',
                    transition: 'background 0.2s ease',
                  }} />
                ))}
              </div>

              {/* v5: invite-code field — student + teacher only.
                  Optional. Skipping makes them a B2C user who can join a
                  school later via /onboarding/invite-code or settings. */}
              {showInviteCodeField && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em',
                    color: '#8A8A95', textTransform: 'uppercase', marginBottom: 8,
                  }}>
                    Are you part of a school?
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code (optional)"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    maxLength={9}     /* 6 digits + 1 hyphen + slack */
                    autoComplete="one-time-code"
                  />
                  <span style={{
                    display: 'block', fontSize: 12, color: '#8A8A95',
                    marginTop: 6, lineHeight: 1.5,
                  }}>
                    Skip if you're learning on your own.
                  </span>
                </div>
              )}

              {/* Terms checkbox */}
              <label className="flex items-start gap-2.5 mt-5 cursor-pointer">
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: agree ? '#E85D3A' : '#fff',
                  border: agree ? 'none' : '1.5px solid #B8B8C0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {agree && <CheckIcon />}
                </span>
                <input type="checkbox" checked={agree}
                  onChange={e => setAgree(e.target.checked)} style={{ display: 'none' }} />
                <span style={{ fontSize: 13, color: '#3A3A45', lineHeight: 1.5 }}>
                  I'm a Class 8-12 student (or parent of one). My parent/guardian has read{' '}
                  <a href="/terms" style={{ color: '#E85D3A', fontWeight: 600 }}>Padee's Terms</a>{' '}
                  and{' '}
                  <a href="/privacy" style={{ color: '#E85D3A', fontWeight: 600 }}>Privacy Policy</a>{' '}
                  and consents to my study data being used to personalise learning.
                </span>
              </label>

              {error && (
                <p style={{
                  fontSize: 12.5, color: '#E85D3A', marginTop: 14,
                  background: '#FFE7DD', padding: '8px 12px', borderRadius: 8,
                }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={!canSubmit}
                className="w-full active:translate-y-[1px] transition-transform"
                style={{
                  marginTop: 16,
                  background: canSubmit ? '#E85D3A' : '#F1EDE2',
                  color: canSubmit ? '#fff' : '#B8B8C0',
                  borderRadius: 12, padding: '14px 18px',
                  fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: canSubmit ? '0 4px 0 #B2381B' : 'none',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}>
                {loading ? 'Creating account…' : <>Create account &amp; meet Pa <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline atoms ──

function Label({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      color: '#8A8A95', textTransform: 'uppercase',
      display: 'block', marginBottom: inline ? 0 : 6,
    }}>
      {children}
    </span>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      style={{
        width: '100%',
        padding: '12px 14px', borderRadius: 10,
        border: '1px solid #ECECEE', background: '#fff',
        fontSize: 14, fontFamily: 'inherit', color: '#13131A',
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = '#E85D3A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,93,58,0.15)' }}
      onBlur={e => { e.currentTarget.style.borderColor = '#ECECEE'; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.7 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.4-4.3 5.9l6.3 5.3c-.4.4 6.7-4.9 6.7-15.2 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 12 10 18 20 6" />
    </svg>
  )
}
