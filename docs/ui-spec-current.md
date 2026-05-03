# Padee.ai — Current UI Spec (v4)

**Generated:** April 26, 2026
**Purpose:** Faithful reference for the v4 UI as it ships today. Use this when extending the design system or onboarding a new engineer/designer.
**Scope:** Documents what exists. For prescriptive design changes, update CSS first, then update this doc.

---

## 0. How to read this document

1. **Tokens** are scoped under `.home-v4` (see `src/styles/home-v4.css`). Per-screen tweaks live in `*-v4.css` files that compose with the shared tokens.
2. **All v4 screens are full-bleed** — they own their own `HomeTopNav` + `FooterStrip`, do **not** nest inside `StudentLayout`. The legacy `StudentLayout` is now a near-empty shell holding only Phase-2 placeholder routes (`/parent`, `/jee-neet`).
3. **Screen list is in `src/routes.tsx`** — that is the source of truth.

---

## 1. Design tokens

### 1.1 Colours

Tokens defined at the top of `src/styles/home-v4.css` and inherited by every v4 screen. Inline-equivalents used directly in `.tsx` for screens that mount before the v4 stylesheet loads (Landing, Login, Signup, Onboarding).

```
BRAND — Coral / Pa palette
  c-accent       #E85D3A   primary action — buttons, eyebrows, focus borders
  c-accent-d     #B2381B   ink shadow under primary buttons (3px-4px drop)
  c-accent-l     #FFE7DD   tinted button hover, selected-tile fills, error backgrounds

INK — Pa's mascot + dark surfaces
  c-ink          #13131A   primary text, dark hero cards, dark top nav
  c-ink-2        #2A2A36   secondary text on light surfaces
  c-ink-bg       #13131A   dark hero card / minimal test-mode top bar background

SURFACES
  c-paper        #FAF8F4   page background (warm off-white)
  c-paper-2      #F1EDE2   alt paper (subtle section fill)
  c-card         #FFFFFF   card fill
  c-hair         #ECECEE   default border / divider hairline
  c-hair-2       #F3EFE4   warm-tinted divider (used inside cards)

ACCENTS — semantic + subject
  c-amber        #FFB547   streak / Pa antenna / warnings / "almost there"
  c-amber-l      #FFEFC9   tinted backgrounds (hint box, "Coming soon" pills)
  c-green        #36D399   correct, mastered, online indicator
  c-green-l      #DDF6E9   correct option fill, success card backgrounds
  c-pink         #FF4D8B   wrong answers, alerts (used sparingly)
  c-pink-l       #FFE0EC   wrong-answer card backgrounds
  c-purple       #7C5CFF   maths subject / "main goal" accent
  c-purple-l     #ECE5FF   maths icon background
  c-blue         #4C7CFF   physics subject / Challenge Me block
  c-blue-l       #E0ECFF
  c-cyan         #2BD3F5   computer science subject
  c-violet       #9B5DE5

TEXT
  c-muted        #8A8A95   secondary text, eyebrows, labels
  c-muted-2      #B8B8C0   tertiary / placeholders / disabled

DEPRECATED — v3 tokens, no longer used
  Forest Teal #0D9488 — gone. Replaced by coral c-accent.
  DM Sans — gone. Replaced by Lexend Deca.
```

### 1.2 Typography

