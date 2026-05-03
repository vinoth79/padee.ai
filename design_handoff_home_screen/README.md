# Handoff: Padee — Student Home screen (UI only)

## ⚠ Read this first

The files in `reference/` are **design references created in HTML/React-sandbox**. They are **not** production code to drop into your app. Your task with Claude Code is to **re-implement the Home screen's visual design inside your existing codebase**, using your current component library, routing, state, and data sources — with **zero disruption** to behavior, APIs, or other screens.

**Fidelity: High (pixel-level).** Colors, spacing, typography, copy, and shadow values are all intentional — match them.

---

## What "no disruption" means here

This handoff covers **one screen only: Student Home**. Nothing else.

Before touching a line of code, Claude Code should confirm and follow these rules:

1. **Scope lock.** Only the Home route/page is in scope. No shared component gets modified unless it is used *exclusively* on Home. If a shared component (Button, Card, Avatar, etc.) needs a visual variant, add a **new variant** — do not change the default.
2. **No API / data-model changes.** Consume the same data the current Home page consumes. If a piece of UI in the mock needs data the app doesn't already provide, stub it with a local constant and leave a `// TODO(data):` comment — never invent a new endpoint.
3. **No routing / state changes.** Clicks, navigation destinations, and global state stay exactly as they are.
4. **Net-new files over edits.** Prefer creating new CSS modules / styled-components / component files that are imported only by the Home screen. This makes the change easy to revert.
5. **Feature-flag the new Home.** Gate the new design behind a boolean (`NEW_HOME_V4`) and ship the old and new side by side for the first rollout. One import swap reverts it.
6. **Before/after screenshot pass.** After implementation, load every other screen in the app (sidebar, settings, tests, progress, etc.) and confirm nothing looks different. If anything shifted, a shared token or component was touched — back it out.

### Suggested first prompt to paste into Claude Code

> I'm redesigning only the **Student Home** screen. Read `design_handoff_home_screen/README.md` first. Before writing any code:
> 1. Locate the current Home route/component in this repo and summarise what it renders, what data it reads, and what navigation it triggers.
> 2. List every shared component (buttons, cards, avatars, icons, etc.) it uses today, and for each one tell me whether the new design can reuse it as-is, needs a **new variant**, or needs a brand-new Home-scoped component.
> 3. Propose a file plan: which new files you will create, which existing files you will touch, and confirm you will not modify any shared component's default behavior.
> 4. Put the new design behind a `NEW_HOME_V4` feature flag so we can A/B it.
>
> Do not start coding until I approve the plan.

---

## Overview

**Padee** is a learning app for Indian students (CBSE/ICSE, JEE/NEET track). The Home screen is the student's daily cockpit: it tells them what to do right now, what's due, how they're tracking, and gives a single-click start to the highest-value action ("Boss Quest"). The mascot **Pa** surfaces a personalized tip in the right rail.

## Screen in scope

### Student Home (cockpit dashboard)

- **Purpose.** First screen after login. Orients the student, motivates action, starts a learning session in one click.
- **Route.** Whatever the current Home route is (e.g. `/`, `/home`, `/student/home`).
- **Layout.** Full-height app shell with four zones:
  - **Dark top nav** (58px tall, `#13131A` background)
  - **Page body** split into a **main column** (~2fr) and a **right rail** (300px)
  - **Footer strip** (68px, fixed bottom)
- **Max content width.** 1200px centered in main column.

#### Main column — top to bottom

1. **Greeting block.** `GOOD AFTERNOON` eyebrow (11px, uppercase, 0.12em tracking, muted color) + H1 "Hey {name}, ready to level up? 🎯" (30px/700/−0.6px). One-line sub-copy referencing today's goal gap ("You're 15 XP away from today's goal. 4 min of Work & Energy closes it."). On the right of the sub-line: a **Study time today** pill (flat card, clock icon, `22m` in tabular-nums).

