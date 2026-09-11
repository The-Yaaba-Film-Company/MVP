import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'

// Hierarchical, scoped keys for surgical invalidation (SPEC §8).
export const reportKeys = {
  characters: (projectId: string) =>
    ['projects', projectId, 'reports', 'characters'] as const,
  locations: (projectId: string) =>
    ['projects', projectId, 'reports', 'locations'] as const,
  entities: (projectId: string) =>
    ['projects', projectId, 'reports', 'entities'] as const,
  runtime: (screenplayId: string) =>
    ['screenplays', screenplayId, 'reports', 'runtime'] as const,
  pagination: (screenplayId: string) =>
    ['screenplays', screenplayId, 'reports', 'pagination'] as const,
}

export function useCharacterReport(projectId: string) {
  return useQuery({
    queryKey: reportKeys.characters(projectId),
    queryFn: () => api.reports.characters(projectId),
  })
}

export function useLocationReport(projectId: string) {
  return useQuery({
    queryKey: reportKeys.locations(projectId),
    queryFn: () => api.reports.locations(projectId),
  })
}

export function useEntityReport(projectId: string) {
  return useQuery({
    queryKey: reportKeys.entities(projectId),
    queryFn: () => api.reports.entities(projectId),
  })
}

export function useRuntime(screenplayId: string) {
  return useQuery({
    queryKey: reportKeys.runtime(screenplayId),
    queryFn: () => api.reports.runtime(screenplayId),
  })
}

export function usePaginationSummary(screenplayId: string) {
  return useQuery({
    queryKey: reportKeys.pagination(screenplayId),
    queryFn: () => api.reports.pagination(screenplayId),
  })
}
