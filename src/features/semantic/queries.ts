import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api/client'
import { reportKeys } from '../reports/queries'
import type {
  AiSuggestion,
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

function temporaryId(prefix: string): string {
  return `${prefix}-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function optimisticAnnotation(
  sceneId: string,
  payload: CreateAnnotationRequest,
  createdAt: string,
): Annotation {
  return {
    id: temporaryId('ann'),
    scene_id: sceneId,
    node_id: payload.node_id,
    start_offset: payload.start_offset,
    end_offset: payload.end_offset,
    entity_id: payload.entity_id,
    source: 'manual',
    created_by: null,
    created_at: createdAt,
  }
}

export function useCreateAnnotation(sceneId: string) {
  const queryClient = useQueryClient()
  const key = semanticKeys.annotations(sceneId)
  return useMutation({
    mutationFn: (payload: CreateAnnotationRequest) =>
      api.annotations.create(sceneId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<{ items: Annotation[] }>(key)
      // Write the decoration overlay optimistically; reconcile on success.
      queryClient.setQueryData<{ items: Annotation[] }>(key, (old) => ({
        items: [
          ...(old?.items ?? []),
          optimisticAnnotation(sceneId, payload, new Date().toISOString()),
        ],
      }))
      return { previous }
    },
    onSuccess: (created, payload) => {
      // Replace the optimistic temp with the server's canonical record,
      // matching on the un-annotated span (temp ids are not stable).
      queryClient.setQueryData<{ items: Annotation[] }>(key, (old) => {
        const items = (old?.items ?? []).filter(
          (a) =>
            !(
              a.node_id === payload.node_id &&
              a.start_offset === payload.start_offset &&
              a.end_offset === payload.end_offset &&
              a.id.startsWith('ann-pending-')
            ),
        )
        return { items: [...items, created] }
      })
    },
    onError: (_err, _payload, context) => {
      // Server rejected the annotation: roll back to the snapshot.
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}

export interface CreateEntityAndAnnotateInput {
  entity: CreateEntityRequest
  annotation: CreateAnnotationRequest
}

export function useCreateEntity(projectId: string) {
  const queryClient = useQueryClient()
  const prefixKey = semanticKeys.entitiesPrefix(projectId)
  return useMutation({
    mutationFn: (payload: CreateEntityRequest) =>
      api.entities.create(projectId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: prefixKey })
      const previous = queryClient.getQueriesData<
        Entity[] | { items: Entity[] }
      >({ queryKey: prefixKey })
      const now = new Date().toISOString()
      const optimistic: Entity = {
        id: temporaryId('ent'),
        project_id: projectId,
        entity_type: payload.entity_type,
        canonical_name: payload.canonical_name,
        aliases: payload.aliases ?? [],
        attributes: {},
        created_at: now,
        updated_at: now,
      }
      queryClient.setQueriesData<Entity[] | { items: Entity[] }>(
        { queryKey: prefixKey },
        (old) => {
          if (Array.isArray(old)) return [...old, optimistic]
          if (old && 'items' in old)
            return { ...old, items: [...old.items, optimistic] }
          return old
        },
      )
      return { previous }
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous)
          queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: prefixKey })
      void queryClient.invalidateQueries({
        queryKey: reportKeys.entities(projectId),
      })
    },
  })
}

export function useAnalyzeScene(sceneId: string) {
  const queryClient = useQueryClient()
  const key = semanticKeys.aiSuggestions(sceneId)
  return useMutation({
    mutationFn: () => api.ai.suggest(sceneId),
    onSuccess: (data) => {
      console.log(data)
      // Surface the API response immediately instead of waiting on a refetch.
      queryClient.setQueryData(key, data)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (error) => {
      console.error('Failed to analyze scene:', error)
    },
  })
}

export function useAcceptSuggestion(sceneId: string, projectId: string) {
  const queryClient = useQueryClient()
  const suggestionsKey = semanticKeys.aiSuggestions(sceneId)
  const annotationsKey = semanticKeys.annotations(sceneId)
  return useMutation({
    mutationFn: (id: string) => api.ai.accept(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: suggestionsKey })
      await queryClient.cancelQueries({ queryKey: annotationsKey })
      const prevSuggestions = queryClient.getQueryData<{
        items: AiSuggestion[]
      }>(suggestionsKey)
      const prevAnnotations = queryClient.getQueryData<{
        items: Annotation[]
      }>(annotationsKey)
      const suggestion = prevSuggestions?.items.find((s) => s.id === id)
      // Flip the suggestion to accepted and optimistically add its annotation.
      queryClient.setQueryData<{ items: AiSuggestion[] }>(
        suggestionsKey,
        (old) => ({
          items: (old?.items ?? []).map((s) =>
            s.id === id ? { ...s, status: 'accepted' as const } : s,
          ),
        }),
      )
      if (
        suggestion &&
        suggestion.start_offset !== null &&
        suggestion.end_offset !== null
      ) {
        const { node_id, start_offset, end_offset } = suggestion
        queryClient.setQueryData<{ items: Annotation[] }>(
          annotationsKey,
          (old) => ({
            items: [
              ...(old?.items ?? []),
              {
                id: temporaryId('ann'),
                scene_id: sceneId,
                node_id,
                start_offset,
                end_offset,
                entity_id:
                  suggestion.matched_entity_id ?? suggestion.suggested_name,
                source: 'ai_accepted',
                created_by: null,
                created_at: new Date().toISOString(),
              },
            ],
          }),
        )
      }
      return { prevSuggestions, prevAnnotations }
    },
    onError: (_err, _id, context) => {
      if (context?.prevSuggestions)
        queryClient.setQueryData(suggestionsKey, context.prevSuggestions)
      if (context?.prevAnnotations)
        queryClient.setQueryData(annotationsKey, context.prevAnnotations)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: annotationsKey })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
      void queryClient.invalidateQueries({
        queryKey: reportKeys.entities(projectId),
      })
    },
  })
}

export function useRejectSuggestion(sceneId: string) {
  const queryClient = useQueryClient()
  const suggestionsKey = semanticKeys.aiSuggestions(sceneId)
  return useMutation({
    mutationFn: (id: string) => api.ai.reject(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: suggestionsKey })
      const previous = queryClient.getQueryData<{ items: AiSuggestion[] }>(
        suggestionsKey,
      )
      queryClient.setQueryData<{ items: AiSuggestion[] }>(
        suggestionsKey,
        (old) => ({
          items: (old?.items ?? []).map((s) =>
            s.id === id ? { ...s, status: 'rejected' as const } : s,
          ),
        }),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(suggestionsKey, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
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
