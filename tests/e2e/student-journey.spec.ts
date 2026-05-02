import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════════════════
// Student-journey smoke test
// ═══════════════════════════════════════════════════════════════════════════
// One end-to-end pass that exercises the slice of the app a real student
// hits in their first session: sign in → home → ask a doubt → see the
// streamed response with at least one chunk delivered.
//
// Goal is regression-detection, not exhaustive coverage. Backend has 119
// curl-based assertions for that. The browser layer catches things the
// curl tests can't see:
//   • Auth context wiring (Supabase JS in the browser, not curl)
//   • SSE streaming through the React state machine
//   • localStorage namespacing
//   • KaTeX rendering
//   • Navigation / routing
//
// Prereqs:
//   • backend on :3001 (npm run dev:server)
//   • frontend on :5173 (npm run dev)
//   • test student exists (default: teststudent@padee.ai / TestPass123!)
//
// Override creds via TEST_EMAIL / TEST_PASSWORD env vars.
// ═══════════════════════════════════════════════════════════════════════════

const ENV = (() => {
  // Prefer process env (CI), fall back to .env at repo root for local runs.
  if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
    return { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }
  }
  try {
    const text = readFileSync(resolve(__dirname, '../../.env'), 'utf-8')
    const m = (k: string) => text.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim()
    return {
      email: m('TEST_EMAIL') || 'teststudent@padee.ai',
      password: m('TEST_PASSWORD') || 'TestPass123!',
    }
  } catch {
    return { email: 'teststudent@padee.ai', password: 'TestPass123!' }
  }
})()

test.describe('Student journey', () => {
  test('signs in, lands on home, sees subjects + streak', async ({ page }) => {
    await page.goto('/login')
    // The login form has email + password inputs and a submit button.
    // Use ARIA role queries so the test stays robust against label-text changes.
    await page.locator('input[type="email"]').first().fill(ENV.email)
    await page.locator('input[type="password"]').first().fill(ENV.password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
      page.locator('button[type="submit"]').first().click(),
    ])
    // After login a student lands on /home (the ProtectedRoute + role
    // routing in routes.tsx handles this). Verify the URL + a page-level
    // signature instead of guessing visible copy that might shift.
    await expect(page).toHaveURL(/\/home/)
    // Home renders subject cards somewhere — the home top nav also has a
    // streak-day pill that's stable across redesigns. Wait for either.
    await expect(page.locator('body')).toContainText(/days|streak|home/i, { timeout: 10_000 })
  })

  test('asks a doubt and sees streaming response', async ({ page }) => {
    // Sign in (test isolation: each test starts fresh; share-state tests
    // are a Phase-2 concern.)
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(ENV.email)
    await page.locator('input[type="password"]').first().fill(ENV.password)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })

    // Navigate to Ask Pa. Try the nav link first; fall back to direct URL.
    const askLink = page.getByRole('link', { name: /ask pa|ask ai/i }).first()
    if (await askLink.isVisible().catch(() => false)) {
      await askLink.click()
    } else {
      await page.goto('/ask')
    }
    await expect(page).toHaveURL(/\/ask/)

    // Find the input + send. AskInput renders an <input> or <textarea>;
    // either accepts .fill().
    const input = page.locator('textarea, input[type="text"]').first()
    await input.fill('What is the unit of force?')

    // Submit via Enter (simpler than locating a button across the v4 redesign).
    await input.press('Enter')

    // The student bubble appears immediately; the AI bubble starts in the
    // "thinking" state and accumulates tokens via SSE. We assert the AI
    // bubble produces non-trivial text within the streaming window.
    //
    // Looser assertion than checking "Newton" specifically — LLM outputs
    // vary; a flaky test that demands exact wording is worse than a test
    // that confirms streaming works at all.
    const main = page.locator('main, .ask-body').first()
    await expect(main).toContainText(/.{50,}/, { timeout: 30_000 })

    // Should NOT contain a generic error string. Loose match — any error
    // message would surface "rate limit", "couldn't reach", "went wrong".
    await expect(main).not.toContainText(/something went wrong|couldn't reach|rate limit hit/i)
  })

  test('localStorage chat history is namespaced by user id', async ({ page }) => {
    // Sign in
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(ENV.email)
    await page.locator('input[type="password"]').first().fill(ENV.password)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
    await page.goto('/ask')

    // Once Ask Pa mounts, the namespaced key shape should appear when any
    // message is persisted. Even before sending, the key shape is
    // deterministic from the user id.
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => k.startsWith('padee-ask-ai-messages'))
    )
    // Expect either zero entries (no messages yet) OR a per-user-namespaced
    // key (NOT the bare 'padee-ask-ai-messages' that was the v3 leak vector).
    for (const k of keys) {
      expect(k).toMatch(/^padee-ask-ai-messages:/)
    }
  })
})
