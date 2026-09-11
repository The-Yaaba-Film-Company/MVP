/**
 * Fail-fast health probe for the real-backend E2E run.
 *
 * Runs before the specs; both webServers should already be up (Playwright
 * starts webServers first). Produces a clear error instead of letting a
 * CORS/cookie regression surface as cryptic per-spec failures.
 */
export default async function globalSetup() {
  const backend = 'http://127.0.0.1:8001/api/health'
  const frontend = 'http://localhost:3001/'

  const backendRes = await fetch(backend)
  if (!backendRes.ok) {
    throw new Error(
      `Backend health check failed (${backend} -> ${backendRes.status}). ` +
        'Check e2e/scripts/start-backend-real.sh.',
    )
  }

  const frontendRes = await fetch(frontend)
  if (!frontendRes.ok) {
    throw new Error(
      `Frontend dev server not reachable (${frontend} -> ${frontendRes.status}). ` +
        'Run `npm run dev` or let Playwright start it.',
    )
  }
}
