import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { createAppQueryClient } from '#/lib/queryClient'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    // Created per getRouter() call so SSR requests get isolated caches and
    // the client gets a single cache for the session (SPEC.md §8).
    context: { queryClient: createAppQueryClient() },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