**Family:** **Lexend Deca** (body, all UI). **Kalam** for handwritten flourishes (Pa's whiteboard equation on landing). **DM Mono** for tabular numerals where used. KaTeX ships its own math fonts.

**Base size:** 14-15px (compact, comfortable for K12 readability on phones).

```
t-display  44px  weight 700  letter-spacing -1px       — landing headline
t-h1       30px  weight 700  letter-spacing -0.6px     — page titles, results-screen hero
t-h2       22px  weight 700  letter-spacing -0.4px     — card titles, modal headers
t-h3       18px  weight 600  letter-spacing -0.2px     — minor headings
t-body     14px  line 1.5
t-sm       13px  line 1.5    color c-muted             — secondary copy
t-xs       12px  line 1.4    color c-muted             — meta, captions
t-eyebrow  11px  weight 700  letter-spacing 0.12em     — section labels (uppercase)
.tabular   font-variant-numeric: tabular-nums           — XP counts, timers
```

### 1.3 Shadows

```
shadow-flat       0 1px 0 rgba(19,19,26,0.04)                                — subtle card edge
shadow-card       0 1px 0 rgba(19,19,26,0.04), 0 8px 22px rgba(19,19,26,0.05) — elevated card
shadow-pop        0 4px 0 rgba(19,19,26,0.05), 0 24px 48px rgba(19,19,26,0.10) — modals, floating chips
ink shadow        0 3px 0 #B2381B (under primary coral CTAs — gives the "pressable" depth)
button active     transform: translateY(1px) — buttons compress on click
```

### 1.4 Radii

```
r-sm   8px    chips, small pills
r-md   10px   inputs, secondary buttons
r-lg   12px   primary buttons, option cards
r-xl   14-18px  cards, modals
r-2xl  22-28px  hero cards (landing, test results)
99px / 999px  full pill — chips, streak/user-mini badges, listen button
```

### 1.5 Motion

```
quick      120-180ms ease       — hover, click, focus transitions
medium     200-350ms ease-out   — modal pop, banner reveal
slow       1.2s ease-out        — score-ring stroke fill on results screen

pa-breathe          3.2s — Pa mascot idle scale pulse (always on)
pa-celebrate        0.9s loop — bounce + scale (when student crushes goal)
pa-glow            1.6s — antenna ball drop-shadow pulse (streak ≥ 3)
pa-mouth-bob       0.32s loop — speaking-mood mouth scaleY (drives off SpeechContext)
listen-pulse       1.2s — Listen button icon scale while audio plays
listen-spin        0.9s linear — loading spinner on Listen button (server fetch)
load-bounce        0.9s — generic three-dot loader

prefers-reduced-motion: all looping animations disabled.
```

---

## 2. Layout primitives

### 2.1 Full-bleed v4 screen shell

Every student-facing v4 screen has this structure:

```
<div className="home-v4 [screen-specific class]">
  <HomeTopNav user streak active onNavigate />     ← sticky, dark, 60px
  <div className="pd-page">                          ← max-width container
    <div className="pd-body-grid">                   ← main + 280px right rail
      <main className="pd-body-main">…</main>
      <aside className="pd-body-rail">…</aside>
    </div>
  </div>
  <FooterStrip xpToday week mastery badges totalBadges />  ← sticky, 68px
</div>
```

`StudentHomeScreenV4`, `LearnScreenV4`, `TestListScreenV4`, `ProgressScreenV4`, `DoubtSolverScreenV4`, `PracticeRunScreenV4`, `SettingsScreen`, `TestResultsScreenV4` all use this shell.

### 2.2 Test-mode shell (`TestActiveScreenV4`)

Stripped chrome — minimal "test mode" top bar (logo + title + prominent timer + All Qs + Exit). **No nav pills** during the timed test. No right rail. No footer strip. Single column. Bottom progress bar on the top nav fills as the student answers.

### 2.3 Auth + onboarding shells

Landing, Login, Signup, OnboardingClass/Subjects/Track all render full-bleed with their own minimal top bars (logo + role-switch CTA / step indicator). Inline-styled — no `home-v4.css` token dependency, so they load fast before any auth state settles.

### 2.4 StudentLayout (legacy)

Now wraps only `/parent`, `/jee-neet`, `/dashboard` — all of which are `<Navigate to="/home" replace />` placeholders. The sidebar inside StudentLayout is effectively dormant. Will be deletable once parent v4 lands.

### 2.5 TeacherLayout

Still v3-styled. Wraps every `/teacher/*` route. **Next planned UI rebuild target.**

---

## 3. Screen inventory

| Path | Component | Type | Purpose |
|---|---|---|---|
| `/` | `LandingPage` (v4) | Public | Marketing landing with Pa chat mockup hero |
| `/login` | `LoginScreen` (v4) | Public | Two-column login + dark stats panel |
| `/signup` | `SignupScreen` (v4) | Public | Role picker (Student / Parent / Teacher) + DPDP-aligned consent |
| `/admin` | `AdminScreen` | Public-but-gated | Internal admin panel — separate visual treatment, not v4 |
| `/onboarding/class` | `OnboardingClass` (v4) | Auth | Step 1 — class (8-12) + board picker |
| `/onboarding/subjects` | `OnboardingSubjects` (v4) | Auth | Step 2 — subjects with Pa auto-select + Reset |
| `/onboarding/track` | `OnboardingTrack` (v4) | Auth | Step 3 — goal track + daily XP pledge + study days |
| `/onboarding` | `OnboardingScreen` | Auth | Legacy fallback (rarely hit) |
| `/splash` | `SplashScreen` | Public | Auto-redirect splash |
| `/home` | `StudentHomeScreenV4` | Student | Boss Quest hero + 3-up cards + weak spots + upcoming tests + right rail + re-plan banner |
| `/ask` | `DoubtSolverScreenV4` | Student | Doubt solver with KaTeX, Listen, InlineQuiz, ChallengeView, Visual Explanation |
| `/learn` | `LearnScreenV4` | Student | Subject pill tabs + dark subject hero + Pa cue + chapter rows |
| `/practice` | `PracticeRunScreenV4` | Student | Per-question difficulty + hint + skip + KaTeX + concept-tagged mastery |
| `/tests` | `TestListScreenV4` | Student | 3 sections: TEACHER-ASSIGNED, PA RECOMMENDS, BUILD YOUR OWN |
| `/tests/active` | `TestActiveScreenV4` | Student | Minimal "test mode" timed exam UI |
| `/tests/results` | `TestResultsScreenV4` | Student | Hero ring + grid + What went wrong + Pa's Debrief sticky sidebar |
| `/progress` | `ProgressScreenV4` | Student | Dark profile hero + weekly XP bars + mastery rows |
| `/settings` | `SettingsScreen` | Student | Edit pledge / days / track / subjects independently |
| `/parent` | `Navigate to /home` | Phase-2 placeholder | Parent v4 pending |
| `/jee-neet` | `Navigate to /home` | Phase-2 placeholder | JEE/NEET track pending |
| `/dashboard` | `Navigate to /home` | Alias | Legacy redirect |
| `/teacher/*` | TeacherDashboardScreen, etc. | Teacher | All v3-styled — **next UI rebuild** |

---

## 4. Component inventory

### 4.1 Shared chrome — `src/components/home-v4/`

- `HomeTopNav.jsx` — dark 60px top bar with logo + nav pills (Home/Ask Pa/Learn/Tests/Progress) + search box + streak badge + user-mini chip with dropdown menu (Profile / Settings / Logout)
- `FooterStrip.jsx` — sticky 68px footer with today XP ring, weekly bar chart, subject mastery dots, badge row
- `Ico.jsx` — inline SVG icon library (home/ask/learn/tests/progress/clock/sparkle/heart/arrow/chevronR/search/play/flag/flame/trophy/check/x/bulb)
- `PaMascot.jsx` — the orange Pa mascot SVG. Props: `size`, `mood` (idle/thinking/speaking/celebrate), `glow` (antenna), `syncWithSpeech` (subscribes to global TTS state for mouth-bob)

### 4.2 Home cards — `src/components/home-v4/`

- `BossQuestCard.jsx` — concept-level recommendation hero (4 hero types)
- `QuestCard.jsx` — generic 3-up row card
- `YourProgressCard.jsx` — strengths + weak spots
- `RailWidgets.jsx` — `PaStatusCard`, `QuickQuestCard`, `AskPaSuggestions`, `ResumeCard`
- `StreakAtRiskBanner.jsx` — amber strip when today's pledge XP not hit
- `ReplanCheckInBanner.jsx` — soft amber strip when `pledged_days_missed >= 3`
- `RecentDoubts.jsx`, `RecentWins.jsx`, `TodayActivity.jsx`, `SubjectsGrid.jsx`, `WeakSpotsCard.jsx`, `UpcomingTestsCard.jsx`

### 4.3 Ask Pa — `src/components/ask-v4/`

- `PaBubble.jsx` — Pa response bubble with mascot, MathText body, chip row, feedback icons, copy button, Listen button
- `StudentBubble.jsx` — student message bubble (dark)
- `AskInput.jsx` — pill-shaped input with camera + send
- `AskHeader.jsx` — clear chat / subject indicator
- `InlineQuiz.jsx` — Quiz Me chip widget (1 MCQ from chat context)
- `ChallengeView.jsx` — Challenge Me chip widget (problem with gated solution reveal)
- `VisualExplanationBubble.jsx` — Visual chip widget (sandboxed iframe + Expand modal)
- `FeedbackIcons.jsx` — thumbs up/down + flag icons

### 4.4 Practice + Tests — `src/components/practice-v4/`, `src/components/tests-v4/`, `src/components/test-v4/`

- Practice: `QuestionStrip.jsx`, `OptionCard.jsx`, `HintBox.jsx`, `ReportModal.jsx`, `ExitConfirm.jsx`
- Tests list: `TabRow.jsx`, `UrgentPrepBanner.jsx`, `UpcomingTestRow.jsx`, `PaRecommendsCard.jsx`, `SelfPickTestCard.jsx`, `PastTestCard.jsx`
- Tests active/results: inline-defined components inside the screen files (Header, Modal, ScoreRing, AiInsightsCard, ReviewItem, etc.)

### 4.5 Learn + Progress — `src/components/learn-v4/`, `src/components/progress-v4/`

Per-section cards matching the v4 design language. See routes.tsx for the screens that mount them.

### 4.6 UI primitives — `src/components/ui/`

- `MathText.tsx` — splits text on `$...$` / `$$...$$`, renders math via KaTeX, plain segments via inline markdown (bold/italic/code). Streaming-aware (renders plain pre-wrap until stream completes, then swaps to typeset).
- `ListenButton.jsx` — 🔊 / ⏸ / spinner toggle, drives off `useSpeech()`. Hidden when speech unsupported. Variants: `icon` (compact) and `labeled` (with text).
- `DifficultyBadge.jsx`, `LevelBadge.jsx`, `MasteryChip.jsx`, `ProgressBar.jsx`, `ScoreRing.jsx`, `SubjectPill.jsx`, `XPToast.jsx`

### 4.7 Recommendation cards — `src/components/recommendations/`

`RecommendationCards.jsx` exports `HeroCard`, `WeakConceptCard`, `RevisionCard`, `NextToLearnCard`, `SupportingCardsRow`. Used by the home Boss Quest section.

### 4.8 Teacher — `src/components/teacher/`

`TeacherAlertFeed.tsx` and others. **All v3-styled.**

### 4.9 Admin — `src/components/admin/`

`ConceptCatalogTab.tsx` and others. Internal tool, intentionally separate styling.

### 4.10 Celebrations — `src/components/celebrations/`

`CelebrationHost.jsx`, `LevelUpOverlay.jsx`, `BadgeUnlockSheet.jsx`, `Confetti.jsx`. Mounted in StudentLayout (currently dormant since v4 screens are full-bleed). **Known follow-up**: re-mount under the v4 shells.

---

## 5. Interaction patterns currently in use

### 5.1 Streaming SSE responses (Ask Pa)

Token-by-token text streaming. During streaming `MathText` renders plain pre-wrap (no math rendering — half-rendered LaTeX would look broken mid-stream). When `streaming=false`, swaps to typeset KaTeX. ~3-5 second "pop" when stream completes.

### 5.2 Action chips (Ask Pa, 8 chips)

Render only on completed AI bubbles. Clicking dispatches `handleChip(key)` in the parent. Quiz Me toggles an inline widget on the message; Challenge Me sends a structured prompt and tags the resulting bubble; other chips send a topic-anchored doubt message with `fromChip: true` so the next chip's topic-lookup loop skips them (no nesting).

### 5.3 Quality signals

Thumbs up/down → inline reason chips → `doubt_feedback` write. Flag icon opens bottom-sheet modal with reason chips → `flagged_responses` write.

### 5.4 Speech / Listen

Single `SpeechContext` provider mounted in `main.tsx` between `UserProvider` and `RouterProvider`. `useSpeech()` hook returns `{ supported, speaking, loading, speak, stop, toggle, rate, setRate }`. Only one TTS plays at a time across the app — starting a new Listen anywhere stops any in-flight audio. Pa mascots with `syncWithSpeech={true}` subscribe to the speaking state and force mood to `'speaking'` + apply mouth-bob animation. Tab-hide auto-stops speech.

### 5.5 Celebration queue

`CelebrationHost` consumes a queue of `{ type, payload }` events from `UserContext.celebrations`. Currently mounts inside `StudentLayout`, which is dormant. The queue still fires but visuals don't show — **known follow-up**: re-mount under v4 shells.

### 5.6 Loading states

Dot-bounce pattern (3 coral dots cycling 0.18s offset) used everywhere. Skeleton blocks for whole-page loads (see Home screen profile-loading branch).

### 5.7 Error states

Soft errors: amber strip with retry. Hard errors (e.g. test submission failure): full-page Pa-thinking message with Back-to-tests / Retry buttons.

---

## 6. Responsive behaviour

### 6.1 Breakpoints

```
< 480px    tight phone — chips column-stack, hero ring centered, results actions full-width
< 600px    phone — multi-CTA rows wrap, action lists stack vertically
< 720px    small tablet — hero card flex-direction: column (results screen)
< 760px    tablet — test active strip-row stacks, options compact
< 860px    medium tablet — practice rail drops below main column
< 980px    medium tablet — results Pa debrief sidebar drops below main, no longer sticky
< 1024px   small desktop — right rail can shrink/collapse depending on screen
```

### 6.2 Mobile-first concerns

- HomeTopNav nav pills hide their text labels on `< 760px`, showing icon-only
- Footer strip collapses to a thin XP-only bar on phones
- KaTeX displays use `overflow-x: auto` so long equations scroll instead of break the layout
- Inline iframes (visual explanations) cap at `max-width: 480px` then auto-size
- Listen button hides label on small screens (icon-only variant)

---

## 7. Where to look when extending the v4 system

| Need | Source of truth |
|---|---|
| Add a new student screen | `src/routes.tsx` + new `*-v4.css` + screen file using `<HomeTopNav />` + `<FooterStrip />` |
| Add a new color | `src/styles/home-v4.css` `:root .home-v4 { ... }` block |
| Add a new icon | `src/components/home-v4/Ico.jsx` PATHS map |
| Add a new mood / animation to Pa | `src/components/home-v4/PaMascot.jsx` + keyframes in `home-v4.css` |
| Add new TTS behavior | `src/context/SpeechContext.jsx` |
| Add LaTeX support to a new render point | wrap with `<MathText text={…} inlineOnly />` |
| Wire a Listen button | drop `<ListenButton text={…} />` from `src/components/ui/` |
| Test-mode UI | `src/styles/test-v4.css` (test active) and `src/styles/test-results-v4.css` |
| Modify the home Boss Quest hero | `src/components/home-v4/BossQuestCard.jsx` |
| New onboarding step | new screen + add to `src/routes.tsx` between `/onboarding/track` and `/home` |

---

## 8. Stale / deprecated (do not use)

These existed in v3 and are gone:

- `tailwind.config.js` color palette (Forest Teal, etc.) — token-style classes still work via Tailwind but the v4 components don't use them
- `src/index.css` legacy CSS variables — superseded by `home-v4.css`
- DM Sans typography — replaced by Lexend Deca
- `StudentLayout` sidebar chrome — visible only on the dormant `/parent` and `/jee-neet` routes
- `NEW_HOME_V4` flag — removed entirely Apr 26
- `stripLatex()` defensive frontend helper — removed; KaTeX is now the renderer
- `padee-preloaded-practice-v1-*` localStorage cache key — discarded (v2 in use)
