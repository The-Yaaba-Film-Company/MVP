import { QueryClient } from '@tanstack/react-query'

/**
 * Create the app-wide QueryClient. Called once per mount so the client is
 * isolated per SSR request and created once for the lifetime of the browser
 * session (the root stays mounted across navigations, so the cache survives).
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5_000 },
    },
  })
}
