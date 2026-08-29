import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'

// Hierarchical, scoped keys for surgical invalidation (SPEC.md §8).
export const projectsKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  screenplays: (projectId: string) =>
    ['projects', projectId, 'screenplays'] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectsKeys.all,
    queryFn: () => api.projects.list(),
  })
}

export function useProjectScreenplays(projectId: string) {
  return useQuery({
    queryKey: projectsKeys.screenplays(projectId),
    queryFn: () => api.screenplays.list(projectId),
  })
}
