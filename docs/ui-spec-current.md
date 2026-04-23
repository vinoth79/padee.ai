# Padee.ai — Current UI Spec

**Generated:** April 23, 2026
**Purpose:** Faithful documentation of the UI that exists today. Use as input for **Claude Design** to produce visual refinements without breaking functionality.
**Scope:** Visual redesign only. Do NOT change routes, state shapes, API contracts, or component prop interfaces.

---

## 0. How to use this document

If you're Claude Design reading this: the goal is to **refresh the visual language** of Padee — typography, spacing, colour harmony, depth, motion — while keeping every screen, every interaction, and every component prop contract exactly as-is.

**Hard constraints (do not violate):**
- Don't change route paths (`/home`, `/ask`, `/teacher/worksheet`, etc.)
- Don't change the `<Outlet />` structure in layouts — the current single-Outlet design fixed a critical streaming bug. Adding animation keyed on `location.pathname` will re-introduce it.
- Don't restructure components' public props — other screens import them
- Don't remove "hidden" test accessibility hooks (e.g. data-testid attributes if added later, ARIA labels on interactive elements)
- Keep existing animation keyframes (`orbIdle`, `xpFloat`, `flameSway`, `stepReveal`) — they're wired into specific features

**Soft constraints (preferred but adjustable):**
- Keep the Forest Teal + Coral Orange brand family. Shift tones, not identity.
- Keep DM Sans as the body face — we've ruled out font changes for Phase 1.
- Keep 16px base, scale `xs (12) / sm (14) / base (16) / lg (18) / xl (20) / 2xl (22) / 3xl (26) / 4xl (30) / 5xl (36)`.

**Free to change:**
- Shadows, border treatments, card radii, spacing rhythm
- Colour accents within the existing palette (amber / emerald / coral / teal intensities)
- Hero card gradients, empty-state illustrations
- Icon styling and sizing
- Button shapes + hover states
- Micro-interactions and transitions

---

## 1. Design tokens (as implemented)

### 1.1 Colours — `tailwind.config.js` + `src/index.css`

```
BRAND — Forest Teal
  primary       #0D9488   main brand (CTAs, primary buttons, active nav)
  mid           #14B8A6   mid-tone teal
  light         #CCFBF1   light fill (student avatars, badges)
  pale          #99F6E4   paler fill (border-teal)
  dark          #0F766E   darker hover / active text
  darker        #134E4A   deepest teal
  hero          #0F1729   dark navy (hero cards, AI recommendation)

SURFACES
  bg            #F8F7F4   page background (warm off-white, not pure gray)
  landing       #F0FDFA   landing page background (very pale teal)
  card          #FFFFFF   card fill
  surface       #F9FAFB   subtle section fill
  border        #E5E7EB   default border

TEXT
  navy          #111827   primary text
  hint          #4B5563   secondary text
  slate         #6B7280   tertiary text (labels, meta)
  muted         #9CA3AF   muted text (timestamps, placeholders)

ACTION — Coral
  coral          #EA580C   secondary action
  coral-dark     #C2410C
  coral-light    #FFF7ED
  coral-pale     #FFEDD5

SEMANTIC
  amber         #D97706   XP, alerts, warnings
  amber-light   #FEF3C7
  amber-dark    #B45309
  emerald       #059669   success, positive progress
  emerald-light #ECFDF5
  emerald-dark  #065F46
  error         #DC2626

SUBJECT ACCENTS
  physics       #2563EB   blue
  chemistry     #EA580C   coral (shared with action)
  biology       #059669   emerald (shared with success)
  maths         #7C3AED   violet
  cs            #0891B2   cyan
  english       #E11D48   rose
  social        #D97706   amber
```

### 1.2 Typography

**Family:** DM Sans (body), DM Mono (code/numbers)
**Base size:** 16px
**Scale:**
```
xs    12px  line 1.5    — meta, timestamps, labels
sm    14px  line 1.55   — body small, secondary
base  16px  line 1.6    — body default
lg    18px  line 1.55   — emphasis body
xl    20px  line 1.5    — subheadings
2xl   22px  line 1.4    — screen titles
3xl   26px  line 1.35   — large emphasis
4xl   30px  line 1.25   — display
5xl   36px  line 1.2    — hero numbers (XP, level)
```

