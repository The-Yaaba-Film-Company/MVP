import { defineConfig } from '@playwright/test'

/**
 * E2E against the *real* FastAPI backend (as opposed to playwright.config.ts,
 * whose browser MSW worker mocks every /api/* call).
 *
 * Two webServers are brought up on dedicated ports so the suite never touches
 * locally running dev servers (:8000/:3000):
 *   - the backend on 127.0.0.1:8001 (`e2e/scripts/start-backend-real.sh`),
 *     which also resets the E2E database to a clean slate every run, and
 *   - the plain Vite dev server on :3001 with VITE_API_MOCK unset and
 *     VITE_API_URL pointed at the E2E backend, so the app talks to the real
 *     API (the repo's .env.local would otherwise point it at :8000).
 *
 * The dev server must be reachable from the browser with `credentials: 'include'`.
 * That only works because the backend answers CORS preflights with
 * `Access-Control-Allow-Credentials: true`. If you remove that header, every
 * fetch in these specs fails in the browser while curl (no Origin) still works.
 */
export default defineConfig({
  testDir: 'e2e/real',
  timeout: 60_000,
  globalSetup: './e2e/global-setup-real.ts',
  fullyParallel: true,
  use: {
    // Reuse the system Chrome so no browser download is required.
    channel: 'chrome',
    baseURL: 'http://localhost:3001/',
  },
  expect: {
    // Real-backend round trips (auth + DB) are slower than the MSW mock
    // suite; give assertions room on cold starts.
    timeout: 15_000,
  },
  webServer: [
    {
      command: 'bash e2e/scripts/start-backend-real.sh',
      url: 'http://127.0.0.1:8001/api/health',
      // Never reuse: a stale backend skips the per-run DB reset.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --port 3001 --strictPort',
      env: { VITE_API_URL: 'http://localhost:8001' },
      url: 'http://localhost:3001/',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})