# LLM Prompts Guide

All prompts live in `server/routes/ai.ts`. This document describes the purpose and key rules of each prompt without reproducing them verbatim. To see the full text, refer to the function name and approximate line number noted below.

---

## Text Doubt System Prompt

**Function**: `buildSystemPrompt()` (~line 586)

**Purpose**: Establishes the AI as "Padee", a CBSE tutor that answers using NCERT content.

**Key rules**:
- Answer using ONLY the provided NCERT context. If it does not cover the topic, say so honestly.
- Use step-by-step explanations with CBSE terminology.
- Keep responses under 400 words.
- Use simple English appropriate for the student's class level.
- Include relevant formulas, definitions, and examples from NCERT.

**Dynamic sections**:
- Student memory context block (injected when available, see Memory section below)
- NCERT reference content block (injected when RAG retrieves chunks)
- Fallback block when no NCERT content is available

---

## Vision System Prompt

**Function**: `buildVisionSystemPrompt()` (~line 451)

**Purpose**: Handles photo doubts where the student photographs textbook content, worksheets, or diagrams.

**Three response cases**:
- **Case A (Full problem)**: extract given values with units, solve step-by-step using CBSE methods, end with labelled final answer
- **Case B (Diagram/figure)**: describe the diagram, explain the concept, do NOT invent numerical values or fabricate problems
- **Case C (Conceptual content)**: explain the concept, give one real-world example, do NOT force a problem+solution template

**Absolute rules**:
- NEVER fabricate specific numerical values not present in the image
- NEVER write rigid step templates with empty placeholder steps
- NEVER add unsolicited content (similar questions, real-world examples, common mistakes)
- Skip steps that do not apply. A good answer may be 2-3 sections, not 8.

**Response limit**: 350 words, simple English for the student's class level.

---

## Visual Generation System Prompt

**Function**: Inline in the `/api/ai/visual` handler (~line 752)

**Purpose**: Generates self-contained HTML+SVG visualisations for CBSE concepts. Runs on OpenAI GPT-4o.

**Key rules**:
- Output ONLY HTML body content (no html/head/body tags, no markdown fences)
- Wrap in a max-width 480px div with system-ui font
- All SVG must use `viewBox` + `width="100%"` (no fixed pixel widths) for responsiveness
- 10-30 SVG elements is the sweet spot
- Every important element must have a clear text label with values/units
- CSS animations encouraged for educational effect
- Sliders (`<input type="range">`) with inline scripts for interactive concepts

**Allowed**: inline SVG, inline CSS, CSS animations, range sliders, simple script blocks

**Forbidden**: external resources (no CDNs, no URLs, no Google Fonts), localStorage, cookies, fetch, document.cookie, fixed pixel widths on outer SVG

**Physics-specific rules** (critical for correctness):
- Bar magnet: S (blue) on left, N (red) on right
- Field lines: exit from N pole, enter S pole, arrowheads point in flow direction
- Compass needle: drawn as a rhombus, red half points toward bar magnet's S pole
- All text labels must stay inside the viewBox with at least 5px margin

---

## MCQ Generation System Prompt

**Function**: Inline in the `/api/ai/practice` handler (~line 931)

**Purpose**: Generates MCQ questions with strict quality rules. Runs on Groq with `response_format: json_object`.

**Output format**: JSON with `questions` array, each containing `question`, `options` (4 strings), `correctIndex` (0-3), `explanation`, `difficulty` (easy/medium/hard), `hint`, `hint_subtitle` (optional).

**Quality rules**:
1. Exactly 4 options, exactly ONE correct answer
2. Options MUST be mutually exclusive — no two options can both be correct or partially correct
3. Distractors must be plausible but clearly wrong to someone who understands the concept
4. Prefer questions that test deeper understanding (numerical application, scenario comparison) over surface recall
5. Use CBSE terminology exactly as in the NCERT textbook
6. Question under 40 words, options under 15 words each, explanation under 35 words
7. Randomise correctIndex across questions (do not always put answer at index 0)
8. Mix difficulties when count > 1: roughly 30% easy, 50% medium, 20% hard
9. Hint must point at the method/formula/principle, NEVER reveal the answer or name the correct option
10. **Math formatting**: use LaTeX with `$...$` delimiters for any math expression in question/options/explanation/hint