**Weights in use:** 400 (default), 500 (medium), 600 (semibold), 700 (bold), 900 (black, rarely — only landing page).

### 1.3 Shadows
```
card         0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)
card-hover   0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)
orb          0 0 32px rgba(13,148,136,0.4), 0 0 64px rgba(13,148,136,0.2)   — AI orb glow
orb-sm       0 0 16px rgba(13,148,136,0.35)
action       0 4px 16px rgba(13,148,136,0.15)                                — primary CTAs
```

### 1.4 Radii
- `rounded` — 4px — tight chips
- `rounded-md` — 6px — small buttons
- `rounded-lg` — 8px — buttons, inputs
- `rounded-xl` — 12px — cards (most common)
- `rounded-2xl` — 16px — large surfaces, hero cards
- `rounded-full` — avatars, streak flame, pills

**Empirically dominant: `rounded-full` (26 uses) > `rounded-lg` (10) > `rounded-xl` (5)**

### 1.5 Motion
```
pulse-slow     3s pulse            — idle AI orb
pulse-gentle   2.5s ease-in-out    — subtle attention
orb-idle       4s ease-in-out      — AI orb breathing
bounce-slow    2s                  — level-up celebrations
spin-slow      3s linear           — loading rings
fade-in        200ms               — content appearance
slide-up       200ms               — bottom sheets, toasts
slide-in       300ms               — side panels
scale-in       200ms ease-bounce   — modals, badges
float-up       2.5s                — XP particles
xp-float       2.2s                — XP toast
step-reveal    300ms               — step-by-step answer cards
shimmer        1.5s                — skeleton loaders
flame-sway     3s                  — streak flame icon
```

---

## 2. Layout primitives

### 2.1 Student Layout (`src/layouts/StudentLayout.tsx`)

Single-Outlet design (critical — do not change to multi-Outlet or AnimatePresence-with-key).

**Breakpoints:**
- **Desktop (≥ lg, 1024px+):** 220px sidebar (left) + main (max-width 1200px) + optional 300px right panel on home
- **Tablet (sm–lg, 640–1024px):** 64px icon-only rail (left) + main. No right panel.
- **Mobile (< sm, < 640px):** main column only + fixed bottom tab bar (z-30, 4 tabs: Home / Ask / Learn / Tests / Progress → one of these condensed)

**Chrome elements:**
- **Sidebar (desktop):** Logo cell (Padee + vermillion dot) → user card (avatar + name + class/level) → nav list (5 items with icons) → bottom actions (Settings, Logout).
- **Top bar:** only on pages that need one (Ask AI has a compact one with Class chip + Clear button; most screens have no top bar — the screen header IS the page title).
- **Bottom tab bar (mobile):** 4–5 icons with labels below, active one gets teal fill.

**Celebration overlays:**
- `CelebrationHost` mounted at layout root — absolute-positioned modals for level-up and badge unlock. Never blocks nav, auto-dismisses.

### 2.2 Teacher Layout (`src/layouts/TeacherLayout.tsx`)

Similar single-Outlet structure.

- **Desktop:** 220px sidebar with 3 sections (Overview / Create / Monitor) and 6 nav items
- **Tablet + mobile:** Compact 48px top bar with logo + "Teacher" badge. No sidebar. No bottom tabs (teachers use desktop)

**Sidebar sections:**
```
Overview        Command Center
Create          Worksheet, Paper Mimic, Test Paper, Live Class
Monitor         Students, Review queue
```

### 2.3 Admin layout
AdminScreen is standalone (no chrome). Password gate at the top, then tabs: NCERT Content / Concept Catalog / LLM Audit / Users / Config.

### 2.4 Auth + Onboarding
No layout chrome. Full-bleed single column. Logo + card.

---

## 3. Screen inventory

Every screen, with its purpose and current visual shape.

### 3.1 Public + Auth

| Screen | Path | Visual shape |
|---|---|---|
| `LandingPage` | `/` | Full-bleed hero + feature grid + CTA. Pale teal background. |
| `SplashScreen` | `/splash` | Centered logo + orb, auto-redirects in 1.5s. |
| `LoginScreen` | `/login` | Centered card (420px) with email + password. Single "Sign in" button. |

### 3.2 Onboarding

