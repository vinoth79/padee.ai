# Designer Brief — Padee.ai v5

**For**: external designer / design partner
**From**: Vinoth (founder)
**Status**: Sprint 1 hi-fi needed by [date — fill in based on engineering Sprint 1 start]
**Project context**: 5 pre-existing reference docs; this brief tells you what to read in what order and what to deliver.

---

## What you're walking into

Padee.ai is an AI-first K12 learning platform for India (CBSE Classes 8–12).
The student-side v4 visual system is **already shipped and live** — your job
is **not** to redesign it. Your job is to extend it to 8 new screens for
v5, which adds:

- B2B school onboarding (multi-tenant)
- Parent dashboard
- Hindi tutoring toggle
- Coding subject support
- Super admin (Padee staff) dashboard

Stay inside the existing v4 design system. **No new visual language.**

---

## Read these in order

| # | File | Why |
|---|---|---|
| 1 | `Padee_UI_Spec_v3.pdf` | The 19+1 v4 screens that exist today. This is the visual baseline. |
| 2 | `CLAUDE.md` (§ "Design system (v4)") | Tokens, type scale, font families, voice/tone. |
| 3 | `src/styles/home-v4.css` (top 80 lines) | The actual CSS variables you'll be working with. |
| 4 | `PRD_v5.md` | What we're building and why. Skim §1–4 + §F1–F7 (per-feature spec). |
| 5 | `UI_SPEC_v5.md` | **The brief.** Wireframes, components, microcopy, mobile notes — everything you'll be expanding into hi-fi. |

If you only read one, read **`UI_SPEC_v5.md`** — it's the working brief. The
others are context.

---

## What we need from you

### Sprint 1 (priority — engineering kicks off this in 1 week)

Hi-fi mocks for **5 screens + 4 components**:

1. `/signup` (modified — 4-tile role picker including "Create school")
2. `/onboarding/school` — both states (form, codes-ready)
3. `/school` — school admin dashboard (full)
4. `/onboarding/invite-code`
5. `/super-admin/school/:id` (just the read-only banner — body reuses #3)

Components to lock first (used across multiple screens):

- `<InviteCodeCard>` — copy + regenerate visual
- `<InviteCodeInput>` — 6-digit / 8-char cell input
- `<SchoolStatsTiles>` — 4-tile metric grid (model for super admin too)
- `<RecentSignupsList>` — name + role + relative-time row

**Format**: Figma file with desktop + mobile frames, components linked,
tokens variabled (use existing v4 token names from `home-v4.css`).

### Sprint 2 (1.5 weeks after Sprint 1)

- `/parent` — parent dashboard with `<ChildCard>` grid + empty state
- `/parent/link` — 2-step linking flow
- `<ChildProgressDetail>` modal/drawer
- `<PendingLinkBanner>` — student-facing inline confirmation banner

### Sprint 3 (small — 3 days, parallel-able)

- Settings row for `<LanguageToggle>`
- Devanagari sample render across 4 existing v4 screens (smoke test — does
  Lexend Deca + Noto Sans Devanagari look balanced together?)

### Sprint 4 (small — 2 days)

- Code-highlighting theme choice for `<MathText>` rendering Python code blocks
  in Ask Pa. Pick a Prism theme that matches v4 (`vsLight` with coral accents
  is my guess; provide a sample showing a 10-line Python function with comments).

### Sprint 5 (1.5 weeks)

- `/super-admin` — schools list + drill-down
- `<SchoolsTable>` — sortable table → mobile card list
- `<PlatformMetricsTiles>` — 5-tile platform overview
- `<TopErrorsPanel>` + `<TopReportedTopicsPanel>`

---

## Open visual decisions (need your call)

`UI_SPEC_v5.md` §9 lists 6 open decisions. Quick recap with my recommendation:

| # | Decision | My recommendation |
|---|---|---|
| 1 | Super admin badge style | Small purple chip in HomeTopNav (vs full ink mode) |
| 2 | Code chip typography | System monospace at `t-h1` size (vs custom font) |
| 3 | Risk indicator | Custom 8px dots + accessible label (vs emoji 🟢🟡🔴 — emoji renders inconsistently) |
| 4 | Children grid breakpoint | Single → 2-up at **768px** (so phones-in-landscape stay single-column) |
| 5 | `<PendingLinkBanner>` placement | Top of `/home` (vs floating sheet — students miss sheets on mobile) |
| 6 | Onboarding skip styling | Ghost button (vs text link — better tap target) |

You're welcome to argue any of these. Just decide before Sprint 1 ships.

---

## Constraints / things to know

- **Mobile is primary**. Most students will use Chrome on Android (~360–414px wide). Design mobile-first; desktop is the broader frame, not the canonical one.
- **Pa is the brand**. Pa mascot already has 4 moods (idle, thinking, celebrate, speaking). New screens that have a "Pa says…" moment should use these. Don't introduce new moods unless required.
- **Lexend Deca + Kalam** are the font system. Kalam is for handwritten flourishes only (Pa whiteboard, "by Pa" attributions) — sparingly.
- **Math is everywhere**. KaTeX renders LaTeX in answers. Treat math as content that flows in regular paragraphs, not as a special block.
- **Hindi support means font fallback**. Add `'Noto Sans Devanagari'` to the font-stack on every text-bearing surface; verify Hindi sample renders well alongside English.
- **`v4 paper-coral` aesthetic** = warm, friendly, Indian school stationery vibe. Avoid "ed-tech corporate" (no neon gradients, no glass-morphism, no "AI startup chrome").
- **Accessibility**: 44×44px tap targets, 4.5:1 contrast, focus rings always visible (`--c-accent` 3px outline), motion respects `prefers-reduced-motion`.

---

## What we're NOT changing in v5

- Existing v4 student screens (`/home`, `/ask`, `/practice`, `/tests`, `/learn`, `/progress`, `/settings`).
- Pa mascot art / moods.
- Logo, colour palette, type scale.
- Existing modals/sheets pattern.
- Onboarding flow for individual students (just adding optional invite-code step).

If you find yourself wanting to change something on this list, raise it — but
the default answer is "not in v5".

---

## Practical next steps

1. **Skim the 5 reference docs** in the order listed (~90 min).
2. **Spin up a Figma file** with the existing v4 token library imported.
3. **Start with the 4 Sprint 1 components** (InviteCodeCard, InviteCodeInput, SchoolStatsTiles, RecentSignupsList) — these are the building blocks.
4. **Then tackle the 5 Sprint 1 screens** assembling those components.
5. **Lock the 6 open visual decisions** before mocks finalize.
6. **Send me a Loom walking through your decisions** when Sprint 1 mocks are ready.

If anything in `UI_SPEC_v5.md` is ambiguous, ping me. The wireframes are
intentionally low-fidelity (ASCII art + measurements) — your job is to
make them feel like Padee.

---

## Compensation + timeline expectations

[Vinoth fills in based on agreement with the designer.]

Estimated total designer effort: **~5–7 person-days across 6 sprints**, paced
to land 1 sprint ahead of frontend implementation.

---

*Reach out: vinoth@gyanmatrix.com*