2. **Boss Quest card** (dark hero).
   - Background `#13131A`, white text, radius 20px, padding 22px.
   - Amber eyebrow `★ TODAY'S BOSS QUEST`.
   - H2 body line (22px/700): personalised target, e.g. *"Fix your Newton's 2nd Law gap — you got 3/5 wrong yesterday."*
   - Sub-copy (13px, 70% white): why Pa picked it + reward hint.
   - Actions row: **Start boss quest** (vermillion primary, 3px ink drop shadow), **See plan** (white ghost). On the right: three meta chips in tabular-nums — `4 min`, `+50 XP` (amber sparkle), `3 lives` (pink heart).

3. **Two-up row** (below Boss Quest, `grid-template-columns: 1fr 1fr; gap: 14px`):
   - **Continue where you left off** — white card, small subject chip, chapter title, one-line prompt, progress bar 40–70%, "Resume" primary-outline button.
   - **Daily streak** — white card, flame icon (animated `.flame-anim`), "7-day streak!", 7 day dots (filled vermillion for completed, hairline for pending), "Don't break it" sub-copy.

4. **Today's plan list.** Section eyebrow `YOUR PLAN · 3 STEPS`. Three rows in a single card (hairline-separated):
   - Step number circle · subject chip · chapter name · duration · status (done ✓ / now · up next).
   - Hover: row background goes to `var(--c-paper)`. The "now" row is highlighted with an amber-left edge.

5. **Subjects strip** (horizontal row of 5 subject pills with their current mastery ring 0–100%). Clicking a pill navigates to that subject's Learn screen (reuse existing nav; do not add new routes).

#### Right rail — top to bottom (300px wide, `#FFFFFF`, `border-left: 1px solid --c-hair`)

