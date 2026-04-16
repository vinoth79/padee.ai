import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function LoginScreen() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: 'student' } }  // role set to student by default; teacher role assigned via admin/invite later
        })
        if (error) throw error
        // After signup, the trigger creates profile + streak row
        // User needs to complete onboarding
        nav('/onboarding/class', { replace: true })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Check profile: role determines dashboard, class_level determines if onboarded
        const { data: profile } = await supabase
          .from('profiles')
          .select('class_level, role')
          .single()
        if (profile?.role === 'teacher') {
          nav('/teacher', { replace: true })
        } else if (profile?.role === 'parent') {
          nav('/parent', { replace: true })
        } else {
          nav(profile?.class_level ? '/home' : '/onboarding/class', { replace: true })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
      <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm">
        {/* Back to landing */}
        <button onClick={() => nav('/')}
          className="text-xs font-medium mb-4 flex items-center gap-1 text-gray-400 hover:text-teal-600 transition-colors">
          ← Back to home
        </button>
        {/* Logo */}
        <h1 className="text-2xl font-semibold text-teal-600 mb-1">Padee.ai</h1>
        <p className="text-sm text-gray-500 mb-6">Your AI study partner</p>

        {/* Login / Signup toggle */}
        <div className="flex gap-2 mb-6">
          {[false, true].map(s => (
            <button key={String(s)} onClick={() => setIsSignup(s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isSignup === s ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-400 hover:text-gray-600'}`}>
              {s ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />

          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" disabled={loading}
            className="bg-teal-600 text-white rounded-lg py-2 text-sm font-medium
              hover:bg-teal-700 disabled:opacity-50 transition-colors mt-1">
            {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Sign in')}
          </button>

          {!isSignup && (
            <button type="button" onClick={() => alert('Password reset will be available soon. Please contact support.')}
              className="text-xs text-gray-400 hover:text-teal-600 font-medium mt-2 text-center w-full">
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
