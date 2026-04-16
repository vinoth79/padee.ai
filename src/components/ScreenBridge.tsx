import { useEffect, ComponentType } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAppNavigate } from '../hooks/useAppNavigate'
import { useUser } from '../context/UserContext'

interface BridgeProps {
  Component: ComponentType<any>
  redirectTo?: string
  autoRedirect?: boolean
  isOnboarding?: boolean
}

export function ScreenBridge({ Component, redirectTo, autoRedirect, isOnboarding }: BridgeProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const appNavigate = useAppNavigate()
  const user = useUser()

  // Auto-redirect (for splash screen)
  useEffect(() => {
    if (autoRedirect && redirectTo) {
      const timer = setTimeout(() => {
        navigate(user.isOnboarded ? '/home' : redirectTo, { replace: true })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [autoRedirect, redirectTo, navigate, user.isOnboarded])

  // Onboarding completion handler
  const handleOnboardingComplete = (data?: any) => {
    user.setOnboarded(true)
    if (data?.isTeacher) {
      user.setTeacherMode(true)
      navigate('/teacher', { replace: true })
    } else {
      navigate('/home', { replace: true })
    }
  }

  // Splash done handler
  const handleSplashDone = () => {
    navigate(user.isOnboarded ? '/home' : '/onboarding', { replace: true })
  }

  // Standard onNavigate bridge
  const onNavigate = (screen: string, params?: Record<string, any>) => {
    appNavigate(screen, params)
  }

  // Pick the right props based on the component type
  if (isOnboarding) {
    return <Component onComplete={handleOnboardingComplete} />
  }

  if (autoRedirect) {
    return <Component onDone={handleSplashDone} />
  }

  return (
    <Component
      onNavigate={onNavigate}
      initialQuestion={location.state?.question || searchParams.get('question')}
      initialSubject={location.state?.subject || searchParams.get('subject')}
    />
  )
}
