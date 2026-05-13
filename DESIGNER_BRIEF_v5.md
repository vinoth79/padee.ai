# Designer Brief — Padee.ai v5.1 (Whole-product visual refresh)

**For**: design partner (Claude design / external designer)
**From**: Vinoth (founder)
**Status**: Visual direction not yet locked — see §0 below.
**Scope**: All 30+ screens currently in production, plus 2 planned for Sprint 5. This is a **whole-product visual refresh**, not a feature extension.

---

## 0. v5.1 Refresh — direction questions (Vinoth to answer first)

Before mocks: the design partner needs your call on six things. Fill these
in inline — they shape every screen below. None of these have one right
answer; they are stylistic choices about where to take Padee next.

### 0.1 Aesthetic direction

The current v4 system is **paper-coral**: warm cream paper background, coral
accent, ink-shadow buttons that feel like physical objects, soft amber
highlights for streaks. It's deliberately Indian-school-stationery, not
ed-tech-corporate.

For the refresh, you have to pick one:

- [ ] **(a) Polish in place** — same paper-coral DNA, but tightened up.
      Sharper type hierarchy, more breathing room, motion polish, stronger
      mobile compositions. **Lowest risk; lowest reward.**
- [ ] **(b) Mature the system** — keep the warm Indian feel but evolve it
      to feel more grown-up. Slightly muted palette, more confident type,
      less bouncy buttons. Aimed at parents and school admins (who currently
      feel slightly under-served by the kid-leaning v4).
- [ ] **(c) Fork by audience** — student keeps the playful v4 system; parent
      / school_admin / teacher get a calmer, more dashboard-feeling sibling
      system. One brand, two registers. **Most work; clearest segmentation.**
- [ ] **(d) Full visual reset** — move to a new palette + type system
      entirely. New illustration style, new Pa-mascot fidelity. **Biggest
      lift; only do this if you think v4 is the wrong direction, not a
      stepping stone.**

**[VINOTH FILL IN]**: ___

### 0.2 Density target

v4 is roomy — generous padding, big touch targets, breathing white space.
This works on mobile. On desktop the home screen feels under-dense.

- [ ] Stay roomy (mobile-first; desktop is a wider canvas, not a denser one)
- [ ] Tighter on desktop only (responsive density — phone stays roomy)
- [ ] Tighter everywhere (mobile loses some of its pillowy v4 feel)

**[VINOTH FILL IN]**: ___

### 0.3 Pa mascot

v4 has 4 moods (idle / thinking / celebrate / speaking) at one fidelity
level. Refresh options:

- [ ] Keep mascot art unchanged; just refine its placement + sizing rules
- [ ] Add 2–3 moods (confused, encouraging, curious) at the same fidelity
- [ ] Higher-fidelity art for hero placements (Pa on landing, Pa on test
      results); same simplified Pa for in-line accents (banners, chips)
- [ ] Re-illustrate Pa entirely

**[VINOTH FILL IN]**: ___

### 0.4 Dark mode

Padee currently has no dark mode. Indian students study late at night.

- [ ] Add dark mode in the refresh (full token-pair system: --c-paper-dark, etc.)
- [ ] Add dark mode for student-facing screens only
- [ ] Defer dark mode to v5.2

**[VINOTH FILL IN]**: ___

### 0.5 Type system

Currently `Lexend Deca` (body) + `Kalam` (handwritten flourishes — Pa
whiteboard, "by Pa"). v5 adds `Noto Sans Devanagari` for Hindi tutoring.

- [ ] Keep Lexend Deca; refresh is everything-but-type
- [ ] Add a display face for hero / marketing surfaces (landing, test results
      score ring) while keeping Lexend for the rest of the app
- [ ] Migrate to a different body type entirely (suggest: Inter, Geist, Söhne)

**[VINOTH FILL IN]**: ___

### 0.6 Mobile vs desktop weight

v4 is mobile-first; desktop is a centred, max-width-1200px column. ~80%
of student traffic is mobile; teacher and school admin traffic is more
desktop-heavy.

- [ ] Stay mobile-first across the board
- [ ] Audience-specific: student stays mobile-first; teacher / school admin
      / super admin treat desktop as the primary canvas
- [ ] Push desktop-first across the board (most users have a laptop too)

**[VINOTH FILL IN]**: ___

