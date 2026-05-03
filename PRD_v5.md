# Padee.ai — PRD v5

**Status**: Draft, ready for build · **Author**: Vinoth + Claude · **Date**: 2026-05-03

PRD v4.x got the single-school student journey end-to-end. PRD v5 turns that
into a platform that schools, parents, and Hindi-medium students can use,
plus a centralised super-admin view to monitor every school's health.

This is a **scope doc**, not a design doc. UX details land in a follow-up.

---

## Why this PRD exists

After the Apr 25 onboarding rebrand and the Apr 15 recommendation engine,
v4 is feature-complete for a single-tenant pilot. The next 6 weeks of work
is structural:

1. **Multi-tenancy** — schools must be first-class.
2. **Parent surface** — currently a `Navigate to /home` placeholder.
3. **Hindi tutoring** — the largest underserved market for K12 in India.
4. **Coding support** — CBSE has CS in Class 11–12; competing apps don't tutor it well.
5. **Super admin** — Vinoth needs one URL to see every school's health.

We are explicitly **not** building billing in v5. Pricing is deferred until
traction is real. Free for everyone, capped by per-school doubt limits to
contain LLM spend.

---

## Locked decisions

| # | Decision | Why |
|---|---|---|
| 1 | **Free for everyone** | Build traction first; pricing later. Per-school + per-user rate limits are the spend fuse. |
| 2 | **Self-serve invite codes** | School admin signs up, gets a 6-digit code, shares with teachers + students. No CSV upload, no email invites, no SSO. |
| 3 | **Coding = LLM-only (easy path)** | No code execution sandbox in v5. Pa explains code, doesn't run it. Revisit if students complain. |
| 4 | **Hindi = tutoring-language only** | UI stays English. Per-user `tutor_language` toggle. LLM responds in Hindi/Devanagari, TTS swaps voice. NCERT chunks stay English (LLM translates at response time). |

---

## Personas

- **Student (B2C)** — Existing v4 flow. Signs up at `/signup`, no school code, default `tutor_language = 'en'`. Optionally toggles Hindi in settings.
- **Student (B2B)** — Same flow + enters student invite code at signup → `profile.school_id` set. School-bound features (assignments, school-internal tests) become visible.
- **Teacher** — Same v4 teacher screens. Now scoped strictly to their school's students. Can teach multiple classes via `teacher_classes`.
- **School admin** (new) — Provisions the school, manages teacher + student invite codes, sees school dashboard.
- **Parent** (new) — Links to one or more children. Sees children's progress. Read-only in v5.
- **Super admin** (new) — Padee staff. Sees all schools, all metrics. Single URL.
- **Ops admin** (existing, renamed mentally to `admin`) — Vinoth + dev team. NCERT content uploads, LLM audit, concept catalog, config. Unchanged.

---

## Schema deltas

All in **`supabase/migrations/012_multitenant_v5.sql`**. Summary:

| Object | Type | Purpose |
|---|---|---|
| `schools` | new table | Multi-tenant root. Holds invite codes + caps. |
| `profiles.school_id` | new column | NULL = B2C. NOT NULL = belongs to a school. |
| `profiles.tutor_language` | new column | `'en'` (default) or `'hi'`. |
| `profiles.role` CHECK | expanded | + `'parent'` (now declared), `'school_admin'`, `'super_admin'`. |
| `teacher_classes` | new join table | Teacher ↔ N classes. Backfilled from existing `profiles.class_level`. |
| `parent_student_links` | new join table | Parent ↔ N students. Includes `link_code` + `verified_at`. |
| RLS policies | added | Teachers see same-school profiles. Super admin sees all. Parents see own links. Students confirm own links. |
| `generate_school_invite_code()` | new function | 6-digit unique-across-both-columns code generator. |

**Backwards compatibility**: every existing user gets `school_id = NULL` and
`tutor_language = 'en'`. Every existing teacher gets one `teacher_classes`
row. No screen breaks on day 1.

---

## New endpoints

