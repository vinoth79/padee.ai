import { useEffect } from 'react'

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-violet-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl animate-pulse-slow" />

      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="text-5xl animate-bounce-slow">🎓</span>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-spin-slow">
            <span className="text-sm">✨</span>
          </div>
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">AI Tutor</h1>
          <p className="text-purple-200 text-sm font-medium mt-1 tracking-wide">Your AI Study Companion</p>
        </div>

        {/* Stars decoration */}
        <div className="flex gap-3 text-purple-300/60">
          {'✦ ✦ ✦'.split(' ').map((s, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.3}s` }} className="animate-pulse">{s}</span>
          ))}
        </div>
      </div>

      {/* Loading bar */}
      <div className="absolute bottom-16 left-8 right-8">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/70 rounded-full animate-shimmer"
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)', backgroundSize: '200% 100%' }}
          />
        </div>
        <p className="text-purple-300 text-xs text-center mt-3 font-medium">Loading your learning universe...</p>
      </div>
    </div>
  )
}