---

## What you're walking into

Padee.ai is an AI-first K12 learning platform for India (CBSE Classes 8–12,
all subjects). The v4 visual system is **shipped and live** for the student
journey (Sprints 0–2 of v5 also shipped). Your job is **the v5.1 visual
refresh** — re-design every screen to a new visual direction Vinoth picks
in §0.

What ships today:

- **Student journey** (v4 visuals, fully shipped): landing, signup, onboarding,
  home, ask Pa, learn, practice, tests (list / active / results), progress,
  settings.
- **Teacher journey** (v4 visuals, fully shipped): dashboard, worksheet,
  paper mimic, student performance, student profile, assign-test, live class.
- **School admin journey** (v5 Sprint 1, engineering-cut — no designer pass):
  signup, /onboarding/school, /school dashboard, /onboarding/invite-code.
- **Parent journey** (v5 Sprint 2, engineering-cut — no designer pass):
  /parent dashboard, /parent/link, ChildProgressDetail modal, PendingLinkBanner
  on student /home.
- **Admin tooling** (v3 visuals, deliberately rough — internal tool):
  /admin (NCERT upload, LLM audit, concept catalog, config).

What's not yet built:

- **Hindi tutoring** (Sprint 3) — settings dropdown + per-screen render
  validation with Devanagari sample text.
- **Coding subject** (Sprint 4) — code-highlighting in MathText for Python
  in Ask Pa; CS subject in onboarding pickers.
- **Super admin** (Sprint 5) — `/super-admin` cross-school dashboard,
  `/super-admin/school/:id` drill-down, errors panel, top-reported-topics.

---

## Read these in order

| # | File | Why |
|---|---|---|
| 1 | `Padee_UI_Spec_v3.pdf` | The 19+1 v4 screens that exist today as PDF wireframes. Visual baseline. |
| 2 | `CLAUDE.md` (§ "Design system (v4)") | Tokens, type scale, font families, voice/tone. |
| 3 | `src/styles/home-v4.css` (top 80 lines) | The actual CSS variables you'll be working with. |
| 4 | `PRD_v5.md` | Product features. v5.1 doesn't change features — it changes the look. |
| 5 | **`UI_SPEC_v5.md`** | **The working brief.** §0 refresh direction, §1–8 current visual state, §10 screen inventory. |
| 6 | `docs/ui-snapshots/` (if Vinoth has run the demo screenshot script) | PNG screenshots of every shipped screen as it looks today. |

If you only read one, read **`UI_SPEC_v5.md`** — it's the working brief.
The others are context.

---

## What we need from you

Hi-fi mocks for **all 30+ shipped screens + 2 Sprint 5 planned screens**,
re-designed to the visual direction locked in §0. Output as a Figma file
with desktop + mobile frames, components linked, tokens variabled.

Phasing:

### Phase A — design system lock (week 1)

Before any screen mocks, lock the foundation:

- New token library (colour, type, radii, shadows, spacing, motion)
- Component primitives: button (primary / ghost / danger / icon), input,
  select, chip, card (4 levels — flat / standard / pop / hero), modal,
  banner (info / warning / success / error), toast, skeleton, pill, avatar.
- Pa mascot system (whatever you picked in §0.3).
- Mobile + desktop frames sized 360 / 768 / 1280.

### Phase B — student journey (week 2)

Highest traffic. Refresh first.

- Landing + auth (3 screens): `/`, `/login`, `/signup`
- Onboarding (4 screens): `/onboarding/class`, `/onboarding/subjects`,
  `/onboarding/track`, `/onboarding/invite-code`
- Home: `/home` (the most-loaded screen in the product — get this right)
- Ask Pa: `/ask` — including the visual explanation iframe + listen button
  + math rendering
- Learn: `/learn`
- Practice: `/practice`
- Tests: `/tests`, `/tests/active`, `/tests/results`
- Progress: `/progress`
- Settings: `/settings`

### Phase C — parent + school + teacher (week 3)

These shipped engineer-cut and most need a polish pass.

- Parent: `/parent`, `/parent/link`, `<ChildCard>`, `<ChildProgressDetail>`,
  `<PendingLinkBanner>`
- School admin: `/onboarding/school`, `/school`, `<InviteCodeCard>`,
  `<SchoolStatsTiles>`, `<RecentSignupsList>`, `<TopWeakConceptsPanel>`
