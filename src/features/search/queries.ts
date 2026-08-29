import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'
import type { EntityType } from '#/api/types'

// Hierarchical, scoped key for surgical invalidation (SPEC.md §8).
export const searchKeys = {
  project: (projectId: string, q: string, types: EntityType[]) =>
    ['projects', projectId, 'search', { q, types }] as const,
}

export function useProjectSearch(
  projectId: string | undefined,
  q: string,
  types: EntityType[] = [],
) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: searchKeys.project(projectId ?? '', trimmed, types),
    queryFn: () => api.search.project(projectId!, { q: trimmed, types }),
    enabled: !!projectId && trimmed.length > 0,
    placeholderData: (prev) => prev,
  })
}
