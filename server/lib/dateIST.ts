// ═══════════════════════════════════════════════════════════════════════════
// dateIST — IST-aware date helpers for student-facing day boundaries.
// ═══════════════════════════════════════════════════════════════════════════
// Padee's users are Indian K12 students. The "study day" boundary should be
// midnight IST (UTC+5:30), NOT midnight UTC. Without this, a student who
// studies at 1 AM IST gets credited to the previous UTC day — breaking
// streak detection, today's-XP calculations, and daily-cap logic.
//
// Two kinds of values to deal with:
//   1) IST date labels: "YYYY-MM-DD" strings stored in date-only columns
//      (e.g. student_streaks.last_active_date). These are timezone-free
//      labels — we just need to consistently use the *IST* calendar day.
//   2) UTC timestamps for filtering created_at columns. To filter rows
//      created "today in IST", we need the UTC ISO of IST 00:00:00.
//
// Helpers cover both, plus simple date-arithmetic on IST labels.
// ═══════════════════════════════════════════════════════════════════════════

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const WEEKDAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/**
 * Today's date in IST as "YYYY-MM-DD". Use for storing in date-only columns
 * like student_streaks.last_active_date.
 */
export function istTodayStr(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().split('T')[0]
}

/**
 * Lowercase weekday code ('mon'..'sun') for the current IST moment, or for
 * a specific IST date label.
 */
export function istWeekdayCode(now: Date = new Date()): string {
  return WEEKDAY_CODES[new Date(now.getTime() + IST_OFFSET_MS).getUTCDay()]
}

/**
 * Weekday code for a YYYY-MM-DD label (treats the label as an IST calendar
 * day — pure label arithmetic, no timezone shift).
 */
export function istWeekdayForDateStr(istDateStr: string): string {
  return WEEKDAY_CODES[new Date(istDateStr + 'T00:00:00Z').getUTCDay()]
}

/**
 * UTC ISO timestamp for the START of today's IST day (i.e. IST 00:00:00).
 * Use as the lower bound when filtering UTC-stored created_at columns.
 *
 *   .gte('created_at', istTodayStartUTC())
 */
export function istTodayStartUTC(now: Date = new Date()): string {
  const istToday = istTodayStr(now)
  // IST 00:00 of `istToday` = UTC midnight - 5.5h on the same Y-M-D label.
  // Reconstruct from the IST label: parse as UTC, subtract IST offset.
  const istMidnightUTC = new Date(istToday + 'T00:00:00Z').getTime() - IST_OFFSET_MS
  return new Date(istMidnightUTC).toISOString()
}

/**
 * UTC ISO timestamp for the END of today's IST day (= start of tomorrow IST).
 * Useful as exclusive upper bound: .lt('created_at', istTodayEndUTC())
 */
export function istTodayEndUTC(now: Date = new Date()): string {
  const istToday = istTodayStr(now)
  const istNextMidnightUTC = new Date(istToday + 'T00:00:00Z').getTime()
    - IST_OFFSET_MS + 24 * 60 * 60 * 1000
  return new Date(istNextMidnightUTC).toISOString()
}

/**
 * Add (or subtract) days to a YYYY-MM-DD label. Returns a new label.
 * Treats the input as a calendar-day label — no timezone shift.
 */
export function istDateAddDays(istDateStr: string, days: number): string {
  const d = new Date(istDateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Number of full days from one IST label to another (negative if `to` is
 * earlier). diff('2026-04-25', '2026-04-26') === 1.
 */
export function istDayDiff(fromStr: string, toStr: string): number {
  const a = new Date(fromStr + 'T00:00:00Z').getTime()
  const b = new Date(toStr + 'T00:00:00Z').getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

/**
 * Iterate IST date labels between `fromStr` and `toStr`, both EXCLUSIVE.
 * Returns an array (small N — fine for streak/missed-day windows).
 */
export function istDaysBetween(fromStr: string, toStr: string): string[] {
  const out: string[] = []
  let cursor = istDateAddDays(fromStr, 1)
  while (cursor < toStr) {
    out.push(cursor)
    cursor = istDateAddDays(cursor, 1)
  }
  return out
}