- Teacher: `/teacher`, `/teacher/worksheet`, `/teacher/mimic`,
  `/teacher/test`, `/teacher/student/:id`, `/teacher/students`,
  `/teacher/live`

### Phase D — Sprint 5 (super admin, week 4)

Built fresh on the new system from day 1.

- `/super-admin` — schools list + platform metrics tiles
- `/super-admin/school/:id` — read-only drill-down (reuses `<SchoolDashboard>` body)
- `<SchoolsTable>`, `<PlatformMetricsTiles>`, `<TopErrorsPanel>`,
  `<TopReportedTopicsPanel>`

### Phase E — admin tooling (week 4–5, optional)

`/admin` is a Padee-internal ops tool. Refresh scope is your call:

- [ ] Refresh fully (treat it as a peer to the school admin dashboard)
- [ ] Skip (it's internal; v3 visuals are fine)
- [ ] Light touch (just bring it onto the new token library; no layout work)

---

## Constraints / things that stay regardless

- **Mobile is primary** for student-facing surfaces (~80% of traffic on
  Chrome / Android, 360–414px wide).
- **Pa is the brand**. Whatever direction §0.3 lands on, Pa stays
  recognisable as the same character.
- **Math is everywhere**. KaTeX renders LaTeX in answers. Treat math as
  content that flows in regular paragraphs, not as a special block.
- **Hindi support means font fallback**. Add Devanagari glyphs to the
  font-stack on every text-bearing surface; verify Hindi sample renders
  well alongside English.
- **Accessibility floor**: 44×44 tap targets, 4.5:1 contrast, focus rings
  always visible, motion respects `prefers-reduced-motion`, all banners
  / inputs have proper aria labels.
- **Per-screen privacy boundaries** (parent dashboard especially): what
  the user CAN see is part of the visual contract — see the
  ChildProgressDetail "What we keep private" panel for the pattern. If
  you propose tightening or relaxing that, flag it before mocks ship.

---

## Open visual decisions (besides §0)

Smaller, screen-specific calls — your judgement, but flag in your Loom:

| # | Decision | Notes |
|---|---|---|
| 1 | Super admin badge style | Currently a small purple chip in HomeTopNav. Consider full-page ink-mode for dashboard. |
| 2 | Code chip typography | Sprint 1 uses system monospace at `t-h1` size. Re-evaluate against new type system. |
| 3 | Risk indicator (super admin schools table) | Custom 8px dots + accessible label preferred over emoji 🟢🟡🔴 (renders inconsistently across OSes). |
| 4 | Children grid breakpoint | Currently 1-up → 2-up at 768px → 3-up at 1080px. Stress-test at the new density. |
| 5 | `<PendingLinkBanner>` placement | Currently top of student `/home` above the hero. Floating sheet alternative was rejected (mobile users miss sheets). Re-evaluate. |
| 6 | Onboarding skip styling | Currently ghost button. Consider text link if the refresh has a stronger button hierarchy. |
| 7 | Test mode "lock-in" | Currently no nav pills (intentional — student is in a test). Refresh: same restriction or new breadcrumb pattern? |
| 8 | LaTeX flow in display math | KaTeX renders inline `$` and display `$$` math. v4 treats it as flowing text. Refresh: same or display-block treatment for `$$`? |

---

## Practical next steps

1. **Vinoth fills in §0 (six visual direction calls)** — without these, mocks
   can't proceed. Allow ~30 min of focused thinking.
2. **Skim the 6 reference docs** in the order listed.
3. **Spin up a Figma file** with phase A as the foundation.
4. **Send a Loom walking through phase A decisions** before starting screens.
5. **Iterate phase by phase**; each phase ships when Vinoth signs off.

If anything in `UI_SPEC_v5.md` is ambiguous, ping Vinoth. The current state
captured there is engineering-faithful (literally read off the live app),
not aspirational — so it's a faithful starting point, not a target.

---

## Compensation + timeline expectations

[Vinoth fills in based on agreement with the design partner.]

Estimated total designer effort: **4–5 weeks** for the full refresh,
phased per above. Engineering will adopt mocks phase-by-phase, paced behind
design.

---

*Reach out: vinoth@gyanmatrix.com*