| Screen | Path | Visual shape |
|---|---|---|
| `OnboardingClass` | `/onboarding/class` | 5 class-level cards (8/9/10/11/12) with emoji + description |
| `OnboardingSubjects` | `/onboarding/subjects` | Subject grid with tickable cards; shows chosen count |
| `OnboardingTrack` | `/onboarding/track` | 4 track cards: School / JEE / NEET / CA |

Progress indicator: 3 dots at top, filled on complete.

### 3.3 Student

| Screen | Path | Key visual blocks |
|---|---|---|
| `StudentHomeScreen` | `/home` | Greeting + streak banner + concept-level recommendation cards (Hero/Weak/Revision/Next) + daily challenge + recent wins + subject rings + right panel (desktop) |
| `DoubtSolverScreen` | `/ask` | Top bar (Class chip, Clear) → message list (student right, AI left with orb avatar) → action chips row → input bar with camera icon + send |
| `LearnScreen` | `/learn` | Today's Focus hero → Pick Up Where You Left Off (3 cards) → Subject sections with expandable chapter lists → concept rows clickable |
| `PracticeModeScreen` | `/practice` | Loading → question card with ABCD options → explanation → next → results (accuracy ring, stats, retry) |
| `ProgressScreen` | `/progress` | Profile card → stat row → streak section → badge grid → subject mastery bars → today's activity |
| `TestListScreen` | `/tests` | Card grid of available tests + "Start AI-recommended" hero card |
| `TestActiveScreen` | `/tests/active` | Top timer bar + question + ABCD options + navigation drawer |
| `TestResultsScreen` | `/tests/results` | Hero score ring + question-by-question review + AI insights + retry CTA |

### 3.4 Teacher

| Screen | Path | Key visual blocks |
|---|---|---|
| `TeacherDashboardScreen` | `/teacher` | Greeting → 4-card stat strip (students, alerts, flagged, tests-this-week) → 2-col: alert feed + recent activity (left) / right panel with concept hotspots + quick actions + class health bars |
| `WorksheetGeneratorScreen` | `/teacher/worksheet` | Input (free-text box + sample chips + validation toggle) → generating spinner → preview (summary card + Questions/Answers tabs) with Save/PDF/DOCX actions |
| `PaperMimicScreen` | `/teacher/mimic` | Dropzone → hint field → validation toggle → generate → preview (reuses `WorksheetPreview`) |
| `TeacherReviewQueueScreen` | `/teacher/review` | 2-col: left list (tabs Pending/Reviewed/All, subject filter, status chips) / right detail (student question, AI answer with NCERT chips, report text, teacher notes textarea, 3 verdict buttons) |
| `TeacherAssignTestScreen` | `/teacher/test` | Step form: subject → chapter → question count → AI preview → publish. Submission stats below when assignments exist. |
| `StudentPerformanceScreen` | `/teacher/students` | Search + class filter + list of students (avatar, name, email, streak, level chevron) |
| `TeacherStudentProfileScreen` | `/teacher/student/:id` | Header (avatar, name, last-active chip, streak/level/XP) → 5-stat row → activity sparkline → subject mastery bars → weak concepts (amber cards) → recent tests + practice → doubt history (expandable) |
| `LiveClassScreen` | `/teacher/live` | **Currently stub/mock. Rebuild per PRD Section 19.** |

### 3.5 Admin
`AdminScreen` — 5 tabs, data tables, file upload drop zones, inline edit forms.

### 3.6 Misc
- `ParentSummaryScreen` — shares progress layout
- `JEENEETScreen` — shares home layout
- `ChapterViewScreen` — deprecated, consider removing

---

## 4. Component inventory

### 4.1 Shared — `src/components/`

| Component | Purpose | Where used |
|---|---|---|
| `AIOrb` | Animated teal-blue orb; states: `idle`, `thinking`, `speaking` | AI bubble avatar, cold-start greeting |
| `AIBar` | Input bar with camera icon + send button | Ask AI screen |
| `BottomNav` | Mobile 4–5 icon tab bar | StudentLayout |
| `TeacherTopNav` | Compact teacher top bar on tablet/mobile | TeacherLayout |
| `ScoreRing` | Circular progress with centered % label | TestResults, Practice results |
| `XPToast` | Floating "+10 XP" pill | After any XP-earning action |
| `LevelUpOverlay` | Full-screen celebration with confetti | Triggered on level-up |
| `Confetti` | Particle burst | Celebrations |
| `ScreenBridge` | HOC that injects `onNavigate`, `initialQuestion`, `initialSubject` from URL | Every routed screen |
| `ProtectedRoute` | Auth wrapper | All protected routes |
| `RateLimitErrorCard` | Amber actionable card shown in Ask AI on LLM rate-limit failures | DoubtSolverScreen |

