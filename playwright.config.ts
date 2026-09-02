import { defineConfig } from '@playwright/test'

// E2E smoke against the *mocked* stack: there is no FastAPI backend, so the
// browser MSW worker (`src/api/mocks/browser.ts` + `public/mockServiceWorker.js`)
// backs every `/api/*` call. That only activates when `VITE_API_MOCK=1`, i.e.
// the Vite dev server via `npm run dev:mock` — never `build`/`preview` (MSW is
// stripped from the production bundle).
export default defineConfig({
  testDir: 'e2e',
  // `e2e/real/` needs a live FastAPI backend (playwright.real.config.ts); the
  // default mock-stack suite must not run it.
  testIgnore: '**/real/**',
  timeout: 30_000,
  use: {
    // Reuse the system Chrome so no browser download is required.
    channel: 'chrome',
    baseURL: 'http://localhost:3000/',
  },
  webServer: {
    command: 'npm run dev:mock',
    url: 'http://localhost:3000/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
