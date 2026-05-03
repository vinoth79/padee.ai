// ═══════════════════════════════════════════════════════════════════════════
// schoolAuth — multi-tenant auth helpers
// ═══════════════════════════════════════════════════════════════════════════
// Wraps the existing getUserFromToken() with school-aware role checks. Used
// by /api/school, /api/auth/redeem-invite, /api/super-admin, and (eventually)
// every teacher/admin endpoint that needs to enforce same-school scoping.
//
// All checks read the LIVE profile from Supabase — never trust a JWT-embedded
// claim. A user's role + school_id can change between login and request, and
// stale cached values are an exfil vector.
//
// Returns a discriminated union: either { error, status } (caller returns it
// directly with c.json(...)) or the profile fields the caller cares about.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase, getUserFromToken } from './supabase.js'

export type SchoolRole =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'admin'
  | 'school_admin'
  | 'super_admin'

export interface SchoolProfile {
  id: string
  role: SchoolRole
  school_id: string | null
  class_level: number | null
  name: string | null
  email: string | null
  tutor_language: 'en' | 'hi'
}

interface AuthError {
  error: string
  status: 401 | 403
}

interface AuthOk {
  userId: string
  profile: SchoolProfile
}

// Internal: load the full profile for the authenticated user.
async function loadProfile(authHeader: string | null | undefined):
  Promise<AuthError | AuthOk> {
  const u = await getUserFromToken(authHeader)
  if (!u) return { error: 'Unauthorized', status: 401 }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, school_id, class_level, name, email, tutor_language')
    .eq('id', u.id)
    .single()
  if (error || !data) return { error: 'Profile not found', status: 401 }
  return { userId: u.id, profile: data as SchoolProfile }
}

/**
 * Require any authenticated user. Returns profile or AuthError.
 * Replaces ad-hoc `getUserFromToken + select profile` boilerplate.
 */
export async function requireAuth(authHeader: string | null | undefined):
  Promise<AuthError | AuthOk> {
  return loadProfile(authHeader)
}

/**
 * Require the user has one of the allowed roles. Common patterns:
 *   requireRole(authHeader, ['school_admin'])
 *   requireRole(authHeader, ['teacher', 'school_admin', 'admin'])
 */
export async function requireRole(
  authHeader: string | null | undefined,
  allowed: SchoolRole[]
): Promise<AuthError | AuthOk> {
  const result = await loadProfile(authHeader)
  if ('error' in result) return result
  if (!allowed.includes(result.profile.role)) {
    return { error: 'Forbidden', status: 403 }
  }
  return result
}

/**
 * Require school_admin AND that they belong to a school. Used by /school/*
 * endpoints. School admins without a school_id (just-signed-up, pre-create)
 * use the unrestricted /school/create endpoint, not this guard.
 */
export async function requireSchoolAdmin(authHeader: string | null | undefined):
  Promise<AuthError | (AuthOk & { schoolId: string })> {
  const result = await loadProfile(authHeader)
  if ('error' in result) return result
  if (result.profile.role !== 'school_admin') {
    return { error: 'Forbidden — school admin only', status: 403 }
  }
  if (!result.profile.school_id) {
    return { error: 'No school provisioned yet — call /api/school/create first', status: 403 }
  }
  return { ...result, schoolId: result.profile.school_id }
}

/**
 * Require super_admin. Padee staff only. There is intentionally NO endpoint
 * to promote oneself to super_admin — promotion is a manual SQL operation
 * documented in DEPLOYMENT.md.
 */
export async function requireSuperAdmin(authHeader: string | null | undefined):
  Promise<AuthError | AuthOk> {
  return requireRole(authHeader, ['super_admin'])
}

/**
 * Verify two profiles share a school_id. Used by teacher endpoints to gate
 * cross-class queries inside their school, and to refuse cross-school reads.
 *
 * Returns true ONLY when both have the same NON-NULL school_id. A teacher
 * whose school_id is NULL (B2C teacher) cannot access any school-scoped
 * student through this check — they must rely on the legacy class_level
 * filter which is preserved.
 */
export function sameSchool(a: SchoolProfile | null, b: { school_id: string | null }): boolean {
  if (!a || !a.school_id || !b.school_id) return false
  return a.school_id === b.school_id
}

/**
 * Generate a 6-digit numeric invite code, retrying on collision.
 * Loops up to 50 times (collision rate at 100 schools ≈ 0.01%/try, so 50
 * attempts has effectively zero failure probability). The DB also has a
 * `generate_school_invite_code()` plpgsql function (migration 012) — this
 * is the JS twin so the code path stays in app code where the rest of the
 * insert lives.
 */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    const { data } = await supabase
      .from('schools')
      .select('id')
      .or(`invite_code_student.eq.${candidate},invite_code_teacher.eq.${candidate}`)
      .limit(1)
    if (!data || data.length === 0) return candidate
  }
  throw new Error('Could not generate unique invite code after 50 attempts')
}

/**
 * Generate an 8-char alphanumeric code (used for parent_student_links).
 * Uses crypto.randomBytes for cryptographic strength — these codes are
 * single-use auth tokens, not collision-prone identifiers.
 */
export async function generateLinkCode(): Promise<string> {
  const { randomBytes } = await import('node:crypto')
  // Base32 alphabet (no 0/1/I/O confusion)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}
