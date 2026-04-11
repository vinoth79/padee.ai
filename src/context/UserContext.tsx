import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Track = 'school' | 'jee' | 'neet' | 'ca'

interface UserState {
  studentName: string
  studentClass: number
  selectedSubjects: string[]
  activeTrack: Track
  xp: number
  level: number
  levelName: string
  streak: number
  dailyGoal: number
  dailyXPEarned: number
  examDate?: string
  examName?: string
  avatar: string
  school: string
  isOnboarded: boolean
  isTeacher: boolean
}

interface UserContextValue extends UserState {
  setTrack: (track: Track) => void
  setOnboarded: (v: boolean) => void
  setTeacherMode: (v: boolean) => void
  updateUser: (partial: Partial<UserState>) => void
}

const defaults: UserState = {
  studentName: 'Arjun Sharma',
  studentClass: 10,
  selectedSubjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science'],
  activeTrack: 'school',
  xp: 1840,
  level: 6,
  levelName: 'Scholar',
  streak: 7,
  dailyGoal: 50,
  dailyXPEarned: 35,
  avatar: 'AS',
  school: 'Delhi Public School, R.K. Puram',
  isOnboarded: false,
  isTeacher: false,
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>(() => {
    try {
      const saved = localStorage.getItem('padhi-user')
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    localStorage.setItem('padhi-user', JSON.stringify(user))
  }, [user])

  const value: UserContextValue = {
    ...user,
    setTrack: (track) => setUser(p => ({ ...p, activeTrack: track })),
    setOnboarded: (v) => setUser(p => ({ ...p, isOnboarded: v })),
    setTeacherMode: (v) => setUser(p => ({ ...p, isTeacher: v })),
    updateUser: (partial) => setUser(p => ({ ...p, ...partial })),
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be inside UserProvider')
  return ctx
}