### 4.2 UI primitives — `src/components/ui/`

| Component | Shape |
|---|---|
| `ProgressBar` | Horizontal bar, configurable colour + label |
| `ScoreRing` | SVG circle with stroke-dashoffset animation |
| `LevelBadge` | Pill with level number + name |
| `DifficultyBadge` | Small pill: easy (emerald) / medium (amber) / hard (red) |
| `SubjectPill` | Coloured pill using subject accent palette |
| `MasteryChip` | Small inline chip showing mastery % |
| `XPToast` | Duplicate of outer XPToast — **candidate for consolidation** |

### 4.3 Recommendation cards — `src/components/recommendations/`

`RecommendationCards.jsx` exports 4 card types:
| Card | Colour | Layout |
|---|---|---|
| `HeroCard` | Navy gradient `#0F1729` → slight teal tint, with accent dot + "AI RECOMMENDATION FOR TODAY" label, title (white 19px), description (55% white), 2 buttons (primary accent + ghost outline) |
| `WeakConceptCard` | Amber background `#FEF3C7` with left accent strip, title + failure count + "Fix in N questions →" |
| `RevisionCard` | Teal background `#ECFDF5` with left teal accent, title + "not revised in N days" + "2-min refresh →" |
| `NextToLearnCard` | Blue background `#EFF6FF` with left blue accent, chapter name + "the next step in your [subject] journey" |

### 4.4 Teacher components — `src/components/teacher/`

| Component | Shape |
|---|---|
| `TeacherSidebar` | 220px vertical nav with 3 section groupings, Settings + Logout pinned bottom |
| `TeacherAlertFeed` | List of red/amber/green alert cards with one-tap action button per alert |
| `TeacherRightPanel` | 300px dashboard sidebar: concept hotspots card (dark) + quick actions + class health bars |
| `WorksheetPreview` | Shared preview component: summary card + Questions/Answers tabs + sections with numbered questions. Used by worksheet + mimic screens. |

### 4.5 Admin components — `src/components/admin/`

| Component | Shape |
|---|---|
| `ConceptCatalogTab` | Tree: Subject → Class → Chapter → concepts. Inline edit (name, exam weight, summary). Draft → Publish workflow. Bulk actions per chapter. |

### 4.6 Celebrations — `src/components/celebrations/`

Full-screen overlays for level-up and badge unlock — confetti, scale-in animations, bouncing emoji. Queue managed via CelebrationHost.

---

## 5. Interaction patterns currently in use

These patterns are part of the product feel. Preserve their spirit even if visuals change.

### 5.1 Streaming AI responses
- AI Tutor label appears first (with `orb-idle` animation)
- Text streams token-by-token into a white rounded-xl bubble
- Subtle teal pulsing cursor at the end until stream completes
- "Copy" button hover-reveals on completed bubbles
- Citation chip (NCERT source) appears after completion

### 5.2 Action chips (Ask AI)
- 6 primary chips visible at once; "More ↓" collapses overflow on mobile
- Each chip: emoji + label, lg rounded-full, coral/amber mix
- Tap = send the interpolated prompt as a new student message

### 5.3 Quality signals (Ask AI)
- Thumbs up/down appear below each AI bubble (muted until hovered)
- Tapping 👎 reveals inline reason chips [Unclear] [Inaccurate] [Not NCERT] [Skip]
- "Report incorrect" opens a bottom-sheet modal (slide-up animation)

### 5.4 Celebration queue
- XP toast slides up from bottom-right every time XP is awarded
- Level-up overlay blocks interaction briefly with confetti + new level name
- Badge unlock bottom sheet with spinning conic ring

### 5.5 Loading states
- Streaming thinking state: 5 phase labels cycling every 700ms
- Non-streaming async (worksheet generate, visual explain): spinner with explanatory text
- List loading: skeleton rows with shimmer

