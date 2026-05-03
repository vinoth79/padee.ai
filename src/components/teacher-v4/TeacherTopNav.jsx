// TeacherTopNav — v4 dark 58px bar matching teacher reference: Padee+TEACHER pill,
// pill nav (Command / Worksheet / Paper Mimic / Tests / Students / Review / Live class),
// search, then user chip with class info. Click user chip opens a popover with Logout.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUser } from '../../context/UserContext'
import PaMascot from '../home-v4/PaMascot'

// Review queue moved to /admin → "Flagged Review" tab. Teachers who need
// moderation access can use the admin password or get role=admin.
const NAV_ITEMS = [
  { id: 'command',   label: 'Command',     path: '/teacher',           icon: 'home' },
  { id: 'worksheet', label: 'Worksheet',   path: '/teacher/worksheet', icon: 'doc' },
  { id: 'mimic',     label: 'Paper Mimic', path: '/teacher/mimic',     icon: 'copy' },
  { id: 'test',      label: 'Tests',       path: '/teacher/test',      icon: 'check' },
  { id: 'students',  label: 'Students',    path: '/teacher/students',  icon: 'people' },
  { id: 'live',      label: 'Live class',  path: '/teacher/live',      icon: 'radio' },
]

function activeFromPath(pathname) {
  if (pathname === '/teacher') return 'command'
  if (pathname.includes('/worksheet')) return 'worksheet'
  if (pathname.includes('/mimic')) return 'mimic'
  if (pathname.includes('/test')) return 'test'
  if (pathname.includes('/students') || pathname.includes('/student/')) return 'students'
  if (pathname.includes('/live')) return 'live'
  return 'command'
}

function NavIcon({ name }) {
  const c = 'currentColor', s = 1.8
  switch (name) {
    case 'home':   return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>
    case 'doc':    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
    case 'copy':   return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    case 'check':  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    case 'people': return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'flag':   return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
    case 'radio':  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>
    default: return null
  }
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}

export default function TeacherTopNav({ badges = {} }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const user = useUser()

  const active = activeFromPath(location.pathname)
  const teacherName = user?.studentName || 'Teacher'
  const firstLast = teacherName.trim().split(/\s+/)
  const initials = (firstLast[0]?.[0] || 'T') + (firstLast[1]?.[0] || '')
  const classLabel = user?.studentClass ? `Class ${user.studentClass}` : 'All classes'
  const subjectLabel = (user?.selectedSubjects && user.selectedSubjects[0]) || 'Multi-subject'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    try {
      localStorage.removeItem('padee-user')
      localStorage.removeItem('padee-ask-ai-messages')
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="pd-topnav teacher">
      <button className="brand" onClick={() => navigate('/teacher')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
        <PaMascot size={28} mood="idle" />
        <span className="logo-text">Padee<span className="logo-ai">.ai</span></span>
        <span className="teacher-pill">TEACHER</span>
      </button>

      <div className="nav-pills">
        {NAV_ITEMS.map(it => {
          const badgeCount = it.badgeKey ? badges[it.badgeKey] : null
          return (
            <button key={it.id}
              className={`nav-pill ${it.id === active ? 'active' : ''}`}
              onClick={() => it.id !== active && navigate(it.path)}>
              <NavIcon name={it.icon} />
              <span>{it.label}</span>
              {badgeCount > 0 && <span className="nav-badge nav-badge-count">{badgeCount}</span>}
            </button>
          )
        })}
      </div>

      <button className="search-bar" onClick={() => navigate('/teacher/students')}>
        <SearchIcon />
        <span>Search students, questions…</span>
        <span className="cmdk">⌘K</span>
      </button>

      <div className="user-mini-wrap" ref={menuRef} style={{ position: 'relative' }}>
        <button className="user-mini"
          onClick={() => setMenuOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 11, flexShrink: 0,
          }}>{initials.toUpperCase()}</div>
          <div style={{ textAlign: 'left' }}>
            <div className="name">{firstLast[0]} {firstLast[1]?.[0] ? firstLast[1][0] + '.' : ''}</div>
            <div className="sub">{classLabel} · {subjectLabel}</div>
          </div>
        </button>

        {menuOpen && (
          <div className="user-menu" role="menu">
            <div className="user-menu-head">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#13131A' }}>{teacherName}</div>
              <div style={{ fontSize: 11, color: '#8A8A95', marginTop: 2 }}>{classLabel} · Teacher</div>
            </div>
            <button className="user-menu-item" role="menuitem"
              onClick={() => { setMenuOpen(false); navigate('/settings') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
            <div className="user-menu-divider" />
            <button className="user-menu-item is-danger" role="menuitem" onClick={handleLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
