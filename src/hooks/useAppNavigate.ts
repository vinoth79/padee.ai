import { useNavigate } from 'react-router-dom'

const SCREEN_TO_PATH: Record<string, string> = {
  'home': '/home',
  'ask-ai': '/ask',
  'doubt': '/ask',
  'learn': '/learn',
  'practice': '/practice',
  'challenge': '/practice',
  'test': '/tests/active',
  'test-results': '/tests/results',
  'me': '/progress',
  'progress': '/progress',
  'jee-neet': '/progress',
  'parent-summary': '/progress',
  'teacher-dashboard': '/teacher',
  'worksheet': '/teacher/worksheet',
  'test-generator': '/teacher/test',
  'live-class': '/teacher/live',
  'students': '/teacher/students',
}

export function useAppNavigate() {
  const nav = useNavigate()
  return (screen: string, params?: Record<string, any>) => {
    const path = SCREEN_TO_PATH[screen] || '/home'
    nav(path, { state: params })
  }
}