```
School onboarding
─────────────────
POST   /api/school/create
       body: { name }
       auth: any logged-in user (becomes school_admin)
       returns: { id, name, inviteCodeStudent, inviteCodeTeacher }
       sets: profile.school_id, profile.role = 'school_admin'

POST   /api/school/regenerate-code
       body: { type: 'student' | 'teacher' }
       auth: school_admin of that school
       returns: { code }

GET    /api/school/dashboard
       auth: school_admin
       returns: {
         school: { name, codes, caps },
         counts: { students, teachers, doubtsToday, doubtsLast7d },
         topConcerns: [...],          // weakest concepts in school
         recentSignups: [...]
       }

POST   /api/auth/redeem-invite
       body: { code }
       auth: any logged-in student or teacher with school_id IS NULL
       behaviour:
         - looks up code across both columns
         - if student code → role stays 'student', school_id set
         - if teacher code → role becomes 'teacher', school_id set
         - rejects if school is at max_students cap
       returns: { school: { id, name } }

Parents
───────
POST   /api/parent/link
       body: { studentEmail }
       auth: parent
       behaviour:
         - looks up student by email
         - inserts parent_student_links with random 8-char link_code
         - returns code; parent shows it to student
       returns: { linkCode, studentName }

POST   /api/parent/verify
       body: { linkCode }
       auth: student
       behaviour: sets verified_at on the matching link
       returns: { parentName }

GET    /api/parent/children
       auth: parent
       returns: [{
         studentId, name, classLevel, totalXP, streak,
         weakestSubject, lastActiveAt, masteryByConcept: [...]
       }]   // only verified links

Super admin
───────────
GET    /api/super-admin/schools
       auth: super_admin
       returns: [{
         id, name, students, teachers, mauLast7d,
         doubtsLast7d, llmCostLast7dEstimate, avgMastery, churnRisk
       }]

GET    /api/super-admin/school/:id
       auth: super_admin
       returns: deep dive — same shape as /school/dashboard but for any school

GET    /api/super-admin/metrics
       auth: super_admin
       returns: {
         platform: { mau, doubtsToday, signupsLast7d, errorRateLast24h },
         financial: { totalLLMCostLast7d, costPerActiveUser },
         topErrors: [{ endpoint, count, lastSeen }],
         topReportedTopics: [...]
       }

User preferences
────────────────
PATCH  /api/user/tutor-language
       body: { language: 'en' | 'hi' }
       auth: any user
       returns: { tutorLanguage }
```

**11 new endpoints total.** Existing endpoints get small deltas:

- `/api/teacher/students` adds `school_id` filter (was `class_level` only — silent cross-school leak today).
- `/api/teacher/student/:id` adds `school_id` check on the student.
- `/api/ai/doubt` reads `tutor_language` from profile, injects language directive into system prompt; checks per-school doubt cap before LLM call.
- `/api/ai/practice` + `/api/test/start` JSON-mode prompts get the language directive too.
- `/api/ai/tts` reads `tutor_language` to choose `hi-IN-Wavenet-D` vs `en-IN-Wavenet-D`.
- Semantic cache key in `/api/ai/doubt` includes `tutor_language` (today's key collides Hindi vs English questions).

---

## New screens

| Route | Persona | Effort |
|---|---|---|
| `/signup` (modified) | All | XS — add "Create school" 4th tile in role picker. |
| `/onboarding/school` | school_admin | S — single form, name input, then shows codes with copy buttons. |
| `/onboarding/invite-code` | student / teacher | XS — single 6-digit input, skippable "I'm not part of a school". |
| `/school` | school_admin | M — dashboard: counts, codes (copyable, regenerable), recent signups, doubts/day chart, top weak concepts. |
| `/parent` | parent | L — children list, per-child progress card, "link new child" CTA. Replaces current `Navigate to /home` placeholder. |
| `/parent/link` | parent | M — email input → shows link code → "show this to your child" instructions. |
| `/settings` (modified) | All | XS — add tutor-language dropdown row. |
| `/super-admin` | super_admin | L — schools list (sortable), platform metrics tiles, drill-into-school flow. |

The existing student v4 flow (`/home`, `/ask`, `/practice`, `/tests`,
`/learn`, `/progress`) is **unchanged in v5**. School-scoped data filtering
happens server-side; the frontend doesn't know whether the student is B2C
or B2B except for an optional school-name pill in the topnav.

---

## Frontend implementation plan

The codebase conventions (from `CLAUDE.md`) constrain everything below:

- All API calls go through `src/services/api.ts` (no direct `fetch` in screens, except SSE streaming).
- v4 screens are full-bleed — they own `HomeTopNav` + `FooterStrip`, do **not** nest in `StudentLayout`.
- Styles scoped under `.home-v4` or per-screen `*-v4.css`.
- All session/profile state in `AuthContext` / `UserContext` / `SpeechContext`.
- React Router v7 with `ProtectedRoute` pattern.
- LLM responses use `$...$` LaTeX and render via `MathText` (KaTeX).

### Routing (`src/routes.tsx`)

8 new routes + 1 helper component:

```
/onboarding/school                SchoolOnboardingScreen        role=school_admin, no school_id yet
/onboarding/invite-code           InviteCodeRedeemScreen        role=student|teacher, no school_id, skippable
/school                           SchoolDashboardScreen         role=school_admin
/parent                           ParentDashboardScreen         role=parent  (REPLACES <Navigate to="/home" />)
/parent/link                      ParentLinkScreen              role=parent
/super-admin                      SuperAdminScreen              role=super_admin
/super-admin/school/:id           SuperAdminSchoolDetailScreen  role=super_admin
/settings                         (existing — modified, not new)
```

New helper: **`<RoleRoute allowed={['school_admin']}>`** generalises `ProtectedRoute` with a role allowlist. One file, ~25 lines.

Post-login routing in `LoginScreen` updated to a role table:

```ts
const ROUTE_BY_ROLE = {
  student:      (p) => p.class_level ? '/home' : '/onboarding/class',
  teacher:      (p) => p.school_id ? '/teacher' : '/onboarding/invite-code',
  parent:       () => '/parent',
  school_admin: (p) => p.school_id ? '/school' : '/onboarding/school',
  super_admin:  () => '/super-admin',
  admin:        () => '/admin',  // legacy ops admin unchanged
}
```

### Context (`src/context/`)

**`UserContext.tsx`** — extend exposed profile shape:

```ts
profile: {
  ...existing,
  school_id: string | null,
  school: { id: string, name: string } | null,   // hydrated by /api/user/profile
  tutor_language: 'en' | 'hi',
}
```

Add `setTutorLanguage(lang)` action (optimistic update + `api.user.setTutorLanguage(lang)`). Add `linkedChildren` slice for parents (lazy-loaded by `ParentDashboardScreen`, not auto-fetched on every page load).

**`AuthContext.tsx`** — no changes.

### API service (`src/services/api.ts`)

11 new functions, grouped:

```ts
api.school = {
  create({ name }),
  regenerateCode({ type }),       // 'student' | 'teacher'
  dashboard(),
}

api.auth = {
  ...existing,
  redeemInvite({ code }),
}

api.parent = {
  link({ studentEmail }),
  verify({ linkCode }),
  children(),
}

api.superAdmin = {
  schools(),
  school(id),
  metrics(),
}

api.user = {
  ...existing,
  setTutorLanguage(language),
  setTeacherClasses(classLevels),  // for "Classes I teach" multi-select
}
```

### New screens (`src/screens/`)

| File | Effort | Notes |
|---|---|---|
| `SchoolOnboardingScreen.tsx` | S | Single form (school name) → `api.school.create()` → display two codes with copy buttons + "Continue to dashboard" CTA. |
| `InviteCodeRedeemScreen.tsx` | XS | 6-digit input (auto-formatted `042-195`) + "Skip — I'm not part of a school" link. Wraps `<InviteCodeInput>`. |
| `SchoolDashboardScreen.tsx` | M | 4 stat tiles + 2 invite-code cards + recent-signups list + top-weak-concepts panel. Polls `/api/school/dashboard` every 60s while focused. |
| `ParentDashboardScreen.tsx` | L | Children grid (each = `<ChildCard>`). Empty state with "Link your first child" CTA. Click child → `<ChildProgressDetail>` modal. |
| `ParentLinkScreen.tsx` | M | Email input → POST → display 8-char `linkCode` with "show this code to your child" instructions. |
| `SuperAdminScreen.tsx` | L | Platform tiles + sortable schools table. `<SchoolsTable>` is the meat. |
| `SuperAdminSchoolDetailScreen.tsx` | M | Reuses `SchoolDashboardScreen` internals with `:id` param. Read-only banner: "Viewing as super admin". |

### Modified screens

| File | Change | Effort |
|---|---|---|
| `SignupScreenV4.tsx` | Add 4th tile "Create school" (with brief description). Add optional invite-code field on Student + Teacher tiles. | S |
| `LoginScreenV4.tsx` | Wire `ROUTE_BY_ROLE` redirect logic. | XS |
| `SettingsScreen.tsx` | Two new rows: "Pa speaks to me in" dropdown (en/hi), "Classes I teach" multi-select (teachers only). | S |
| `StudentHomeScreenV4.tsx` | `<PendingLinkBanner>` at top when there's an unverified parent link. School-name pill in `HomeTopNav` (B2B only). | S |
| `OnboardingClassScreen.tsx` | Class 11–12 path: pre-select Computer Science as available subject. | XS |

### New components

| Path | Effort | Purpose |
|---|---|---|
| `src/components/school/InviteCodeCard.jsx` | S | Copy-to-clipboard + regenerate button + confirmation modal. Used twice per school dashboard (student code + teacher code). |
| `src/components/school/SchoolStatsTiles.jsx` | XS | 4-tile grid (students, teachers, doubts today, doubts 7d). |
| `src/components/school/RecentSignupsList.jsx` | XS | Last 10 signups, name + role + relative time. |
| `src/components/school/TopWeakConceptsPanel.jsx` | S | Top 5 from `/api/school/dashboard`, click → teacher review queue pre-filtered. |
| `src/components/parent/ChildCard.jsx` | S | Name, class, total XP, streak, weakest subject, last active. Mobile-first single-column. |
| `src/components/parent/ChildProgressDetail.jsx` | M | Modal: recent doubts (titles only — **no transcripts in v5**), tests + scores, mastery bars. |
| `src/components/parent/PendingLinkBanner.jsx` | S | Shown on student `/home` when there's an unverified incoming link. Inline 8-char code input → `api.parent.verify()`. |
| `src/components/super-admin/SchoolsTable.jsx` | M | Sortable table — name, students, teachers, MAU 7d, doubts 7d, mastery, churn risk. Click row → drill-down. |
| `src/components/super-admin/PlatformMetricsTiles.jsx` | S | MAU, doubts, signups, error rate, LLM cost. Reads `/api/super-admin/metrics`. |
| `src/components/super-admin/TopErrorsPanel.jsx` | S | Errors grouped by endpoint + first stack line. |
| `src/components/super-admin/TopReportedTopicsPanel.jsx` | XS | From `flagged_responses` grouped by concept. |
| `src/components/ui/LanguageToggle.jsx` | XS | Dropdown — English / हिन्दी. Reused in settings (Sprint 3). Designed for future onboarding embedding. |
| `src/components/ui/InviteCodeInput.jsx` | S | Numeric input with auto-formatting. Configurable length (6 for school codes, 8 for parent links). Submit on last digit. |
| `src/components/ui/RoleRoute.jsx` | XS | Generalises `ProtectedRoute` with `allowed: roles[]` prop. |

### Modified components

| File | Change | Effort |
|---|---|---|
| `HomeTopNav.tsx` (v4) | School-name pill for `profile.school_id` users. Small chip next to logo. | XS |
| `MathText.tsx` | Lazy-load `prism-react-renderer` for fenced code blocks (CS support). Non-code content unchanged. | S |

### Styles (`src/styles/`)

**New files:**

- `school-v4.css` — onboarding + dashboard tokens, invite-code visuals
- `parent-v4.css` — child cards, link flow
- `super-admin-v4.css` — sortable table, ops-style metric tiles

**Modified:**

- `home-v4.css` — add `'Noto Sans Devanagari'` to body font-stack; new `.school-name-pill` class for `HomeTopNav`
- `onboarding.css` — invite-code field styling
- `settings-v4.css` — language-toggle row, classes-multi-select row

### `index.html`

Add Devanagari font preload (subset to weights actually used):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&display=swap">
```

### Frontend slice per sprint

| Sprint | Frontend deliverables |
|---|---|
| **0 (foundation)** | `RoleRoute`, `LoginScreen` redirect logic, `UserContext` schema extension. **No new screens** — pure plumbing. |
| **1 (school onboarding)** | `SignupScreen` 4-tile, `SchoolOnboardingScreen`, `SchoolDashboardScreen`, `InviteCodeRedeemScreen`, `InviteCodeInput`, `InviteCodeCard`, all `school/*` components, `school-v4.css`. |
| **2 (parents)** | `ParentDashboardScreen`, `ParentLinkScreen`, `ChildCard`, `ChildProgressDetail`, `PendingLinkBanner`, `parent-v4.css`. Drop the `Navigate to /home` placeholder. |
| **3 (Hindi)** | `LanguageToggle`, settings row wiring, Devanagari `<link>` in `index.html`, `home-v4.css` font-stack. **3 files touched.** |
| **4 (coding)** | `MathText` syntax highlighting via lazy `prism-react-renderer`, CS subject in `OnboardingClassScreen`. **2 files touched.** |
| **5 (super admin)** | `SuperAdminScreen`, `SuperAdminSchoolDetailScreen`, `SchoolsTable`, `PlatformMetricsTiles`, `TopErrorsPanel`, `TopReportedTopicsPanel`, `super-admin-v4.css`. |

### Effort total

~14 new component files + 7 new screen files + 7 modified files + 3 new style files + 2 context tweaks. Estimated **~7–9 person-days of frontend work** spread across 6 sprints, paced to match backend.

### Open frontend decisions

- **Settings layout**: existing `/settings` is 4 sections. Adding language + multi-class makes 6. Cheapest path is keep adding rows; redesign pass deferred to v5.1.
- **Super admin theme**: same v4 paper-coral or darker "ops" look? Recommend v4 for consistency, add a subtle "super admin" badge in topnav.
- **Mobile parent dashboard**: parents on phones is the most likely usage pattern. Sprint 2 must ship responsive `ChildCard` from the start (single column mobile → 2-up tablet → 3-up desktop).
- **i18n for the UI itself**: v5 ships English UI only. The `LanguageToggle` is for tutoring language, not UI language. If UI localisation comes later, no `react-i18next` introduced in v5.
- **Design assets for new screens**: PRD assumes existing v4 tokens cover everything. New visuals (invite code displays, super admin tables) need a half-day of design polish before Sprint 1 ships — not a blocker, just flag for the design pass.

---

## Per-feature spec

### F1. B2C (no change, just confirm)

- `/signup` Student tile → existing flow, `school_id = NULL`.
- All existing v4 screens work as today.
- No paywall, no gating, no plan tier.

**Acceptance**: a brand new B2C student can sign up + onboard + ask a doubt + take a test, exactly like the v4 pilot. Zero regressions.

### F2. B2B school onboarding

- **`/signup` "Create school" tile** → captures email/password/name → creates user with `role = 'school_admin'` in `raw_user_meta_data`. Auto-trigger creates profile.
- Post-signup redirect to **`/onboarding/school`**: form for school name → POST `/api/school/create` → backend generates two codes via `generate_school_invite_code()` and returns them.
- **`/school` dashboard** is the school_admin's home. Shows:
  - School name + the 2 codes (copy + regenerate buttons)
  - Cards: total students, total teachers, doubts in last 24h, doubts in last 7d
  - List: top 5 weakest concepts across the school (links to teacher review queue)
  - List: 10 most recent signups (name, role, when)
- **Cap enforcement**:
  - `max_students` checked at `/api/auth/redeem-invite` for student codes; soft 403 with "school full".
  - `max_doubts_per_day` checked at `/api/ai/doubt`; soft 429 with "your school has hit today's cap".
- **Teacher signup**: existing `/signup` Teacher tile → after signup → redirect to `/onboarding/invite-code` → enters teacher code → `school_id` set, role stays `teacher`. If they don't have a code, can skip (becomes a B2C teacher; rare, but supported).
- **Student signup with code**: existing `/signup` Student tile → onboarding step 0 (new) is "do you have a school code?" → enters or skips. Preserves the rest of the 3-step onboarding unchanged.

**Acceptance**:
- "DPS Bangalore" admin signs up, gets two codes
- Two teachers join via teacher code → both appear in school dashboard
- Five students join via student code → all appear, all scoped to school
- A randomly-signed-up B2C user can NOT see DPS data via any teacher endpoint
- Admin regenerates the student code → old code returns 404 at redeem

### F3. Multiple teachers + multi-class

- `teacher_classes` table backfilled. New endpoint `PATCH /api/user/teacher-classes` `{ classLevels: [9,10,11] }` to update.
- `/api/teacher/students` queries `teacher_classes` (not just `profiles.class_level`) to determine which classes the teacher can see.
- Frontend: settings adds a "Classes I teach" multi-select for users with `role = 'teacher'`.

**Acceptance**: a teacher selects Class 9 + 10 → `/api/teacher/students` returns students from both classes in their school, none from outside.

### F4. Coding support (easy path)

- **No execution sandbox.** Pa explains code; the student runs it themselves. UI copy on `/ask`: "Pa explains code; doesn't run it yet."
- Add `Computer Science` to `SUBJECT_KEYWORDS` in `server/routes/ai.ts`:
  ```
  computer_science: ['python', 'code', 'programming', 'function', 'loop',
  'variable', 'list', 'dictionary', 'tuple', 'recursion', 'algorithm',
  'debug', 'syntax', 'class', 'method', 'object', 'import', 'lambda',
  'comprehension', 'iterator', 'generator']
  ```
- **Ingest**: upload Class 11 `Computer Science with Python` (NCERT) and Class 12 NCERT CS PDFs via existing `/admin` NCERT Content tab. Concept extraction runs automatically.
- **Prompt addition** in `/api/ai/doubt` system prompt (when subject = computer_science):
  ```
  For coding questions:
  • Wrap code in fenced blocks (```python ... ```).
  • Explain line by line in plain English.
  • Mention 1-2 common errors a beginner makes with this construct.
  • You CANNOT execute code. Do not pretend to run it. If asked
    "what does this print?", reason about it step by step instead.
  ```
- **Frontend**: lazy-load `prism-react-renderer` (~5KB) inside `MathText` to syntax-highlight fenced code blocks. KaTeX still handles `$...$` math.
- **Onboarding**: add CS to the subject picker for Class 11–12. (Class 9–10 IT/CS deferred until we have NCERT IT content.)

**Acceptance**:
- Class 11 student selects CS as a subject
- Asks "explain a for loop in Python" → gets a syntax-highlighted code answer with NCERT-grounded context
- Asks "what does this print?" with a code snippet → Pa reasons through it without claiming to execute
- Practice MCQ for CS works (output-prediction format)

### F5. Parents

- **Existing `/parent` placeholder removed.** New `/parent` is the dashboard.
- **Linking flow**:
  1. Parent at `/parent/link` enters student's email
  2. Backend creates `parent_student_links` row with random 8-char `link_code`, `verified_at = NULL`
  3. Parent shows the code to the student (in person / phone / WhatsApp)
  4. Student logs in, sees an in-app banner on `/home`: "Someone wants to link to you as a parent. Enter their code: [____]"
  5. Student enters code → backend sets `verified_at = now()`, clears `link_code`
  6. Parent's `/parent` now shows that child
- **What parents see** (read-only in v5):
  - Per-child card: name, class, total XP, streak, weakest subject
  - Recent activity (last 5 doubts, last 3 tests with scores)
  - Concept mastery overview (pulled from `concept_mastery`)
  - "Last active" timestamp
- **What parents do NOT see in v5**: full doubt transcripts, exact question wording, study time. Comes in v5.1.
- **One parent : N students** supported (UI shows children as cards). **Two parents : 1 student** supported (separate links).

**Acceptance**:
- Parent A links to Student X via email + code-show flow
- Parent A also links to Student Y (sibling)
- Parent B (other parent) also links to Student X
- All three see the right children with no leakage
- An unverified link does not show the child to the parent

### F6. Hindi tutoring

- **`profiles.tutor_language`** added in migration.
- **Settings row**: dropdown labelled "Pa speaks to me in" → English / हिन्दी. Saves via `PATCH /api/user/tutor-language`.
- **System prompt directive** (appended in `/api/ai/doubt`, `/api/ai/practice`, `/api/test/start`, `/api/ai/visual`):
  ```
  IMPORTANT: Respond in ${lang === 'hi' ? 'Hindi (Devanagari script)' : 'English'}.
  Math notation MUST stay in LaTeX regardless of language.
  Code MUST stay in English with English keywords; you can comment in
  ${lang === 'hi' ? 'Hindi' : 'English'}.
  ```
- **TTS routing** (`server/routes/ai.ts /tts`): if `tutor_language === 'hi'`, voice = `hi-IN-Wavenet-D` (or `hi-IN-Neural2-A` for naturalness); else `en-IN-Wavenet-D`.
- **Cache key**: include `tutor_language` in the `response_cache.key` and the embedding-search RPC params. Otherwise an English cache hit serves a Hindi user. (Migration is not needed — append `::lang::hi` or `::lang::en` to the key string in `server/routes/ai.ts`.)
- **Frontend font fallback**: add `'Noto Sans Devanagari'` to `body` font-stack in `src/styles/home-v4.css`. Lexend doesn't ship Devanagari glyphs.
- **`latexToSpeech.ts`**: extend to handle Hindi math vocabulary. v1 ship: keep English math vocabulary in Hindi context (e.g. "F equals m a" still spoken in English mid-Hindi sentence — natural for Indian Hindi speakers). Phase 2: full Hindi math vocab.
- **NCERT content**: stays English. LLM translates retrieved chunks at response time. Caveat in PRD: response quality on culturally-Hindi subjects (Hindi grammar, Hindi literature) will be weaker; flag for Phase 2 native ingest.

**Acceptance**:
- Student toggles to Hindi in settings
- Asks "n्यूटन के तीसरे नियम का उदाहरण दीजिए" → gets a Devanagari response with LaTeX math intact
- Listen button plays Hindi-voice TTS
- KaTeX still renders the math
- Same student toggles back to English → next response is in English; cache key separation means no stale Hindi response

### F7. Super admin dashboard

- **`/super-admin` route** behind `role = 'super_admin'` check.
- **Tiles** (top of page):
  - Total schools, total students, MAU 7d, MAU 30d
  - Doubts today, doubts last 7d
  - Estimated LLM cost last 7d (from `logs/llm-calls.jsonl` token counts × per-token rates)
  - Error rate last 24h (from server logs — needs minimal extraction)
- **Schools table** (sortable, paginated):
  - Name | Students | Teachers | MAU 7d | Doubts 7d | Avg mastery | Churn risk | Created
  - Click row → drill into `/super-admin/school/:id`
- **Drill-down view** = same shape as school_admin's `/school` dashboard but for any school.
- **Top errors panel**: groups recent server errors by endpoint + first line of stack.
- **Top reported topics**: from `flagged_responses`, grouped by detected concept.
- **No alerts in v5** — Vinoth checks the dashboard manually. Alerting is v5.1.
- **Pagination + filters**: schools table filterable by name; sortable by all columns.

**Acceptance**:
- Vinoth promotes himself to `super_admin` (one-line SQL)
- Visits `/super-admin` → sees every school's headline stats
- Clicks "DPS Bangalore" → sees that school's full dashboard
- Sees that error rate jumped because of a Groq outage (top-errors panel reveals it)

---

## Sequencing

```
Sprint 0 — Foundation                                       (1 week)
├── Migration 012 deployed (Supabase SQL Editor)
├── server/lib/supabase.ts — schools-aware helpers
├── server/routes/auth.ts (new) — /redeem-invite endpoint
├── server/routes/school.ts (new) — /create, /regenerate-code, /dashboard
├── server/routes/superAdmin.ts (new) — schema only, endpoints stubbed
├── teacher.ts /students + /student/:id add school_id filter
├── ai.ts /doubt adds per-school doubt cap check
└── tests: cross-school isolation contract test (must-have)

Sprint 1 — School onboarding                                (1.5 weeks)
├── /signup "Create school" tile
├── /onboarding/school screen
├── /school dashboard
├── /onboarding/invite-code (insertable into existing onboarding flow)
├── Settings: "Classes I teach" multi-select
├── Frontend: school name in HomeTopNav (B2B users)
└── tests: 5-school + multi-teacher integration test

Sprint 2 — Parents                                          (1 week)
├── /api/parent/* endpoints
├── /parent dashboard rebuild
├── /parent/link flow
├── /home banner for student-confirms-parent flow
└── tests: 1:N + 2:1 parent linking integration test

Sprint 3 — Hindi (parallel-able with Sprint 4)              (3 days)
├── PATCH /api/user/tutor-language
├── Prompt directive in 4 ai.ts endpoints
├── TTS voice routing
├── Cache key separation
├── Devanagari font fallback
├── Settings dropdown
└── tests: Hindi response + cache key separation curl

Sprint 4 — Coding support (parallel-able with Sprint 3)     (2 days + ingest)
├── SUBJECT_KEYWORDS extension
├── CS prompt addition
├── Frontend code highlighting
├── Onboarding: CS in subject picker for Class 11–12
└── content: upload + extract Class 11 + 12 NCERT CS

Sprint 5 — Super admin                                      (1.5 weeks)
├── /api/super-admin/* endpoints
├── /super-admin route + screens
├── LLM cost extractor from llm-calls.jsonl
├── Error log extractor (bash + node script)
└── tests: super_admin sees all schools; non-super_admin gets 403
```

**Total ~6 weeks sequential. ~5 weeks calendar with Sprint 3+4 in parallel.**

---

## Out of scope (v5)

Explicitly **not** building:

- **Pricing / billing** — free for all of v5. Defer until traction is real.
- **Razorpay / Stripe / GST invoicing** — see above.
- **Email / SMS / WhatsApp notifications** — parent dashboard ships read-only.
- **Code execution sandbox** — Pa explains code, doesn't run it.
- **Hindi NCERT ingestion** — LLM translates English chunks at response time.
- **Tamil / Telugu / Marathi / Bengali / Kannada tutoring** — same architecture; ship after Hindi proves out.
- **DPDP parent OTP at student signup** — still self-attestation. Tighten when paid plans demand it.
- **CSV bulk upload of students** — invite codes scale to 500/school via cap.
- **School branding / subdomains** — single padee.ai domain, school name in topnav only.
- **Domain-based auto-join** (`@dpsbangalore.edu` → DPS) — invite codes only.
- **SSO / Google Workspace** — invite codes only.
- **Super-admin alerts** — manual dashboard checks in v5.
- **Cross-school student transfer** — student leaves school = `school_id = NULL`, history preserved on profile.
- **Multi-school teachers** — a teacher belongs to exactly one school. Edge case; defer.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Cross-school data leak via missed `school_id` filter | **High** | Contract test in Sprint 0 that signs in as Teacher-A-of-School-1 and tries to access Student-of-School-2 — expect 403 / empty. Run on every push. |
| Invite code abuse (someone shares code on Reddit, randoms join) | Medium | School admin can regenerate. `max_students` cap stops blast radius. Add admin-approve toggle in v5.1 if it actually happens. |
| Hindi response quality on culturally-Hindi subjects (lit, grammar) | Medium | LLM translation of English chunks is acceptable for Maths/Science/CS but weaker on Hindi-as-a-subject. Flag in onboarding ("Hindi support is best for Maths and Science right now"). |
| Coding without execution = lower-confidence answers | Medium | UI copy sets expectation. Track flag rate on CS questions; if >2× other subjects, prioritise sandbox in Phase 2. |
| Per-school doubt cap surprises a school mid-day | Low | School dashboard surfaces "you have used X / Y doubts today". Soft 429 with friendly message. School admin can request a raise via email. |
| Migration 012 breaks an existing teacher endpoint | Medium | Backfill ensures every existing teacher has a `teacher_classes` row matching their `class_level`. Run integration tests against staging before applying to prod. |
| Parent verification fraud (someone claims to be a parent of a stranger) | Low | Student-confirms-with-code mechanism makes this hard. Future: parent must provide phone/relation in v5.1. |
| `super_admin` role accidentally granted to non-Padee user | **High** | Manual SQL only. No UI to promote. Document in DEPLOYMENT.md. |

---

## Open follow-ups (post-v5)

These need real-world feedback before we spec them:

- **Pricing model** — observe cost-per-active-user for 4–8 weeks first.
- **Code execution** — only if students complain Pa "guesses".
- **Hindi NCERT native ingestion** — only if response quality complaints.
- **Other Indian languages** — when 1+ school requests Tamil / Telugu.
- **Parent v5.1**: full doubt transcripts visible to parent, weekly email summary, screen-time limits, parent → teacher messaging.
- **School v5.1**: branded login page (logo + colour), CSV bulk upload, domain auto-join, SSO.
- **DPDP hardening**: parent OTP at signup, /privacy + /terms pages, data deletion endpoint.
- **Real-time AI evaluation of descriptive answers** (`/api/ai/evaluate` 501 stub still pending from v4).
- **Sentry + PostHog** — error monitoring + product analytics. Both deferred from v4.
- **Automated nightly recompute cron** (Railway scheduled job, currently manual).

---

## Acceptance — definition of done for v5

The PRD is "shipped" when all of these are true:

1. A school admin can sign up, get codes, and have 2 teachers + 10 students join via codes — all scoped strictly to that school.
2. A B2C student signs up with no code, completes onboarding, asks a doubt, takes a test — zero regressions vs v4.
3. A teacher in School A cannot see a single byte of School B's data via any endpoint.
4. A parent can link to one or two children, see their progress, and a sibling parent (different account) can also link to the same child.
5. A student toggles tutor language to Hindi → next doubt answer is in Devanagari, math intact, TTS in Hindi voice.
6. A Class 11 CS student asks "explain Python list comprehension" → gets a syntax-highlighted code answer.
7. Super admin (Vinoth) sees every school's headline stats on `/super-admin`.
8. All v4 tests still pass. New v5 tests (cross-school isolation, parent linking, Hindi cache key separation, school cap enforcement) pass.
9. `DEPLOYMENT.md` updated with: how to seed a super_admin, how to apply migration 012, what env vars (if any) are added.
10. No production data loss during migration apply (dry-run on staging first).

---

## Appendix A — invite code format

- **6 digits, numeric, leading zeros preserved** (`042195` is valid).
- **1M possible codes**. With 100 schools active, collision risk per generation ≈ 0.01%; the UNIQUE constraint catches it and the app retries.
- Generated by `public.generate_school_invite_code()` (loops up to 100 times, throws on exhaustion).
- Codes are case-insensitive (numeric, so moot) but UI shows hyphens for readability: `042-195`.
- Regenerable; old codes immediately invalid.
- Shared out-of-band by school admin — WhatsApp, email, classroom whiteboard, etc. Padee does not send these.

## Appendix B — `parent_student_links.link_code` format

- **8 characters, alphanumeric uppercase** (e.g. `K7M2X9LP`).
- Single-use. Cleared (`NULL`) after `verified_at` is set.
- Generated app-side using `crypto.randomBytes` → base32. No collision risk at our scale.

## Appendix C — env var additions

Migration 012 introduces no new env vars. Sprint 5 (super admin) needs:

```
LLM_COST_RATES_JSON='{"groq/llama-3.3-70b-versatile":{"in":0.59,"out":0.79},...}'
```

A JSON map of model → per-1M-token rates (USD), used by the LLM cost
extractor. Fallback hardcoded defaults exist for the 5 models we use today.

---

*End of PRD v5.*
