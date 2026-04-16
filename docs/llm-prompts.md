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

**Output format**: JSON with `questions` array, each containing `question`, `options` (4 strings), `correctIndex` (0-3), `explanation`.

**Quality rules**:
1. Exactly 4 options, exactly ONE correct answer
2. Options MUST be mutually exclusive -- no two options can both be correct or partially correct
3. Distractors must be plausible but clearly wrong to someone who understands the concept
4. Prefer questions that test deeper understanding (numerical application, scenario comparison) over surface recall
5. Use CBSE terminology exactly as in the NCERT textbook
6. Question under 40 words, options under 15 words each, explanation under 35 words
7. Randomise correctIndex across questions (do not always put answer at index 0)

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

## No-LaTeX Rule

**Where**: Both text doubt and vision system prompts.

**Why**: The frontend does NOT render LaTeX. Raw LaTeX syntax like `$F = BIL \sin \theta$` displays as ugly plaintext.

**The rule**:
- DO NOT use LaTeX syntax
- Use plain text with Unicode symbols: theta -> theta, degree -> degree symbol, ohm -> omega, multiply -> multiplication sign, sqrt -> root symbol, pi, alpha, beta, delta, approximately equal, less/greater than or equal, superscripts
- Use Markdown bold for emphasis

**Defensive fallback**: The frontend has a `stripLatex()` function that removes common LaTeX patterns, but the prompt instruction is the primary defense.

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