1. **Pa's tip** — amber card (`--c-amber-l` bg, `#E8D79B` border). Mascot avatar top-left, eyebrow "PA'S READ ON TODAY", 13px handwritten-style tip using `Kalam` font only inside the whiteboard card treatment. One line, not more than ~22 words.
2. **Upcoming tests** — flat card, up to 3 rows: test title · subject · due-in chip (red if <48h). "See all" link goes to existing tests route.
3. **XP progress to next level** — mini radial + caption ("560 XP to Level 7").
4. **Weekly streak heatmap** — 7 squares, today outlined. (Same component shape as Progress screen's 7-day view but smaller.)

#### Footer strip (68px, sticky)

- Left: currently-playing subject pill (optional — only shown if a session is paused).
- Middle: one-line contextual tip from Pa ("You study best on Wednesdays. Want to lock one in?").
- Right: global **Ask Pa** button (vermillion, pill, AI sparkle icon). Opens the Ask Pa overlay/route that already exists.

---

## Design tokens (lift these verbatim)

All tokens are in `reference/padee-tokens.css`. The values your devs will need:

### Colors

| Token | Value | Usage |
|---|---|---|
| `--c-accent` | `#E85D3A` | Primary brand (vermillion) — CTAs, active nav, streak badge |
| `--c-accent-d` | `#B2381B` | Active/pressed, drop-shadow on primary buttons |
| `--c-accent-l` | `#FFE7DD` | Tints, active-nav backgrounds in light surfaces |
| `--c-amber` | `#FFB547` | XP, rewards, warnings, Pa's highlights |
| `--c-amber-l` | `#FFEFC9` | Pa-tip card background |
| `--c-green` | `#36D399` | Positive deltas, "done" states |
| `--c-pink` | `#FF4D8B` | Lives, secondary alerts |
| `--c-purple` | `#7C5CFF` | AI / Ask-Pa accent |
| `--c-ink` | `#13131A` | Body text, dark surfaces |
| `--c-ink-bg` | `#13131A` | Boss-quest card, top nav |
| `--c-muted` | `#8A8A95` | Secondary text |
| `--c-hair` | `#ECECEE` | 1px dividers / borders |
| `--c-hair-2` | `#F3EFE4` | Empty progress-bar track |
| `--c-paper` | `#FAF8F4` | Page background |
| `--c-card` | `#FFFFFF` | Card surfaces |

### Type

- **Family:** `Lexend Deca` (weights 300/400/500/600/700). **Fallback:** `-apple-system, system-ui, sans-serif`.
- **Numerics:** always `font-variant-numeric: tabular-nums`. Apply to XP, time, scores, counters.
- **Handwritten (only on "whiteboard" cards):** `Kalam` weights 400/700.
- **Scale:** `display 44/700/−1px` · `h1 30/700/−0.6px` · `h2 22/700/−0.4px` · `h3 18/600/−0.2px` · `body 14/1.5` · `sm 13/1.5 muted` · `xs 12/1.4 muted` · `eyebrow 11/700 uppercase 0.12em muted`.

### Radii / shadows / spacing

- Radii: `8 / 12 / 18 / 24 / 32`. Cards = 24, buttons = 14, chips = 99 (pill).
- Shadow (card): `0 1px 0 rgba(19,19,26,0.04), 0 8px 22px rgba(19,19,26,0.05)`
- Shadow (primary button): `0 3px 0 var(--c-accent-d)` (chunky skeuomorphic).
- Spacing: 4 / 6 / 10 / 14 / 18 / 22 / 28 px. Page padding is `24 28`.

### Iconography

- Line icons, 1.8px stroke, rounded caps/joins, 18–20px. See the `Ico` component in `reference/padee-shared.jsx` for the full set. In your app, use your existing icon library (e.g. `lucide-react`) with the same stroke weight — do **not** import the demo's inline SVGs wholesale.

### Mascot — Pa

- A round, friendly blob. Three expressions: **idle**, **thinking**, **speaking**. Used in: right-rail tip, footer strip, any empty-state prompts. See `reference/padee-mascot.jsx` for the illustration source. If your codebase already has an asset pipeline, ask design for a clean SVG export rather than inlining the React-drawn mascot.

---

## State required

All of these already exist somewhere in your Home data contract; **do not add new fetches.** If one is missing, stub it.

- `user.firstName`, `user.level`, `user.xpToday`, `user.xpGoalToday`, `user.streakDays`
- `bossQuest`: `{ title, reason, durationMin, xpReward, livesRequired, targetConceptId }`
- `resumeSession`: `{ subject, chapter, progressPct, deepLink }`
- `todaysPlan`: `[{ subject, chapter, durationMin, status: 'done' | 'now' | 'next' }]`
- `subjects`: `[{ name, color, masteryPct }]`
- `paTip`: `string`
- `upcomingTests`: `[{ title, subject, dueAt }]`
- `weeklyHeatmap`: `[{ date, xp }]`

## Interactions

- **Boss Quest primary CTA** — opens the existing practice/test session flow for `targetConceptId`. Use the app's existing navigation; do not create a new route.
- **Resume card** — deep-links into the last paused session (existing behavior).
- **Subject pill** — navigates to Learn > Subject (existing route).
- **Pa's tip card** — click opens Ask Pa with the tip pre-filled as the prompt (if Ask Pa exists; otherwise no-op).
- **Flame** — has a 1.6s `flicker` animation (`transform: scale + rotate`). Keep it CSS-only; don't add motion libraries for this.
- **Hover states** — cards don't lift; only the primary CTA does (`box-shadow: 0 4px 0 accent-d, 0 8px 20px rgba(232,93,58,0.25)`).

## Files in this bundle

- `reference/Padee v4 — Flagship + Student Core (standalone).html` — **open this in a browser.** It's the single-file live prototype; the Home screen is the first artboard.
- `reference/padee-tokens.css` — authoritative token source. Copy values into your design-system file.
- `reference/padee-flagship.jsx` — contains the `StudentHome` component (first function in the file). Read for layout reference only; do not port as-is.
- `reference/padee-shared.jsx` — helpers used by `StudentHome`: `StudentShell`, `Ico`, `Avatar`, icon set, chips. Read for structure; re-implement using your existing primitives.
- `reference/padee-mascot.jsx` — Pa illustration source.
- `reference/base.css` — reset/normalize used by the prototype. Your app has its own; **ignore this file**.

## Open questions the developer should ask you

1. Is there a design-token file in the repo (e.g. `tokens.ts`, `theme.ts`, Tailwind config)? Extend that instead of creating a new one.
2. Which icon library does the app use today? Match strokes to match this design.
3. Is `Lexend Deca` already loaded? If not, add it to the existing font loader — don't inject a new `<link>` tag on the Home page only.
4. Does the app support dark mode? This design is light-only — if a dark mode exists, Home should follow the app's existing dark-mode rules for tokens we've defined.
