import { Home, MessageCircle, BookOpen, ClipboardList, Activity } from 'lucide-react'

const ACTIVE = '#0D9488'
const INACTIVE = '#9ca3af'

export function HomeIcon({ active }: { active: boolean }) {
  return <Home size={20} color={active ? ACTIVE : INACTIVE} strokeWidth={1.8} />
}
export function AskAIIcon({ active }: { active: boolean }) {
  return <MessageCircle size={20} color={active ? ACTIVE : INACTIVE} strokeWidth={1.8} />
}
export function LearnIcon({ active }: { active: boolean }) {
  return <BookOpen size={20} color={active ? ACTIVE : INACTIVE} strokeWidth={1.8} />
}
export function TestsIcon({ active }: { active: boolean }) {
  return <ClipboardList size={20} color={active ? ACTIVE : INACTIVE} strokeWidth={1.8} />
}
export function ProgressIcon({ active }: { active: boolean }) {
  return <Activity size={20} color={active ? ACTIVE : INACTIVE} strokeWidth={1.8} />
}