### 5.6 Optimistic UI
- Student submits practice answer → immediately shows feedback, then server confirms
- Teacher saves worksheet → button flips to "✓ Saved" before response lands, reverts on error

### 5.7 Error states
- Rate limit: `RateLimitErrorCard` in-place with retry countdown + actionable alternatives
- Generic 500: amber banner at top of screen (dismissible)
- Empty states: large emoji + friendly message + CTA to fill the space

---

## 6. Responsive behaviour

### 6.1 Breakpoints (Tailwind defaults)
- `sm` 640px
- `md` 768px
- `lg` 1024px
- `xl` 1280px

### 6.2 What changes at each breakpoint

| Element | < sm (mobile) | sm–lg (tablet) | ≥ lg (desktop) |
|---|---|---|---|
| Student chrome | Bottom tab bar | 64px icon rail | 220px sidebar |
| Teacher chrome | Top bar | Top bar | 220px sidebar |
| Right panel (home, teacher dashboard) | Stacked below main | Hidden | 300px fixed |
| Action chip row | First 4 + More ↓ | All 6 visible | All 6 visible |
| Stat cards | 2-column | 2-column | 4-column |
| Worksheet preview | Full-width stacked | Full-width stacked | Max-width 4xl centered |
| Review queue | List top / detail below | 380px list + detail | 380px list + detail |

### 6.3 Mobile-first concerns
- Touch targets: 44px minimum (currently respected via `py-2` on buttons)
- Bottom tab bar is `fixed bottom-0` with safe-area padding
- Modals must leave tap-away affordance (backdrop click to dismiss)
- Input bars are sticky bottom on Ask AI; iOS keyboard push is respected via `h-screen` + `flex-col`

---

## 7. Known visual inconsistencies to fix

Candid list — Claude Design can use this as a punch list.

