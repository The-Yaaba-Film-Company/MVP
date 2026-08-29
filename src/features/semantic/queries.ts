import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api/client'
import { reportKeys } from '../reports/queries'
import type {
  Annotation,
  CreateAnnotationRequest,
  CreateEntityRequest,
  Entity,
  EntityType,
} from '#/api/types'

// Hierarchical, scoped keys for surgical invalidation (SPEC.md §8).
export const semanticKeys = {
  annotations: (sceneId: string) => ['scene', sceneId, 'annotations'] as const,
  aiSuggestions: (sceneId: string) =>
    ['scene', sceneId, 'ai-suggestions'] as const,
  entities: (projectId: string, type: EntityType, q?: string) =>
    ['projects', projectId, 'entities', type, { q }] as const,
  entitiesPrefix: (projectId: string) =>
    ['projects', projectId, 'entities'] as const,
}

export function useAnnotations(sceneId: string | undefined) {
  return useQuery({
    queryKey: semanticKeys.annotations(sceneId ?? ''),
    queryFn: () => api.annotations.list(sceneId!),
    enabled: !!sceneId,
    placeholderData: (prev) => prev,
  })
}

export function useAiSuggestions(sceneId: string | undefined) {
  return useQuery({
    queryKey: semanticKeys.aiSuggestions(sceneId ?? ''),
    queryFn: () => api.ai.list(sceneId!),
    enabled: !!sceneId,
    placeholderData: (prev) => prev,
  })
}

export function useEntitySearch(
  projectId: string | undefined,
  type: EntityType | null,
  q: string,
  enabled = true,
) {
  return useQuery({
    queryKey: semanticKeys.entities(projectId ?? '', type ?? 'prop', q),
    queryFn: () => api.entities.search(projectId!, { type: type!, q }),
    enabled: enabled && !!projectId && !!type,
    placeholderData: (prev) => prev,
  })
}

export function useCreateAnnotation(sceneId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAnnotationRequest) =>
      api.annotations.create(sceneId, payload),
    onSuccess: (created) => {
      queryClient.setQueryData<{ items: Annotation[] }>(
        semanticKeys.annotations(sceneId),
        (old) => ({
          items: [...(old?.items ?? []), created],
        }),
      )
    },
  })
}

export interface CreateEntityAndAnnotateInput {
  entity: CreateEntityRequest
  annotation: CreateAnnotationRequest
}

export function useCreateEntity(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEntityRequest) =>
      api.entities.create(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: semanticKeys.entitiesPrefix(projectId),
      })
      void queryClient.invalidateQueries({
        queryKey: reportKeys.entities(projectId),
      })
    },
  })
}

export function useAnalyzeScene(sceneId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.ai.suggest(sceneId),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: semanticKeys.aiSuggestions(sceneId),
      })
    },
  })
}

export function useAcceptSuggestion(sceneId: string, projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.ai.accept(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: semanticKeys.annotations(sceneId),
      })
      void queryClient.invalidateQueries({
        queryKey: semanticKeys.aiSuggestions(sceneId),
      })
      void queryClient.invalidateQueries({
        queryKey: reportKeys.entities(projectId),
      })
    },
  })
}

export function useRejectSuggestion(sceneId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.ai.reject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: semanticKeys.aiSuggestions(sceneId),
      })
    },
  })
}

export interface EntityOption {
  id: string
  canonical_name: string
  entity_type: EntityType
  aliases: string[]
}

export function toEntityOptions(entities?: Entity[]): EntityOption[] {
  return (entities ?? []).map((e) => ({
    id: e.id,
    canonical_name: e.canonical_name,
    entity_type: e.entity_type,
    aliases: e.aliases,
  }))
}
