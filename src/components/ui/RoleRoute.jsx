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
//   - Authenticated but role not in `allowed` → redirect to that role's
//     OWN home (school_admin → /school, super_admin → /super-admin, etc.)
//     so a school_admin landing on a student-only URL doesn't see the
//     student page.
//   - Profile not yet loaded → show same spinner as ProtectedRoute, don't
//     decide yet (avoids a flash-redirect on first paint).
//
// Also exports <HomeForRole /> — a route element used at /home that
// inspects the user's role and redirects non-students to their correct
// home before rendering the student dashboard. Without this, school_admin
// users typing /home in the URL bar would see the student dashboard
// despite having a different role.
// ═══════════════════════════════════════════════════════════════════════════
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUser } from '../../context/UserContext'

/**
 * Where a given role's "home" should be. Mirrors LoginScreen.routeByRole
 * for users who already have a school_id / completed onboarding.
 */
export function homeForRole(role, schoolId) {
  switch (role) {
    case 'teacher':      return schoolId ? '/teacher' : '/onboarding/invite-code'
    case 'parent':       return '/parent'
    case 'school_admin': return schoolId ? '/school' : '/onboarding/school'
    case 'super_admin':  return '/super-admin'
    case 'admin':        return '/admin'
    // 'student' (default)
    default:             return '/home'
  }
}

function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse text-teal-500 text-sm">{label}</div>
    </div>
  )
}

export function RoleRoute({ allowed, children }) {
  const { user, loading } = useAuth()
  const { profileLoaded, role, schoolId } = useUser()

  if (loading) return <Spinner label="Loading your session…" />
  if (!user) return <Navigate to="/login" replace />

  // Profile not yet hydrated. Show the same spinner — UserContext kicks off
  // a fetch on token-change so this state is brief (≤500ms typical).
  if (!profileLoaded) return <Spinner label="Loading your profile…" />

  if (!allowed.includes(role)) {
    return <Navigate to={homeForRole(role, schoolId)} replace />
  }
  return <>{children}</>
}

/**
 * Used at /home to redirect non-students (school_admin, parent, etc.) to
 * their own dashboard before rendering the student home.
 *
 * Renders `children` for students and B2C-default users. Redirects others.
 */
export function HomeForRole({ children }) {
  const { user, loading } = useAuth()
  const { profileLoaded, role, schoolId } = useUser()

  if (loading) return <Spinner label="Loading your session…" />
  if (!user) return <Navigate to="/login" replace />
  if (!profileLoaded) return <Spinner label="Loading your profile…" />

  // Student or anything we don't recognise → render the student home.
  // (Default fallback is more forgiving than redirecting to a 404 / loop.)
  if (role === 'student' || !role) return <>{children}</>

  // Everyone else → role-specific home.
  return <Navigate to={homeForRole(role, schoolId)} replace />
}
