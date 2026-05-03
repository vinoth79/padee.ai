// ═══════════════════════════════════════════════════════════════════════════
// RoleRoute — generalises ProtectedRoute with a role allowlist.
// ═══════════════════════════════════════════════════════════════════════════
// Usage:
//   <RoleRoute allowed={['school_admin']}><SchoolDashboardScreen /></RoleRoute>
//   <RoleRoute allowed={['parent']}><ParentDashboardScreen /></RoleRoute>
//   <RoleRoute allowed={['super_admin']}><SuperAdminScreen /></RoleRoute>
//
// Behaviour:
//   - Not authenticated → redirect to /login
//   - Authenticated but role not in `allowed` → redirect to /home
//     (a logged-in user landing on a forbidden URL is most likely a stale
//     bookmark; sending them to /home is friendlier than a 403 page).
//   - Profile not yet loaded → show same spinner as ProtectedRoute, don't
//     decide yet (avoids a flash-redirect on first paint).
// ═══════════════════════════════════════════════════════════════════════════
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUser } from '../../context/UserContext'

export function RoleRoute({ allowed, children }) {
  const { user, loading } = useAuth()
  const { profileLoaded, role } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-teal-500 text-sm">Loading your session…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  // Profile not yet hydrated. Show the same spinner — UserContext kicks off
  // a fetch on token-change so this state is brief (≤500ms typical).
  if (!profileLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-teal-500 text-sm">Loading your profile…</div>
      </div>
    )
  }

  if (!allowed.includes(role)) {
    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}
