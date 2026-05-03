# Padee.ai — UI Spec v5

**Companion to `PRD_v5.md`.** PRD is *what to build*. This is *how it looks*.

Pairs with `Padee_UI_Spec_v3.pdf` (existing, 19+1 screens for v4). v5 adds
**8 new screens + 5 modified screens + 14 new components**. All scoped under
the v4 design system — no new visual language introduced.

---

## 1. Design system (inherited from v4)

Tokens lifted from `src/styles/home-v4.css`. Used verbatim across v5.

### Colours

| Token | Hex | Use |
|---|---|---|
| `--c-accent` | `#E85D3A` | Coral. Primary action buttons (with ink shadow). Brand. |
| `--c-accent-d` | `#B2381B` | Pressed-coral / button shadow `0 3px 0 #B2381B`. |
| `--c-accent-l` | `#FFE7DD` | Coral surface tint (light bg for tags, hover). |
| `--c-amber` | `#FFB547` | Streak, pledge, Pa accents. Eyebrow text on dark cards. |
| `--c-amber-l` | `#FFEFC9` | Soft amber bg for warning banners. |
| `--c-green` | `#36D399` | Mastered / correct / verified. |
| `--c-green-l` | `#DDF6E9` | Soft green bg for success banners. |
| `--c-pink` | `#FF4D8B` | Wrong / alerts. |
| `--c-purple` | `#7C5CFF` | Recommendation / Pa-says highlights. |
| `--c-blue` | `#4C7CFF` | Informational / "next-to-learn". |
| `--c-cyan` | `#2BD3F5` | Revision / refresh accents. |
| `--c-ink` | `#13131A` | Body text, dark cards, primary. |
| `--c-ink-2` | `#2A2A36` | Secondary on dark. |
| `--c-muted` | `#8A8A95` | Subtitle / metadata. |
| `--c-muted-2` | `#B8B8C0` | Disabled / placeholder. |
| `--c-hair` | `#ECECEE` | Hairline borders. |
| `--c-hair-2` | `#F3EFE4` | Paper-on-paper border. |
| `--c-paper` | `#FAF8F4` | Page background. |
| `--c-paper-2` | `#F1EDE2` | Soft section bg (sidebars, toolbar). |
| `--c-card` | `#FFFFFF` | Card surface. |

### Radii

`--r-sm: 8px` · `--r-md: 12px` · `--r-lg: 18px` · `--r-xl: 24px` · `--r-2xl: 32px`

### Shadows

```
--shadow-flat: 0 1px 0 rgba(19,19,26,0.04)
--shadow-card: 0 1px 0 rgba(19,19,26,0.04), 0 8px 22px rgba(19,19,26,0.05)
--shadow-pop:  0 4px 0 rgba(19,19,26,0.05), 0 24px 48px rgba(19,19,26,0.10)
```

### Type scale

| Class | Size · Weight · LH |
|---|---|
| `.t-display` | 44 · 700 · 1.05 |
| `.t-h1` | 30 · 700 · 1.15 |
| `.t-h2` | 22 · 700 · 1.20 |
| `.t-h3` | 18 · 600 · 1.30 |
| `.t-body` | 14 · 400 · 1.50 |
| `.t-sm` | 13 · 400 · 1.50 (muted) |
| `.t-xs` | 12 · 400 · 1.40 (muted) |
| `.t-eyebrow` | 11 · 700 · 0.12em letter, uppercase |

**Fonts**: `Lexend Deca` (body), `Kalam` (handwritten flourishes — Pa whiteboard, "by Pa" attributions). v5 adds **`Noto Sans Devanagari`** as a font-stack fallback when `tutor_language === 'hi'`.

### Buttons

```
.btn-primary
  bg:     var(--c-accent)
  color:  #FFFFFF
  shadow: 0 3px 0 var(--c-accent-d)
  radius: var(--r-md)
  pad:    14px 22px
  weight: 600
  on hover: bg lighten 5%
  on active: translate-y 2px, shadow 0 1px 0

.btn-ghost
  bg:     transparent
  color:  var(--c-ink)
  border: 1px solid var(--c-hair)
  radius: var(--r-md)
  pad:    14px 22px

.btn-danger (destructive — used for "Regenerate code" confirm)
  bg:     var(--c-pink)
  color:  #FFFFFF
  shadow: 0 3px 0 #C63A6E
```

### Layout primitives

