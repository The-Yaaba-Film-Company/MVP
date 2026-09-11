import { ApiError, toApiError, toNetworkError } from './errors'
import { readCsrfToken } from './csrf'
import type {
  Annotation,
  CharacterReport,
  CreateAnnotationRequest,
  CreateEntityRequest,
  CreateProjectRequest,
  CreateSceneRequest,
  CreateScreenplayRequest,
  Entity,
  EntityReport,
  EntityType,
  LocationReport,
  LoginRequest,
  PaginationReport,
  Project,
  RegisterRequest,
  ReorderSceneRequest,
  Scene,
  Screenplay,
  SearchProjectQuery,
  SearchResult,
  TiptapNode,
  User,
  ValidationIssue,
  AiSuggestion,
  UpdateProjectRequest,
} from './types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

function url(path: string, query?: Record<string, string | undefined>): string {
  const base = `${BASE_URL}/api${path}`
  if (!query) return base
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

function isMutating(method: string): boolean {
  return !['GET', 'HEAD'].includes(method)
}

async function request<T>(
  method: string,
  path: string,
  init: { body?: unknown; query?: Record<string, string | undefined> } = {},
): Promise<T> {
  const headers = new Headers({ accept: 'application/json' })
  if (init.body !== undefined) headers.set('content-type', 'application/json')

  if (isMutating(method)) {
    const csrf = readCsrfToken()
    if (csrf) headers.set('X-CSRF-Token', csrf)
  }

  let res: Response
  try {
    res = await fetch(url(path, init.query), {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'include',
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await toApiError(res)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

const get = <T>(path: string, query?: Record<string, string | undefined>) =>
  request<T>('GET', path, { query })
const send = <T>(
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  path: string,
  body?: unknown,
) => request<T>(method, path, { body })

export const api = {
  auth: {
    register: (payload: RegisterRequest) =>
      send<User>('POST', '/auth/register', payload),
    login: (payload: LoginRequest) =>
      send<User>('POST', '/auth/login', payload),
    logout: () => send<void>('POST', '/auth/logout'),
    me: () => get<User>('/auth/me'),
  },

  projects: {
    list: () => get<Project[]>('/projects'),
    create: (payload: CreateProjectRequest) =>
      send<Project>('POST', '/projects', payload),
    get: (id: string) => get<Project>(`/projects/${id}`),
    update: (id: string, payload: UpdateProjectRequest) =>
      send<Project>('PATCH', `/projects/${id}`, payload),
    remove: (id: string) => send<void>('DELETE', `/projects/${id}`),
  },

  screenplays: {
    list: (projectId: string) =>
      get<Screenplay[]>(`/projects/${projectId}/screenplays`),
    create: (projectId: string, payload: CreateScreenplayRequest) =>
      send<Screenplay>('POST', `/projects/${projectId}/screenplays`, payload),
    get: (id: string) => get<Screenplay>(`/screenplays/${id}`),
    update: (id: string, payload: { title?: string }) =>
      send<Screenplay>('PATCH', `/screenplays/${id}`, payload),
    lock: (id: string) => send<Screenplay>('POST', `/screenplays/${id}/lock`),
  },

  scenes: {
    list: (screenplayId: string) =>
      get<{ items: Scene[] }>(`/screenplays/${screenplayId}/scenes`),
    create: (screenplayId: string, payload: CreateSceneRequest) =>
      send<Scene>('POST', `/screenplays/${screenplayId}/scenes`, payload),
    get: (id: string) => get<Scene>(`/scenes/${id}`),
    update: (id: string, payload: { content: TiptapNode }) =>
      send<Scene>('PATCH', `/scenes/${id}`, payload),
    remove: (id: string) => send<void>('DELETE', `/scenes/${id}`),
    reorder: (id: string, payload: ReorderSceneRequest) =>
      send<{ items: Scene[] }>('POST', `/scenes/${id}/reorder`, payload),
    duplicate: (id: string) => send<Scene>('POST', `/scenes/${id}/duplicate`),
  },

  entities: {
    list: (projectId: string) =>
      get<Entity[]>(`/projects/${projectId}/entities`),
    search: (projectId: string, query: { type: EntityType; q?: string }) => {
      const params: Record<string, string | undefined> = { type: query.type }
      if (query.q) params.q = query.q
      return get<Entity[]>(`/projects/${projectId}/entities`, params)
    },
    create: (projectId: string, payload: CreateEntityRequest) =>
      send<Entity>('POST', `/projects/${projectId}/entities`, payload),
    get: (id: string) => get<Entity>(`/entities/${id}`),
    update: (
      id: string,
      payload: { canonical_name?: string; aliases?: string[] },
    ) => send<Entity>('PATCH', `/entities/${id}`, payload),
  },

  annotations: {
    list: (sceneId: string) =>
      get<{ items: Annotation[] }>(`/scenes/${sceneId}/annotations`),
    create: (sceneId: string, payload: CreateAnnotationRequest) =>
      send<Annotation>('POST', `/scenes/${sceneId}/annotations`, payload),
    remove: (id: string) => send<void>('DELETE', `/annotations/${id}`),
  },

  ai: {
    suggest: (sceneId: string) =>
      send<{ items: AiSuggestion[] }>('POST', `/scenes/${sceneId}/ai-suggest`),
    list: (sceneId: string) =>
      get<{ items: AiSuggestion[] }>(`/scenes/${sceneId}/ai-suggestions`),
    accept: (id: string) =>
      send<AiSuggestion>('POST', `/ai-suggestions/${id}/accept`),
    reject: (id: string) =>
      send<AiSuggestion>('POST', `/ai-suggestions/${id}/reject`),
  },

  validation: {
    scene: (sceneId: string) =>
      get<{ items: ValidationIssue[] }>(`/scenes/${sceneId}/validation`),
  },

  reports: {
    characters: (projectId: string) =>
      get<CharacterReport[]>(`/projects/${projectId}/reports/characters`),
    locations: (projectId: string) =>
      get<LocationReport[]>(`/projects/${projectId}/reports/locations`),
    entities: (projectId: string) =>
      get<EntityReport[]>(`/projects/${projectId}/reports/entities`),
    runtime: (screenplayId: string) =>
      get<{ runtime_minutes: number }>(
        `/screenplays/${screenplayId}/reports/runtime`,
      ),
    pagination: (screenplayId: string) =>
      get<PaginationReport>(`/screenplays/${screenplayId}/reports/pagination`),
    updatePagination: (screenplayId: string, payload: PaginationReport) =>
      send<PaginationReport>(
        'PATCH',
        `/screenplays/${screenplayId}/reports/pagination`,
        payload,
      ),
  },

  search: {
    project: (projectId: string, query: SearchProjectQuery) => {
      const params: Record<string, string | undefined> = {}
      if (query.q) params.q = query.q
      if (query.types?.length) params.types = query.types.join(',')
      return get<{ items: SearchResult[] }>(
        `/projects/${projectId}/search`,
        params,
      )
    },
  },
}

export { ApiError }
export type {
  Project,
  Screenplay,
  Scene,
  Entity,
  Annotation,
  AiSuggestion,
  User,
  ValidationIssue,
  CharacterReport,
  LocationReport,
  EntityReport,
  PaginationReport,
  EntityType,
  SearchResult,
}
