import { defineConfig } from '@playwright/test'

// Lightweight Playwright config for the student-journey smoke test.
// Goal: catch regressions that the curl-based integration suite can't see —
// page renders, KaTeX, SSE streaming, navigation, localStorage namespacing.
//
// Assumes BOTH the backend (:3001) AND the frontend (:5173) are already
// running locally (`npm run dev:all`). Not auto-started here because the
// dev:server uses tsx watch which is slow to spin up + tear down per run.
//
// To run:   npm run test:e2e
// Headed:   npm run test:e2e -- --headed
// Debug:    npm run test:e2e -- --debug

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  // One test at a time so we don't hammer Groq with parallel doubts.
  workers: 1,
  // Pilot scale: a single browser is enough; chromium is closest to what
  // most students will use (Chrome on Android).
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    // Surface failures with screenshots + traces so a one-off CI failure
    // is debuggable without re-running locally.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Slow down a bit so streaming SSE has time to render before assertions.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  // No retries in dev (faster signal); 1 retry in CI (flake tolerance).
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
})
