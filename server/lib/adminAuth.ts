// ═══════════════════════════════════════════════════════════════════════════
// adminAuth — single source of truth for the admin/teacher password gate.
// ═══════════════════════════════════════════════════════════════════════════
// All four call sites (routes/admin.ts, routes/concepts.ts, routes/teacher.ts,
// routes/recommendations.ts) previously had their own
//
//     const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'padee-admin-2026'
//
// The fallback string is documented in the public CLAUDE.md, which means
// anyone who reads the repo (incl. via leaked git history) knows it. Worse,
// if ADMIN_PASSWORD is unset on Railway/Vercel — typo, missed env, fresh
// deploy — the entire admin panel + concept catalog mutation surface +
// teacher review queue + recommendation recompute open to anyone who
// guesses or reads the default.
//
// Fix: one shared helper, exported as a constant. Reads env at module load.
// If unset, throws — server refuses to start. Forces every environment to
// set ADMIN_PASSWORD explicitly, no silent fallback.
// ═══════════════════════════════════════════════════════════════════════════

if (!process.env.ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable is required. Set it in your .env or your hosting provider (Railway/Vercel) before starting the server.',
  )
}

export const ADMIN_PASSWORD: string = process.env.ADMIN_PASSWORD