All v5 screens follow the **v4 full-bleed pattern**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ HomeTopNav                                  [school pill] [user 🦊] │  56px
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Page content (scrollable, max-width 1200px, centred, 24px gutter)  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ FooterStrip (Pa says... · Listen · Help)                            │  48px
└─────────────────────────────────────────────────────────────────────┘
```

Onboarding screens (`/onboarding/school`, `/onboarding/invite-code`) use the **focus layout** — no top nav, single centred card on paper bg, max-width 480px.

### Breakpoints

- Mobile: `≤640px` — single column; cards stack; tile grids 1-up.
- Tablet: `641–1023px` — 2-up grids; sidebars collapse to top.
- Desktop: `≥1024px` — full layouts as drawn below.

**Primary device target**: Chrome on Android, 360–414px wide. Every screen tested mobile-first.

---

## 2. Per-screen wireframes

### 2.1 `/signup` (modified — 4-tile role picker)

Replaces existing 3-tile picker with 4 tiles. Tiles are square cards, 2x2 grid on desktop, 2x2 on tablet, single column on mobile.

```
                        ┌──────────────────────┐
                        │       Padee.ai       │
                        │  Learn with Pa 🦊    │
                        └──────────────────────┘

   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
   │    🎒          │  │    👨‍🏫           │  │    👨‍👩‍👧          │  │    🏫          │
   │    Student     │  │    Teacher     │  │    Parent      │  │ Create school  │
   │                │  │                │  │                │  │                │
   │  Learn, ask,   │  │  Help students │  │  Track your    │  │  Onboard your  │
   │  practise,     │  │  and assign    │  │  child's       │  │  whole school. │
   │  earn XP.      │  │  homework.     │  │  progress.     │  │  Self-serve.   │
   │                │  │                │  │                │  │                │
   │  [Sign up →]   │  │  [Sign up →]   │  │  [Sign up →]   │  │  [Get started] │
   └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘

                                    Already have an account?  Log in
```

**Per tile**:
- Card: `bg=#FFF`, `radius=24px`, `shadow=--shadow-card`, `padding=24px`, `min-height=240px`
- Emoji: 40px, top
- Title: `t-h2`
- Description: `t-sm`, 2 lines
- Hover: `shadow=--shadow-pop`, `translate-y -2px`
- Tile-specific accent border-top (3px): student=coral, teacher=blue, parent=purple, school=amber

After clicking Student or Teacher, **expanded form appears in-place** with email/password/name **+ optional invite-code field**:

```
┌────────────────────────────────────────────┐
│  🎒  Student                               │
│  Learn, ask, practise, earn XP.            │
│                                            │
│  Email     [________________________]      │
│  Password  [________________________]      │
│  Name      [________________________]      │
│                                            │
│  ─── Are you part of a school? ────────    │
│  School code (optional)                    │
│  [_ _ _ - _ _ _]                           │
│  Skip if you're learning on your own.      │
│                                            │
│           [ Continue to Pa →  ]            │
└────────────────────────────────────────────┘
```

After "Create school", redirects post-signup to `/onboarding/school`.

---

### 2.2 `/onboarding/school`

Focus layout. School admin lands here right after signup.

```
                        ┌──────────────────────┐
                        │  🦊  Hi, I'm Pa.     │
                        │  Let's get your      │
                        │  school onboarded.   │
                        └──────────────────────┘

   ┌────────────────────────────────────────────────────┐
   │  Step 1 of 1                                       │
   │                                                    │
   │  What's your school's name?                        │
   │                                                    │
   │  [______________________________________________]  │
   │                                                    │
   │  This is what your students and teachers will see  │
   │  in their app. You can rename it later.            │
   │                                                    │
   │                          [  Create school  →  ]    │
   └────────────────────────────────────────────────────┘
```

