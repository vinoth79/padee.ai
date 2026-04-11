import { useEffect } from 'react'

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-brand-primary to-brand-mid flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse-slow" />

      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center shadow-2xl">
            <span className="text-4xl animate-bounce-slow">🎓</span>
          </div>
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Padhi.ai</h1>
          <p className="text-brand-pale text-sm font-medium mt-1 tracking-wide">Your AI-powered CBSE study partner</p>
        </div>
      </div>

      {/* Loading bar */}
      <div className="absolute bottom-16 left-8 right-8 max-w-sm mx-auto">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/70 rounded-full animate-shimmer"
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)', backgroundSize: '200% 100%' }}
          />
        </div>
        <p className="text-brand-pale text-xs text-center mt-3 font-medium">Getting your study session ready...</p>
      </div>
    </div>
  )
}
