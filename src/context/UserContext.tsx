import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { useAuth } from './AuthContext'

export type Track = 'school' | 'jee' | 'neet' | 'ca'
export type Board = 'CBSE' | 'ICSE' | 'IGCSE' | 'IB' | 'STATE' | 'OTHER'

interface BadgeInfo { id: string; name: string; icon: string }

// v5 role expansion (migration 012). 'admin' = legacy ops admin (Vinoth /
// dev team). 'school_admin' = per-school admin. 'super_admin' = Padee staff.
export type Role = 'student' | 'teacher' | 'parent' | 'admin' | 'school_admin' | 'super_admin'

interface UserState {
  studentName: string
  studentClass: number
  board?: Board
  selectedSubjects: string[]
  activeTrack: Track
  xp: number
  level: number
  levelName: string
  levelMinXP: number
  nextLevelMinXP: number | null
  streak: number
  dailyGoal: number
  dailyXPEarned: number
  examDate?: string
  examName?: string
  avatar: string
  school: string
  isOnboarded: boolean
  isTeacher: boolean
  // ── v5 fields (Sprint 0) ──────────────────────────────────────────────
  // Raw role string. Use this for RoleRoute checks instead of isTeacher
  // (which is preserved for back-compat with existing screens).
  role: Role
  schoolId: string | null
  // 'en' | 'hi' — toggled in /settings, defaults 'en'. Drives the language
  // directive injected into doubt prompts and the TTS voice selection.
  tutorLanguage: 'en' | 'hi'
  // ──────────────────────────────────────────────────────────────────────
  profileLoaded: boolean
  mastery: { subject: string; accuracy_percent: number }[]
  badges: BadgeInfo[]
  homeData: any | null
}

interface CelebrationEvent {
  type: 'level_up' | 'badge_unlock'
  payload: any
}

interface UserContextValue extends UserState {
  setTrack: (track: Track) => void
  setOnboarded: (v: boolean) => void
  setTeacherMode: (v: boolean) => void
  updateUser: (partial: Partial<UserState>) => void
  refreshUser: () => Promise<void>
  // Celebration queue — consumed by <CelebrationHost />
  celebrations: CelebrationEvent[]
  dismissCelebration: () => void
}

const defaults: UserState = {
  studentName: 'Student',
  studentClass: 10,
  selectedSubjects: [],
  activeTrack: 'school',
  xp: 0,
  level: 1,
  levelName: 'Beginner',
  levelMinXP: 0,
  nextLevelMinXP: 200,
  streak: 0,
  dailyGoal: 50,
  dailyXPEarned: 0,
  avatar: 'S',
  school: '',
  isOnboarded: false,
  isTeacher: false,
  role: 'student',
  schoolId: null,
  tutorLanguage: 'en',
  profileLoaded: false,
  mastery: [],
  badges: [],
  homeData: null,
}

// XP thresholds — keep in sync with getLevelInfo() below
const LEVEL_TIERS = [
  { level: 1,  min: 0,     name: 'Beginner' },
  { level: 2,  min: 200,   name: 'Curious' },
  { level: 3,  min: 500,   name: 'Learner' },
  { level: 4,  min: 1000,  name: 'Explorer' },
  { level: 5,  min: 1600,  name: 'Achiever' },
  { level: 6,  min: 2400,  name: 'Scholar' },
  { level: 7,  min: 3500,  name: 'Advanced' },
  { level: 8,  min: 5000,  name: 'Expert' },
  { level: 9,  min: 7500,  name: 'Master' },
  { level: 10, min: 10000, name: 'Grandmaster' },
]

