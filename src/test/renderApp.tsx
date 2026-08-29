import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { routeTree } from '#/routeTree.gen'

export function createTestRouter(
  initialEntries: string[],
  queryClient?: QueryClient,
) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
    defaultPreload: false,
    context: { queryClient: queryClient ?? createTestQueryClient() },
  })
}

/**
 * Resolve the router's initial navigation to a ready state. Awaiting this
 * BEFORE mounting RouterProvider is required in tests — mounting first leaves
 * the router stuck in `pending`.
 */
export async function loadTestRouter(
  router: ReturnType<typeof createTestRouter>,
  expectedStatus: 'idle' | 'notfound' | 'error' | 'success' = 'idle',
) {
  try {
    await router.load()
  } catch {
    /* route errors are surfaced by errorComponent / query assertions */
  }
  if (router.state.status !== expectedStatus) {
    throw new Error(
      `Expected router load to reach "${expectedStatus}" but it is "${router.state.status}"`,
    )
  }
  return router
}

export interface RenderAppOptions {
  initialEntries?: string[]
  router?: ReturnType<typeof createTestRouter>
  queryClient?: QueryClient
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

/**
 * Render the whole app (real route tree + MSW-backed API) in isolated Query
 * state.
 *
 * NOTE: the Adobe Spectrum <Provider> is intentionally NOT wrapped here — its
 * Suspense-based theming stalls router.load() in jsdom. Test Spectrum widgets
 * in isolation, and revisit the wrapper when component-level Spectrum tests
 * need it.
 */
export async function renderApp(options: RenderAppOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const router =
    options.router ??
    createTestRouter(options.initialEntries ?? ['/'], queryClient)
  await loadTestRouter(router)

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { queryClient, router, ...result }
}

/** Render an isolated component under the app's providers (no router). */
export function renderWithProviders(
  ui: ReactElement,
  queryClient: QueryClient = createTestQueryClient(),
) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}
