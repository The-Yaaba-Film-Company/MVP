// API contract types. The frontend owns this contract; the FastAPI backend
// must satisfy it (docs/plan-frontend-tdd.md, "Contract ownership").
// Mirrors SPEC.md §4.3 schema and §7 API surface, plus
// `docs/Screenplay Editor — Frontend Technical Specification.md` §50.

export const ENTITY_TYPES = [
  'character',
  'location',
  'prop',
  'vehicle',
  'set_dressing',
  'wardrobe',
  'sound',
  'vfx',
  'sfx',
  'makeup',
  'hair',
  'stunt',
  'animal',
  'extra',
  'equipment',
  'camera_setup',
  'other',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

export type IntExt = 'INT' | 'EXT' | 'INT_EXT'

export type ProjectRole = 'owner' | 'editor' | 'viewer'

/** A Tiptap/ProseMirror node; `scenes.content` is a full doc-shaped tree. */
export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
}

export interface User {
  id: string
  email: string
  display_name: string
}

export interface Project {
  id: string
  title: string
  description: string | null
  owner_id: string
  role: ProjectRole
  created_at: string
  updated_at: string
}

export interface Screenplay {
  id: string
  project_id: string
  title: string
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface Scene {
  id: string
  screenplay_id: string
  order_key: number
  number: string | null
  number_suffix: string | null
  locked: boolean
  int_ext: IntExt | null
  location_entity_id: string | null
  time_of_day: string | null
  heading_modifier: string | null
  content: TiptapNode
  content_hash: string
  created_at: string
  updated_at: string
}

export interface Entity {
  id: string
  project_id: string
  entity_type: EntityType
  canonical_name: string
  aliases: string[]
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AnnotationSource = 'manual' | 'ai_accepted'

export interface Annotation {
  id: string
  scene_id: string
  node_id: string
  start_offset: number
  end_offset: number
  entity_id: string
  source: AnnotationSource
  created_by: string | null
  created_at: string
}

export type AiSuggestionStatus = 'pending' | 'accepted' | 'rejected'

export interface AiSuggestion {
  id: string
  scene_id: string
  node_id: string
  matched_text: string
  start_offset: number | null
  end_offset: number | null
  suggested_type: EntityType
  suggested_name: string
  matched_entity_id: string | null
  confidence: number | null
  model: string
  prompt_version: string
  status: AiSuggestionStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export type ValidationIssueType = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  type: ValidationIssueType
  message: string
  node_id: string
}

export interface SceneMetrics {
  scene_id: string
  start_page: number
  end_page: number
  page_length: number
}

export interface PaginationReport {
  page_count: number
  runtime_minutes: number
  scene_metrics: SceneMetrics[]
}

export interface CharacterReport {
  id: string
  canonical_name: string
  aliases: string[]
  scene_ids: string[]
  dialogue_count: number
}

export interface LocationReport {
  id: string
  canonical_name: string
  aliases: string[]
  scene_ids: string[]
}

export interface EntityReport {
  id: string
  entity_type: EntityType
  canonical_name: string
  aliases: string[]
  scene_ids: string[]
  occurrence_count: number
}

export type ProjectReportKind = 'characters' | 'locations' | 'entities'

export type SearchResultKind =
  'character' | 'location' | 'scene' | 'entity' | 'text'

export interface SearchResult {
  id: string
  kind: SearchResultKind
  match: string
  snippet: string
  scene_id: string | null
  node_id: string | null
  start_offset: number | null
  end_offset: number | null
}

// ---- Request payloads ----

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  display_name: string
}

export interface CreateProjectRequest {
  title: string
  description?: string
}

export interface UpdateProjectRequest {
  title?: string
  description?: string | null
}

export interface CreateScreenplayRequest {
  title: string
}

export interface CreateSceneRequest {
  content: TiptapNode
}

export interface UpdateSceneRequest {
  content: TiptapNode
}

export interface ReorderSceneRequest {
  order_key: number
}

export interface CreateAnnotationRequest {
  node_id: string
  start_offset: number
  end_offset: number
  entity_id: string
}

export interface CreateEntityRequest {
  entity_type: EntityType
  canonical_name: string
  aliases?: string[]
}

export interface SearchProjectQuery {
  q?: string
  types?: EntityType[]
}
