import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Browser-only MSW instance backing the dev server when VITE_API_MOCK=1.
// Lets the UI run against the FastAPI contract without a live backend.
// Non-/api requests (Vite HMR, assets, etc.) pass through silently.
const worker = setupWorker(...handlers)

export async function startMockApi() {
  if (typeof window !== 'undefined') {
    await worker.start({
      onUnhandledRequest(request, print) {
        if (new URL(request.url).pathname.startsWith('/api/')) {
          print.warning()
        }
      },
    })
  }
}