| Issue | Where | Suggested fix |
|---|---|---|
| Card radii inconsistent (12px vs 16px vs full) | Everywhere | Standardize: cards 12px, hero cards 16px, chips full |
| Border width inconsistent (0.5px vs 1px vs 1.5px) | Throughout | Pick two tiers: 1px default, 2px emphasis |
| Shadow system underused — most cards use borders instead | Dashboard cards, teacher panel | Pick one: shadows OR borders, not both |
| Colour palette leakage: mock teal-300 / emerald-100 Tailwind classes coexist with CSS variable system | Older screens (LoginScreen, some Onboarding) | Migrate everything to CSS variables or the `brand.*` palette |
| Font weight usage inconsistent (500 / 600 / 700 used interchangeably for "medium") | All | Define: body 400, meta 500, strong 600, heading 700 |
| Spacing rhythm — some screens use 4/8/12/16/20/24, others use 12/18/30 | Screen-to-screen | Stick to 4/8/12/16/20/24/32 rhythm |
| Icon sizes unpredictable (14 / 16 / 18 / 20 mixed) | Buttons, nav | Rules: nav 18, inline 14, action button 16 |
| Empty states inconsistent (some emoji+text, some plain text, some illustration) | Learn, Teacher queue, Students list | Standard empty state: 48px emoji + title + subtitle + CTA |
| Hover affordances irregular (some buttons have them, some don't) | Mainly teacher screens | Hover: background tint OR elevation, never both |
| Mobile touch targets in some nested cards are < 44px | Subject health rows, concept hotspot list items | Enforce `min-h-[44px]` |
| Dark navy hero card (`#0F1729`) gradient is flat; could benefit from depth | AI recommendation, concept hotspots | Add subtle inner glow or gradient overlay |

---

## 8. Design opportunities (Claude Design, pick your battles)

Things that would visibly elevate the product without reshaping it.

### 8.1 Typography refinement
- Tighten heading leading; currently 1.4 for 22px is a bit loose
- Consider a tabular-nums variant for XP numbers, percentages, scores
- Reconsider weight pairing: body 400 + heading 700 feels stark; try 500 + 600

### 8.2 Depth system
- Currently flat-ish. Shadows exist but barely used.
- Three-tier depth: flat (surface) / raised (interactive cards) / floating (modals, toasts)
- Subtle gradients on hero cards would make the navy feel intentional, not default

### 8.3 Colour vibrancy
- Current palette is correct but muted. Amber/coral/emerald can push slightly warmer.
- Consider a cool-warm cycle: cool teal for primary, warm coral/amber for user actions

### 8.4 Iconography
- Mixed: lucide-react icons + emoji + custom SVGs (AIOrb, streak flame). Choose: either emoji-friendly consumer or all-icon prosumer.
- Icon stroke weight: currently default 2; try 1.75 for a softer feel

### 8.5 Motion
- Most micro-interactions are present but could be more confident. `scale-in` on buttons tap is good; extend to all interactive surfaces.
- Page transitions currently NONE (removed on purpose to fix the streaming bug). A fade-only transition via CSS (not keyed to location) would be safe.

### 8.6 Data visualization
- Score rings are good. Activity sparkline on student profile is minimal — consider more polish.
- Progress bars are thin (2px); dashboard feel demands 4–6px with rounded ends.

### 8.7 Empty and loading states
- Skeleton loaders with shimmer are defined but only used in a couple of places. Extend to all async surfaces.
- Empty states often feel clinical — lean into personality (Padee is a tutor persona).

### 8.8 Mobile
- Mobile feels like a shrunken desktop in places. Consider mobile-first patterns (bottom sheets instead of modals, swipe-to-dismiss on AI bubbles).

---

## 9. Files Claude Design can change freely

```
SAFE TO TOUCH (visual layer):
  tailwind.config.js                     — design tokens
  src/index.css                          — CSS variables + global styles
  src/components/ui/*                    — UI primitives
  src/components/AIOrb.jsx               — animated orb
  src/components/XPToast.jsx             — toast
  src/components/celebrations/*          — overlays
  Any screen's JSX styling               — Tailwind classes, inline styles

DO NOT TOUCH (structural or behavioural):
  src/layouts/StudentLayout.tsx          — single-Outlet structure is load-bearing
  src/layouts/TeacherLayout.tsx          — ditto
  src/routes.tsx                         — path contracts
  src/hooks/useAppNavigate.ts            — navigation map
  src/services/api.ts                    — API contracts
  src/context/*                          — state shape
  server/**                              — backend entirely
  src/components/ScreenBridge.tsx        — screen HOC wiring
  Any `use*` hook                        — state machines
```

---

## 10. Working mode for Claude Design

Recommended sequence for Claude Design working from this spec:

1. **Read this spec, the tailwind config, and `src/index.css` first.**
2. **Propose updated design tokens** — colours / shadows / radii / typography. Write them into tailwind.config.js + CSS variables. Commit alone.
3. **Refresh UI primitives** (`src/components/ui/*` + `AIOrb.jsx`). Commit.
4. **One screen at a time** — pick the 5 highest-leverage screens (Home, Ask AI, Worksheet generator, Command Centre, Student profile) and refresh their visuals. Commit after each.
5. **Cross-screen consistency pass** — hunt down the inconsistencies listed in Section 7.
6. **Ship** — do not attempt all screens in one PR. We've been burned by big-bang UI changes before (v4 rollback, April 17).

**Never:**
- Add `AnimatePresence mode="wait"` keyed on `location.pathname` around the Outlet. It unmounts screens mid-stream. (Was the root cause of the Ask AI streaming bug.)
- Change the shape of streaming SSE handlers or message rendering logic in `DoubtSolverScreen.jsx` — purely visual changes in that file only.
- Remove the `mountedRef` guard in `DoubtSolverScreen.jsx` — it's defensive against future remount bugs.

**Always:**
- Run `npm run build` after each commit. Fix TypeScript errors.
- Test streaming still works: click a concept in Learn, verify the AI bubble fills with text.
- Test layout doesn't double-mount: open Network tab, click anywhere, verify `/api/user/home-data` fires once per mount.

---

## 11. Meta — what's NOT in this spec

This is a UI-focused spec. For everything else:

- **Features list** → `docs/features-printable.md`
- **Feature build status** → `docs/feature-status.md`
- **Backend architecture** → `docs/architecture.md`
- **API reference** → `docs/api-reference.md`
- **Database schema** → `docs/database.md`
- **LLM prompts** → `docs/llm-prompts.md`
- **Admin guide** → `docs/admin-guide.md`

---

_End of UI spec._
_If Claude Design has questions during the redesign, the fastest answer source is: load a specific screen in dev mode (`npm run dev:all`, login as `teststudent@padee.ai` / `TestPass123!`), and inspect the DOM + Tailwind classes directly._
