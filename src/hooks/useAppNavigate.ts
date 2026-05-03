import { useNavigate } from 'react-router-dom'

const SCREEN_TO_PATH: Record<string, string> = {
  'home': '/home',
  'ask-ai': '/ask',
  'doubt': '/ask',
  'learn': '/learn',
  'practice': '/practice',
  'challenge': '/practice',
  'tests': '/tests',
  'test': '/tests/active',
  'test-results': '/tests/results',
  'me': '/progress',
  'progress': '/progress',
  'settings': '/settings',
  'jee-neet': '/progress',
  'parent-summary': '/progress',
  'teacher-dashboard': '/teacher',
  'worksheet': '/teacher/worksheet',
  'paper-mimic': '/teacher/mimic',
  'test-generator': '/teacher/test',
  'live-class': '/teacher/live',
  'students': '/teacher/students',
  'teacher-review': '/admin', // moderation queue lives in admin → Flagged Review tab
}

export function useAppNavigate() {
  const nav = useNavigate()
  return (screen: string, params?: Record<string, any>) => {
    // Special case: `student-profile` takes the studentId as a path segment,
    // not a query param (cleaner URLs + real route matching).
    if (screen === 'student-profile' && params?.studentId) {
      nav(`/teacher/student/${params.studentId}`, { state: params })
      return
    }

    let path = SCREEN_TO_PATH[screen] || '/home'
    // Append params as URL query string for reliability (location.state is flaky across nested routes)
    if (params) {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v != null) qs.set(k, String(v))
      }
      const qsStr = qs.toString()
      if (qsStr) path += `?${qsStr}`
    }
    nav(path, { state: params })
  }
}
