import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'

// Hierarchical, scoped key for surgical invalidation (SPEC.md §8).
export const validationKeys = {
  scene: (sceneId: string) => ['scene', sceneId, 'validation'] as const,
}

export function useSceneValidation(sceneId: string | undefined) {
  return useQuery({
    queryKey: validationKeys.scene(sceneId ?? ''),
    queryFn: () => api.validation.scene(sceneId!),
    enabled: !!sceneId,
    placeholderData: (prev) => prev,
  })
}
