import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'

// Hierarchical, scoped keys for surgical invalidation (SPEC.md §8).
export const sceneKeys = {
  list: (screenplayId: string) =>
    ['screenplays', screenplayId, 'scenes'] as const,
  detail: (id: string) => ['scene', id] as const,
}

export function useScenes(screenplayId: string) {
  return useQuery({
    queryKey: sceneKeys.list(screenplayId),
    queryFn: () => api.scenes.list(screenplayId),
  })
}
