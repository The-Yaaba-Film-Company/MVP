import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'

// Hierarchical, scoped query keys (SPEC.md §8).
export const authKeys = {
  me: ['auth', 'me'] as const,
}

/** Server-owned auth state. `data` is the signed-in user or `null` when signed out. */
export function useAuth() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api.auth.me(),
    retry: false,
    staleTime: 60_000,
  })
}