After submit (loading state with Pa's antenna glowing — re-uses `<PaMascot mood="thinking" />`), screen transitions to:

```
   ┌────────────────────────────────────────────────────┐
   │  ✓  DPS Bangalore is ready.                        │
   │                                                    │
   │  Share these codes with your team. They'll enter   │
   │  the code at signup to join your school.           │
   │                                                    │
   │  ┌─────────────────────┐  ┌─────────────────────┐  │
   │  │  STUDENT CODE       │  │  TEACHER CODE       │  │
   │  │                     │  │                     │  │
   │  │     042 - 195       │  │     714 - 308       │  │
   │  │                     │  │                     │  │
   │  │  [📋 Copy] [↻ New]  │  │  [📋 Copy] [↻ New]  │  │
   │  └─────────────────────┘  └─────────────────────┘  │
   │                                                    │
   │              [ Go to school dashboard →  ]         │
   └────────────────────────────────────────────────────┘
```

- Code chip: monospace, `t-h1` size, letter-spacing `0.1em`, ink colour, paper-2 bg, radius `--r-lg`.
- Copy/New are `.btn-ghost` size XS.

**Empty-state copy** if API fails: "Hmm, Pa couldn't reach the server. Try again?" with retry button.

---

### 2.3 `/onboarding/invite-code`

Focus layout, even simpler.

```
   ┌────────────────────────────────────────────────────┐
   │  🦊  Got a code from your school?                  │
   │                                                    │
   │  Enter the 6-digit code you received from your     │
   │  teacher or principal.                             │
   │                                                    │
   │             [ _  _  _  -  _  _  _ ]                │
   │                                                    │
   │              [  Join school  →  ]                  │
   │                                                    │
   │     I don't have a code — I'm learning on my own   │
   │              ↑ underlined link, ink colour         │
   └────────────────────────────────────────────────────┘
```

- Each digit cell: 48×56px, white card, `radius=12px`, `border 1.5px var(--c-hair)`.
- Active cell: `border var(--c-accent)`, ring `0 0 0 3px var(--c-accent-l)`.
- On 6th digit entered: auto-submit (no extra click).
- Hyphen between cells 3 and 4 is a static character, not a cell.
- Error state (invalid code): cells turn pink-bordered with `shake` animation (existing in v4); message below: "That code didn't match a school. Check with your teacher?"

---

### 2.4 `/school` — School admin dashboard

Full v4 layout.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ HomeTopNav: [Padee] DPS BANGALORE  [school pill]      [⚙ admin] [user 🦊] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Welcome back, Principal Sharma 👋                                         │
│  Here's what's happening at DPS Bangalore.                  [Pa says...]   │
│                                                                            │
│  ┌─── 4-tile stat grid (SchoolStatsTiles) ───────────────────────────┐    │
│  │  STUDENTS         TEACHERS         DOUBTS TODAY    DOUBTS 7D     │    │
│  │  124 / 500        8                347             2,184         │    │
│  │  +6 this week     2 active today   ▁▃▅▇▆▄▂        +12% vs prev   │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌──────── Invite codes (2 InviteCodeCard) ──────┐  ┌──── Top weak ────┐ │
│  │  STUDENT CODE          TEACHER CODE           │  │  CONCEPTS         │ │
│  │  042-195               714-308                │  │                   │ │
│  │  124/500 used          8 teachers joined      │  │  ① Refraction     │ │
│  │  [📋] [↻ Regenerate]   [📋] [↻ Regenerate]    │  │     34% mastery   │ │
│  │                                               │  │  ② Trigonometry   │ │
│  │  Share these via WhatsApp, classroom whiteb,  │  │     41% mastery   │ │
│  │  or email. Codes are case-insensitive.        │  │  ③ Acids & Bases  │ │
│  │                                               │  │     46% mastery   │ │
│  │                                               │  │  ④ Linear Eqns    │ │
│  │                                               │  │     49% mastery   │ │
│  │                                               │  │  ⑤ Probability    │ │
│  │                                               │  │     52% mastery   │ │
│  │                                               │  │                   │ │
│  │                                               │  │  [View review →]  │ │
│  └───────────────────────────────────────────────┘  └───────────────────┘ │
│                                                                            │
│  ┌────────── Recent signups (RecentSignupsList) ──────────────────────┐  │
│  │  Aarav Kumar      🎒 Student · Class 10        2 hours ago         │  │
│  │  Priya Mehta      🎒 Student · Class 9         5 hours ago         │  │
│  │  Mr Ramesh Iyer   👨‍🏫 Teacher · Maths           1 day ago            │  │
│  │  Sara Khan        🎒 Student · Class 11        2 days ago          │  │
│  │  ...                                                               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

- 4-tile stat grid: white cards, ink stat numbers (`t-h1`), eyebrow label, sparkline or delta chip.
- Doubts-7d sparkline: 7 bars, `--c-purple` filled, baseline `--c-hair`.
- Cap usage: when `students/maxStudents > 0.8`, the tile turns amber-bordered + warning chip.
- Refresh: silent every 60s while focused; manual refresh icon top-right.

**Empty state** (school just created, 0 students):
```
┌────────────────────────────────────────────────────────┐
│  🦊  Quiet so far. Share your codes!                   │
│                                                        │
│  Once students sign up, you'll see live stats here.    │
│  [📋 Copy student code]   [📋 Copy teacher code]        │
└────────────────────────────────────────────────────────┘
```

---

### 2.5 `/parent` — Parent dashboard

```
┌────────────────────────────────────────────────────────────────────────────┐
│ HomeTopNav: [Padee]                                       [⚙] [user 🦊]   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Hi Mrs Kumar 👋                                                           │
│  Here's how your kids are doing.                              [+ Link]     │
│                                                                            │
│  ┌─── ChildCard ────────────────┐  ┌─── ChildCard ─────────────────┐     │
│  │  Aarav · Class 10            │  │  Diya · Class 7               │     │
│  │  ─────────────────────────── │  │  ──────────────────────────── │     │
│  │  ⚡ 2,340 XP   🔥 12 days     │  │  ⚡ 890 XP    🔥 4 days        │     │
│  │                              │  │                               │     │
│  │  Weakest: Trigonometry       │  │  Weakest: Fractions           │     │
│  │  41% mastery — needs work    │  │  56% mastery — almost there   │     │
│  │                              │  │                               │     │
│  │  Last active: 2 hours ago    │  │  Last active: yesterday       │     │
│  │                              │  │                               │     │
│  │      [ See progress →  ]     │  │     [ See progress →  ]       │     │
│  └──────────────────────────────┘  └───────────────────────────────┘     │
│                                                                            │
│  + Link another child                                                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

- ChildCard: white card, `radius=24px`, `shadow=--shadow-card`, `pad=24px`, `min-height=280px`.
- XP/streak chips: amber/coral filled pills with icons.
- "Weakest" line: amber dot + concept name + percentage + status word (`needs work` / `almost there` / `mastered`).
- Last active: `t-xs` muted.
- CTA button: `.btn-primary`.

**Click "See progress" → opens `<ChildProgressDetail>` modal** (see component spec §3).

**Empty state** (no children linked yet):
```
┌────────────────────────────────────────────────────────┐
│             🦊                                         │
│      No children linked yet.                           │
│                                                        │
│  Link a child to see their daily progress, weak        │
│  topics, and recent test scores.                       │
│                                                        │
│              [ Link your first child →  ]              │
└────────────────────────────────────────────────────────┘
```

---

### 2.6 `/parent/link`

Two-step flow on a single screen.

```
   ┌────────────────────────────────────────────────────┐
   │  Link a child                                      │
   │                                                    │
   │  Step 1 — What's your child's email?              │
   │  (the email they use to log in to Padee.ai)        │
   │                                                    │
   │  [_______________________________________________] │
   │                                                    │
   │                          [  Generate code  →  ]    │
   └────────────────────────────────────────────────────┘
```

After submit:

```
   ┌────────────────────────────────────────────────────┐
   │  ✓  Code generated for Aarav Kumar                 │
   │                                                    │
   │  Step 2 — Show this code to your child            │
   │                                                    │
   │  ┌──────────────────────────────────────────┐     │
   │  │                                          │     │
   │  │           K 7 M 2  X 9 L P               │     │
   │  │                                          │     │
   │  └──────────────────────────────────────────┘     │
   │                                                    │
   │  When Aarav logs in next, they'll see a banner     │
   │  asking to confirm the link. Once they enter this  │
   │  code, you'll see their progress here.             │
   │                                                    │
   │     [ Done — back to dashboard ]                   │
   └────────────────────────────────────────────────────┘
```

- 8-char code: monospace, `t-display` size, letter-spacing `0.15em`, ink, paper-2 bg, `radius=--r-xl`, `pad=32px`.
- Side note (`t-sm` muted): "Code expires in 7 days. You can generate a new one anytime."

**Error states**:
- "We couldn't find anyone with that email. Double-check or ask your child to sign up first." (with link to share signup URL).
- "You're already linked to this child." (already-linked-and-verified)
- "You sent a code already. Show them this code: K7M2X9LP." (already-pending — re-show existing)

---

### 2.7 `/super-admin` — Super admin dashboard

Subtle "Super admin" badge (purple chip) appears in HomeTopNav next to logo.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ HomeTopNav: [Padee] [SUPER ADMIN]                  [⚙] [user 🦊]          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Platform overview                                                         │
│  Real numbers, refreshed every 5 minutes.        Last updated: 2 min ago   │
│                                                                            │
│  ┌─── PlatformMetricsTiles (5 tiles) ──────────────────────────────────┐  │
│  │  TOTAL SCHOOLS  STUDENTS  MAU 7D  DOUBTS 7D  LLM COST 7D  ERROR%   │  │
│  │  12             1,847     923     14,238     $42.18       0.3%     │  │
│  │  +2 this month  +89 wk    78%     ▁▃▆█▆▄▂   ▁▃▅▇         ↓ -0.2pp │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Schools                                              [filter] [search 🔍] │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Name             Students  Teachers  MAU 7D  Doubts 7D  Mastery  Risk│ │
│  │ ─────────────────────────────────────────────────────────────────────│ │
│  │ DPS Bangalore       124       8      96      2,184      67%      🟢 │ │
│  │ Inventure Academy    89      12      71      1,892      71%      🟢 │ │
│  │ Greenwood High       42       5      14        387      48%      🟡 │ │
│  │ Sunrise School      156      14     112      3,041      62%      🟢 │ │
│  │ Ryan Intl              8       1       2         18      —       🔴 │ │
│  │ ...                                                                  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─── Top errors 24h ───────┐  ┌─── Top reported topics ────────────┐    │
│  │  POST /ai/doubt    47    │  │  Refraction               14 flags │    │
│  │  Groq timeout            │  │  Acids & Bases            11 flags │    │
│  │  POST /ai/practice  8    │  │  Quadratic equations       8 flags │    │
│  │  JSON parse error        │  │  Photosynthesis            6 flags │    │
│  │  ...                     │  │  ...                               │    │
│  └──────────────────────────┘  └────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

- Schools table: zebra rows (`--c-paper-2` alt), `radius=--r-lg`, `shadow=--shadow-card`.
- Risk badge: 🟢 green dot (healthy), 🟡 amber (watch), 🔴 red (churn risk — 0 students this week, or MAU dropped ≥30% wk-over-wk).
- Mastery cell: percentage + tiny horizontal bar.
- Click any row → `/super-admin/school/:id` (drill-down).
- Search: filters table by school name (client-side).
- Filter: chip group (`All` · `Healthy` · `Watch` · `At risk`).

**Mobile**: schools become cards; metrics tiles stack 2×3.

---

### 2.8 `/super-admin/school/:id`

Wraps `<SchoolDashboardScreen>` internals with a read-only banner:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ℹ  Viewing DPS Bangalore as super admin. Read-only.    [← Back to all]   │
├────────────────────────────────────────────────────────────────────────────┤
│  ... same layout as /school dashboard ...                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

Banner: `--c-blue-l` bg, `--c-blue` text, `--r-md`, full-width, 12px height, `t-sm`.

Regenerate-code buttons: **disabled with tooltip** ("Only the school admin can regenerate codes").

---

### 2.9 `/settings` (modified)

Adds 2 rows to existing 4-section settings. Inserted between "Goal track" and "Subjects":

```
┌─────────────────────────────────────────────────────────────────┐
│  ─── Pa speaks to me in ──────────────────────────────────────  │
│                                                                 │
│  [ English  ▾ ]                                  [ Save ]       │
│                                                                 │
│  Switching to Hindi: Pa responds in Devanagari, the listen      │
│  button uses a Hindi voice. Math and code stay in English.      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐  ← teachers only
│  ─── Classes I teach ─────────────────────────────────────────  │
│                                                                 │
│  [ ✓ 9 ] [ ✓ 10 ] [   11 ] [   12 ]              [ Save ]       │
│                                                                 │
│  Pick all the classes you teach. You'll see students from all   │
│  selected classes in your dashboard.                            │
└─────────────────────────────────────────────────────────────────┘
```

- Language dropdown: native `<select>`, full-width on mobile.
- Multi-class chips: toggleable, selected = coral fill, unselected = ghost.
- Save buttons per section (existing pattern from v4 settings).

---

### 2.10 `/home` modifications

Two additions to existing `StudentHomeScreenV4`:

**(a) `<PendingLinkBanner>` at top** when an unverified parent link exists for this student:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👨‍👩‍👧  Mrs Kumar wants to link as your parent.                              │
│                                                                         │
│  Enter the 8-character code she gave you to confirm:                    │
│  [ _ _ _ _ _ _ _ _ ]                                       [ Confirm ]  │
│                                                                         │
│  Not your parent? [ Decline link ]                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

- Banner: `--c-amber-l` bg, `--c-amber-d` left border 4px, full-width, `radius=--r-lg`, `pad=16px`.
- 8-char input: monospace, uppercase auto-cap, paper-2 cells.
- On success: banner morphs to green ✓ "Linked! Mrs Kumar can now see your progress." then fades after 3s.
- Decline: confirmation modal → DELETE on the link row (server-side endpoint to add).

**(b) School name pill** in `HomeTopNav` (B2B users only):

```
[Padee] DPS BANGALORE  [streak pill]  ...  [user 🦊]
```

- Pill: `--c-purple-l` bg, `--c-purple` text, `t-eyebrow` size, `padding 4px 10px`, `radius=999px`.
- Hidden for `school_id === null` (B2C).
- Truncates with ellipsis past 24 chars.

---

## 3. Per-component visual spec

### 3.1 `<InviteCodeCard>`

```
┌─────────────────────────────────────┐
│  STUDENT CODE                       │   ← .t-eyebrow
│                                     │
│       0 4 2  -  1 9 5               │   ← .t-h1, monospace, ink
│                                     │
│  124 / 500 used                     │   ← .t-sm muted
│                                     │
│  [📋 Copy]  [↻ Regenerate]          │   ← .btn-ghost size XS
└─────────────────────────────────────┘
   ↑ pad 24px, radius --r-xl, shadow --shadow-card, bg --c-card
```

**States**:
- Idle: as above.
- Hover on card: `shadow=--shadow-pop`, no translate.
- Copy clicked: button text → "✓ Copied!" for 2s with green flash.
- Regenerate clicked: confirm modal → "This will invalidate the old code. Anyone using the old code will need to be re-shared the new one. Continue?" with `.btn-danger` confirm.
- After regenerate: code field flashes amber for 1s while new value renders.

**At-cap state** (`students >= maxStudents * 0.9`): adds amber chip "School almost full" above usage line; usage text turns `--c-amber-d`.

### 3.2 `<InviteCodeInput>`

Length-configurable via `length` prop (6 = school, 8 = parent link).

```
[ _ _ _  -  _ _ _ ]    ← length=6, hyphen at index 3
[ _ _ _ _ _ _ _ _ ]    ← length=8, no hyphen
```

- Each cell: 48×56px (mobile), 56×64px (desktop), white card, `border 1.5px var(--c-hair)`, `radius=--r-md`.
- Active cell: `border var(--c-accent)` + ring `0 0 0 3px var(--c-accent-l)`.
- Filled cell: ink digit, `t-h2`, monospace.
- Numeric-only for length=6; alphanumeric uppercase for length=8.
- Auto-advance on keypress; backspace on empty cell → previous cell.
- Paste support: parses pasted string and distributes across cells.
- Auto-submit on last digit.

### 3.3 `<ChildCard>`

(Wireframe in §2.5.) Mobile: full-width single column. Tablet: 2-up. Desktop: 3-up.

### 3.4 `<ChildProgressDetail>` (modal)

Right-side drawer on desktop (480px wide), full-screen sheet on mobile.

```
┌──────────────────────────────────────────────┐
│  Aarav · Class 10                       [×]  │
├──────────────────────────────────────────────┤
│                                              │
│  ⚡ 2,340 XP    🔥 12 days    🎯 Level 7     │
│                                              │
│  ── Recent activity ──────────────────────   │
│  • Newton's third law (doubt)     2h ago     │
│  • Maths quiz: 8/10               5h ago     │
│  • Photosynthesis (doubt)         yesterday  │
│  • Chemistry quiz: 6/10           yesterday  │
│  • Trigonometry practice: 4/8     2 days ago │
│                                              │
│  ── Concept mastery ──────────────────────   │
│  Force & motion          ████████░░  82%     │
│  Refraction              ██████░░░░  61%     │
│  Trigonometry            ████░░░░░░  41% ⚠   │
│  Acids & bases           ███████░░░  73%     │
│                                              │
│  ── Last 5 tests ─────────────────────────   │
│  Maths · Class test       8/10  · 2 days ago │
│  Science · Mock           7/10  · 1 wk ago   │
│  Maths · Pa-recommended   9/10  · 1 wk ago   │
│  Science · Self-built     6/10  · 2 wks ago  │
│  ...                                         │
│                                              │
└──────────────────────────────────────────────┘
```

- Mastery bar: 8 squares, filled = `--c-green` (mastered ≥80) / `--c-amber` (almost 60–79) / `--c-pink` (needs work <60).
- "⚠" badge appears on rows below 50%.
- Recent activity: bullet list, `t-sm`, max 5 items, "View all →" link to a future screen (deferred to v5.1).

**Privacy**: doubt items show only the **detected concept name**, not the question text or transcript. Same for tests — score and mode, no question content.

### 3.5 `<PendingLinkBanner>`

(Wireframe in §2.10a.) Slides in from top when student loads `/home` and has unverified link.

### 3.6 `<SchoolStatsTiles>`

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ STUDENTS        │ │ TEACHERS        │ │ DOUBTS TODAY    │ │ DOUBTS 7D       │
│                 │ │                 │ │                 │ │                 │
│  124 / 500      │ │       8         │ │      347        │ │     2,184       │
│  ▁▂▃▄▅▆        │ │  2 active today │ │  ▁▃▅▇▆▄▂        │ │  +12% vs prev   │
│  +6 this week   │ │                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

- Tile: white card, `radius=--r-xl`, `pad=20px`, `min-height=140px`.
- Stat number: `t-h1`, ink, tabular-nums.
- Label: `t-eyebrow` muted, top.
- Footer: sparkline OR delta chip OR sub-stat.
- Mobile: 2×2 grid.

### 3.7 `<LanguageToggle>`

Just a styled `<select>`:

```
┌──────────────────────────┐
│  English          ▾      │
└──────────────────────────┘
```

- Width: 200px on desktop, full-width mobile.
- Options: `English` / `हिन्दी`.
- Selected option in Hindi switches the dropdown's own font to `Noto Sans Devanagari`.

### 3.8 `<SchoolsTable>`

(Wireframe in §2.7.)

- Head: `--c-paper-2` bg, `t-eyebrow` muted column labels, sortable triangle on hover.
- Row hover: `--c-paper-2` bg, cursor pointer.
- Risk badges: 🟢🟡🔴 emoji + colour text in last column.
- Pagination: 50 rows per page, "← Prev | Page 1 of 4 | Next →" footer.
- Mobile: collapses to card list, 1 card per school with same data.

### 3.9 `<PlatformMetricsTiles>`

Same shape as `<SchoolStatsTiles>` but 5 across (squeeze tighter on desktop, 2×3 mobile). LLM cost tile uses 7-bar sparkline coloured `--c-purple`.

### 3.10 `<TopErrorsPanel>`

```
┌─── Top errors 24h ──────────────┐
│                                 │
│  POST /ai/doubt          47     │
│  Groq timeout                   │
│  ──────────────────────────     │
│  POST /ai/practice        8     │
│  JSON parse error               │
│  ──────────────────────────     │
│  POST /test/complete      3     │
│  ECONNRESET                     │
└─────────────────────────────────┘
```

- Each row: endpoint (mono `t-sm`) on left, count badge right, sub-line `t-xs` muted.
- Click endpoint → opens admin LLM audit pre-filtered (existing tool).
- Empty state: "No errors in the last 24h. 🎉"

---

## 4. State coverage

Every screen handles these 4 states:

| State | Pattern |
|---|---|
| **Loading** | Skeleton bones (existing v4 utility) on cards. Pa mascot with `mood="thinking"` if it's a long fetch (>1s). |
| **Empty** | Centred mascot + 1-line headline + 1-line copy + CTA. (See `/parent` empty state.) |
| **Error** | Inline red banner: "Pa couldn't reach the server. Try again?" with retry button. **Never** block the whole screen unless auth fails. |
| **Success transient** | Green flash + checkmark + auto-fade after 2s (e.g. "Code copied"). |

---

## 5. Microinteractions

Re-uses v4 patterns + adds three new ones:

- **`celebrate-stamp`** (existing): triggered when school admin first sees their codes. Pa antenna glows, codes scale up briefly.
- **`code-copy-flash`** (new): coral background flash on code chip when copied.
- **`code-regenerate-shake`** (new): old code shakes once, fades to grey, new code fades in from amber.
- **`link-confirmed-pulse`** (new): on `<PendingLinkBanner>` success, banner pulses green twice then fades.

All animations respect `prefers-reduced-motion: reduce` (already wired in v4 — fade-only, no transforms).

---

## 6. Mobile considerations

| Screen | Mobile note |
|---|---|
| `/signup` 4-tile | Stack vertical; reduce tile height to 180px. |
| `/onboarding/school` | Single column, full-width, generous vertical padding. |
| `/onboarding/invite-code` | Cells shrink to 40×52px to fit 6 cells in 360px. |
| `/school` dashboard | Stat tiles 2×2; codes stack; weak concepts panel below codes. |
| `/parent` | ChildCard single column. |
| `/parent/link` | Code displayed at `t-h1` instead of `t-display` to fit. |
| `/super-admin` | Schools table → card list. |
| `/settings` | Existing pattern; new rows inherit. |
| `/home` PendingLinkBanner | Banner full-width above stat strip; code input on its own line below text. |

---

## 7. Microcopy (Pa voice)

Pa is **encouraging, plainspoken, slightly nerdy, never preachy**. v5 copy continues that.

| Surface | Copy |
|---|---|
| `/onboarding/school` headline | "Hi, I'm Pa. Let's get your school onboarded." |
| `/onboarding/school` body | "What's your school's name?" |
| Code-generated success | "✓ {SchoolName} is ready." |
| Codes-shared instructions | "Share these codes with your team. They'll enter the code at signup to join your school." |
| `/onboarding/invite-code` headline | "Got a code from your school?" |
| Skip link | "I don't have a code — I'm learning on my own" |
| Bad code error | "That code didn't match a school. Check with your teacher?" |
| `/school` empty state | "Quiet so far. Share your codes!" |
| `/parent` empty state | "No children linked yet." |
| `/parent` empty state body | "Link a child to see their daily progress, weak topics, and recent test scores." |
| Parent link step 1 | "What's your child's email?" (with sub: "the email they use to log in to Padee.ai") |
| Parent link step 2 | "Show this code to your child" |
| Parent link expiry note | "Code expires in 7 days. You can generate a new one anytime." |
| Student PendingLinkBanner | "{ParentName} wants to link as your parent." |
| Confirm link | "Confirm" |
| Decline link | "Not your parent? Decline link" |
| Link success | "Linked! {ParentName} can now see your progress." |
| Settings — language | "Pa speaks to me in" |
| Settings — language sub | "Switching to Hindi: Pa responds in Devanagari, the listen button uses a Hindi voice. Math and code stay in English." |
| Doubt-cap reached | "Your school has used today's doubt allowance. Pa will be back tomorrow!" (gentle, not blame-y) |

---

## 8. Accessibility

- All new inputs have `<label>` (visible OR `aria-label` if visually hidden).
- Code input cells: `role="textbox"`, `aria-label="digit 3 of 6"`, etc.
- Focus rings: `--c-accent` 3px outline, never removed.
- Colour-only signals always paired with icon or text (risk badges have emoji + text).
- Devanagari content uses `lang="hi"` attribute on the rendered element so screen readers pick the Hindi voice.
- Modals: trap focus + ESC closes + return focus to trigger.
- Min tap target 44×44px on mobile (CTAs already meet this; verified for code cells at 48×56px).

---

## 9. Open visual decisions (for designer review)

These should be locked before Sprint 1 ships:

1. **Super admin badge style** — current spec: small purple `[SUPER ADMIN]` chip in HomeTopNav. Alternative: full topnav goes ink with amber accent ("ops mode"). Recommend chip — keeps consistency.
2. **Code chip typography** — currently spec'd as monospace `t-h1`. Could use a single custom display weight. Recommend stick with system mono for clarity.
3. **Risk indicator** — emoji 🟢🟡🔴 vs custom dot. Emoji renders inconsistently across OSes; custom dot is purer. Recommend custom 8px circles + accessible label.
4. **Children grid breakpoint** — single → 2-up at 641px or 768px? Recommend 768px so phones-in-landscape stay single-column for readability.
5. **PendingLinkBanner placement** — top of `/home` (current spec) vs floating sheet. Recommend top — students might miss a sheet on mobile.
6. **Onboarding skip styling** — text link vs ghost button. Recommend ghost button for tap target on mobile.

---

## 10. Sprint-aligned design deliverables

| Sprint | Designer needs to provide |
|---|---|
| 0 | (None — pure plumbing) |
| 1 | School onboarding hi-fi (3 screens), school dashboard hi-fi, code chip + card visuals locked |
| 2 | Parent dashboard hi-fi (incl. ChildProgressDetail modal), parent link flow, PendingLinkBanner |
| 3 | LanguageToggle (tiny — settings row mock), Devanagari sample render across all v4 screens (smoke test) |
| 4 | Code highlighting theme choice + sample (CS doubt screen mock) |
| 5 | Super admin layouts — 2 screens + 4 panels |

**Total designer effort estimate**: ~5–7 person-days across the 6 sprints, paced to land 1 sprint ahead of frontend implementation.

---

*End of UI Spec v5.*