**Token budget**: scales with `count` — `Math.max(600, count * 320 + 200)`. The expanded schema needs ~250-300 tokens per question.

**Concept tagging**: when the request includes a `concept` slug, the prompt looks up the concept name + chapter from `concept_catalog` and adds a focus line. Each returned question is tagged with `concept_slug` so `update_concept_mastery()` can be called per question.

---

## Pa's Debrief Prompt (Test results)

**Function**: Inline in `/api/test/complete` (~line 304 in `server/routes/test.ts`)

**Purpose**: Generates the multi-paragraph diagnosis shown in the Pa's Debrief sticky sidebar on the test results screen. Quality > speed: uses `gpt-4o-mini` (`LLM_TEST_INSIGHTS` env var) for warm structured prose. Llama 3.3-70b is the fallback.

**Inputs supplied to the prompt**:
- Score (correct / total / %)
- Per-topic breakdown — aced (`Topic: 6/6`) and slipped (`Topic: 0/2`) lists computed from question correctness
- Wrong-question detail — for each wrong question: question text, student's pick (letter + content), correct answer (letter + content), the explanation

**Required output structure** (~100-130 words total):

| Paragraph | Content |
|---|---|
| 1 — Assessment | Open with what the student NAILED — name the topic and cite the count from the breakdown ("very confident on N1 and N2 — 6 of 6 correct"). Pivot to where they slipped, also naming topics with counts. Use `**bold**` sparingly to highlight 1-2 key phrases. |
| 2 — Diagnosis + correction | Look at the wrong questions and identify the SHARED misconception underneath them. State it plainly in one sentence. Correct it in one sentence with the right mental model in `**bold**`. Add ONE memorable line — an analogy, an everyday example, or a striking fact — that makes the correct idea stick. |
| 3 — Next step | Recommend a short Ask Pa explainer on the weakest topic. If you can infer urgency (boards, upcoming class test), name it. |

**Tone**: warm, direct, like a smart friend explaining over chai. Plain text with `**bold**` for emphasis. No headers, no bullet lists, **no LaTeX** (this debrief is read on the results page, not Ask Pa).

**Cost**: ~₹0.05 per debrief at gpt-4o-mini pricing.

**Frontend rendering**: the response is split on blank lines into paragraphs; per-topic stat chips (computed server-side and returned alongside the prose) are rendered above the paragraphs. The whole thing is also passed to the Listen button which unparses any stray LaTeX before sending to TTS.

---

## Challenge Me Prompt (Ask AI chip)

**Where**: `handleChip()` in `src/screens/DoubtSolverScreenV4.jsx` (sent through the regular `/api/ai/doubt` endpoint).

**Purpose**: Generates a harder problem with a hidden solution gated behind a "Show solution" reveal. The student is expected to attempt it before peeking.

**Required format** (matched verbatim by `ChallengeView` in PaBubble):

```
[Problem statement here, with all needed values. Do NOT include the answer.]

---SOLUTION---

[Step-by-step solution here, ending with the final answer.]
```

The frontend splits on `\n?-{2,}\s*SOLUTION\s*-{2,}\n?` (case-insensitive). If the marker is missing (LLM occasionally forgets), fallback is to render the entire response as plain text with no reveal — graceful degradation.

---

## Memory Personalisation Rule

**Injected into**: Text doubt system prompt (via `buildSystemPrompt()`)

**Purpose**: When the student's memory context shows a connection to the current question, the LLM should acknowledge it naturally.

**Three example patterns the prompt provides**:
1. "Building on what you asked about [topic] earlier, ..."
2. "Since you recently asked about [topic], let's now look at ..."
3. "Following up on [topic], ..."

**For weak subjects**: "I see you've been working on [subject] -- here's a clearer take"