export function getLevelInfo(xp: number) {
  let current = LEVEL_TIERS[0]
  for (const t of LEVEL_TIERS) {
    if (xp >= t.min) current = t
    else break
  }
  const next = LEVEL_TIERS.find(t => t.level === current.level + 1) || null
  return {
    level: current.level,
    levelName: current.name,
    levelMinXP: current.min,
    nextLevelMinXP: next?.min ?? null,
  }
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [user, setUser] = useState<UserState>(() => {
    try {
      const saved = localStorage.getItem('padee-user')
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
    } catch { return defaults }
  })
  const [celebrations, setCelebrations] = useState<CelebrationEvent[]>([])

  // Track last-seen values so we only celebrate *new* achievements
  const prevLevelRef = useRef<number | null>(null)
  const seenBadgeIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef<boolean>(true)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('padee-user', JSON.stringify(user))
  }, [user])

  const applyHomeData = useCallback((data: any) => {
    const profile = data.profile
    if (!profile) return
    const totalXP = data.totalXP || 0
    const levelInfo = getLevelInfo(totalXP)
    const name = profile.name || profile.email?.split('@')[0] || 'Student'
    const incomingBadges: BadgeInfo[] = data.badges || []

    // Detect celebrations — skip on very first load (avoid replaying old unlocks)
    const queue: CelebrationEvent[] = []
    if (!isFirstLoadRef.current) {
      // Level-up
      if (prevLevelRef.current !== null && levelInfo.level > prevLevelRef.current) {
        queue.push({
          type: 'level_up',
          payload: {
            newLevel: levelInfo.level,
            levelName: levelInfo.levelName,
            prevLevel: prevLevelRef.current,
          },
        })
      }
      // Newly unlocked badges
      for (const b of incomingBadges) {
        if (!seenBadgeIdsRef.current.has(b.id)) {
          queue.push({ type: 'badge_unlock', payload: b })
        }
      }
    }

    // Update refs
    prevLevelRef.current = levelInfo.level
    seenBadgeIdsRef.current = new Set(incomingBadges.map(b => b.id))
    isFirstLoadRef.current = false

    setUser(prev => ({
      ...prev,
      studentName: name,
      studentClass: profile.class_level || prev.studentClass,
      board: (profile.board as Board) || prev.board,
      activeTrack: (profile.active_track as Track) || prev.activeTrack,
      xp: totalXP,
      ...levelInfo,
      streak: data.streak?.current_streak || 0,
      dailyXPEarned: data.todayXP || 0,
      dailyGoal: data.dailyGoal || 50,
      avatar: name.slice(0, 2).toUpperCase(),
      isOnboarded: !!profile.class_level,
      isTeacher: profile.role === 'teacher',
      // v5: surface raw role + multi-tenant + Hindi fields. profile.school
      // is the joined { id, name } object the backend hydrates (Sprint 0
      // adds it to /api/user/home-data — see server/routes/user.ts).
      role: (profile.role as Role) || 'student',
      schoolId: profile.school_id || null,
      school: profile.school?.name || prev.school,
      tutorLanguage: (profile.tutor_language as 'en' | 'hi') || 'en',
      profileLoaded: true,
      mastery: data.mastery || [],
      badges: incomingBadges,
      homeData: data,
    }))

    if (queue.length > 0) {
      setCelebrations(prev => [...prev, ...queue])
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch('/api/user/home-data', { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) return
      const data = await r.json()
      applyHomeData(data)
    } catch {}
  }, [token, applyHomeData])

  // Initial + on-token-change fetch
  useEffect(() => {
    if (!token) return
    refreshUser()
  }, [token, refreshUser])

  const dismissCelebration = useCallback(() => {
    setCelebrations(prev => prev.slice(1))
  }, [])

  const value: UserContextValue = {
    ...user,
    setTrack: (track) => setUser(p => ({ ...p, activeTrack: track })),
    setOnboarded: (v) => setUser(p => ({ ...p, isOnboarded: v })),
    setTeacherMode: (v) => setUser(p => ({ ...p, isTeacher: v })),
    updateUser: (partial) => setUser(p => ({ ...p, ...partial })),
    refreshUser,
    celebrations,
    dismissCelebration,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be inside UserProvider')
  return ctx
}