**Critical rule**: If there is NO meaningful connection, do NOT force one. Forced personalisation is worse than none.

---

## LaTeX Rule (flipped Apr 26, 2026 — KaTeX shipped)

**Where**: Text doubt and practice MCQ system prompts. (Vision and Pa's debrief stay plain-text.)

**Why**: The frontend renders LaTeX via KaTeX (`MathText` component). Math expressions like `$F = mg \sin\theta$` typeset properly; using Unicode-only would lose the typeset quality.

**The rule** (in the doubt prompt):
- USE LaTeX for ALL math expressions, formulas, equations, and Greek letters
- Inline math: `$F = ma$`
- Display math (standalone equation on its own line): `$$E = mc^2$$`
- Common commands: `\sin`, `\cos`, `\tan`, `\theta`, `\pi`, `\alpha`, `\beta`, `\Delta`, `\Omega`, `\frac{a}{b}`, `\sqrt{x}`, `x^2`, `x_{i}`, `\leq`, `\geq`, `\neq`, `\approx`, `\cdot`, `\times`
- BALANCE every `$` — every opening needs a closing. Unbalanced delimiters render as ugly red errors.
- Plain prose between math segments stays in plain English

**The rule** (in the practice MCQ prompt — added as rule #10):
- For any math expression in question/options/explanation/hint, use LaTeX with single `$` delimiters
- e.g. `What is $F$ if $m = 2$ kg and $a = 3$ m/s$^2$?` — options can include `$F = 6$ N`

**Server-side validation**: `validateLatex()` in `server/lib/latexValidate.ts` counts `$` and `$$` for balance. Practice responses are sanitised per-question before returning. Doubt responses are validated post-stream and the sanitised version is what gets stored in `doubt_sessions` + `response_cache` (so cache hits never replay malformed math).

**Pa's Debrief exception**: The test-results debrief prompt (`LLM_TEST_INSIGHTS=gpt-4o-mini`) explicitly says "no LaTeX in this debrief — it's read on the results page, not the doubt panel." This keeps the prose conversational; the `MathText` rendering still handles any stray `$` gracefully.

**TTS**: When the Listen button reads aloud, `latexToSpeech.ts` unparses `$F = mg \sin\theta$` into "F equals m g sine theta" before sending to Google TTS / browser Web Speech.

---

## No-Source-Leakage Rule

**Where**: Text doubt system prompt (when NCERT context is injected).

**Why**: RAG chunks are prefixed with `[Source 1]`, `[Source 2]` etc. as internal markers. Students should never see these labels.

**The rule**:
- NEVER write "[Source 1]", "[Source 2]", etc. in the response
- If you want to cite, write naturally (e.g., "According to the NCERT textbook...")
- Do NOT announce which sources you used at the end
- Do NOT say "This information is found in the reference content"
- Answer as a teacher would, not as a search engine

---

## Where All Prompts Live

`server/routes/ai.ts` -- all prompts are currently inline in this single file.

**Future plan**: Refactor to `server/prompts/` directory to enable non-engineer prompt editing. Deferred to Phase 2.

---

## How to Modify Prompts Safely

1. **Find the prompt** in `server/routes/ai.ts` (search for the function name or key phrases)
2. **Make your change** -- add rules, modify wording, adjust constraints
3. **Test with curl** -- call the endpoint directly and inspect the response:
   ```bash
   curl -X POST http://localhost:3001/api/ai/doubt \
     -H 'Authorization: Bearer YOUR_TOKEN' \
     -H 'Content-Type: application/json' \
     -d '{"messages":[{"role":"user","content":"Test question"}],"subject":"Physics","className":10}'
   ```
4. **Check the LLM Audit tab** -- go to `/admin` -> LLM Audit, find your call, expand it to see the full system prompt and response
5. **Verify the prompt was injected correctly** -- the system prompt field in the audit log shows exactly what was sent to the LLM
6. **Test edge cases**: empty NCERT context (no RAG), with memory, without memory, cache hit
7. **Watch for regressions**: prompt changes can affect cache hit rates (different instructions may change response patterns)
