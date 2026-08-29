import type {
  AiSuggestion,
  Annotation,
  Entity,
  EntityType,
  Project,
  Scene,
  Screenplay,
  TiptapNode,
  User,
} from '../types'

let seq = 0
export function uid(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}
export function resetUid(): void {
  seq = 0
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'writer@example.com',
    display_name: 'Writer',
    ...overrides,
  }
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    title: 'Project: Test',
    description: null,
    owner_id: 'user-1',
    role: 'owner',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function buildScreenplay(
  overrides: Partial<Screenplay> = {},
): Screenplay {
  return {
    id: 'screenplay-1',
    project_id: 'project-1',
    title: 'My Feature',
    locked_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function buildHeading(
  location = 'POLICE STATION',
  timeOfDay = 'NIGHT',
): TiptapNode {
  return {
    type: 'sceneHeading',
    attrs: { intExt: 'INT', location, timeOfDay },
  }
}

export function buildScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    screenplay_id: 'screenplay-1',
    order_key: 1,
    number: '1',
    number_suffix: null,
    locked: false,
    int_ext: 'INT',
    location_entity_id: null,
    time_of_day: 'NIGHT',
    heading_modifier: null,
    content: {
      type: 'doc',
      content: [
        buildHeading(),
        {
          type: 'action',
          attrs: { id: 'n1' },
          content: [{ type: 'text', text: 'John enters the room.' }],
        },
      ],
    },
    content_hash: 'hash-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function buildEntity(
  overrides: Partial<Entity> = {},
  entityType: EntityType = 'character',
  name = 'JOHN',
): Entity {
  return {
    id: 'entity-1',
    project_id: 'project-1',
    entity_type: entityType,
    canonical_name: name,
    aliases: [],
    attributes: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function buildAnnotation(
  overrides: Partial<Annotation> = {},
): Annotation {
  return {
    id: 'annotation-1',
    scene_id: 'scene-1',
    node_id: 'n1',
    start_offset: 0,
    end_offset: 4,
    entity_id: 'entity-1',
    source: 'manual',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function buildSuggestion(
  overrides: Partial<AiSuggestion> = {},
): AiSuggestion {
  return {
    id: 'suggestion-1',
    scene_id: 'scene-1',
    node_id: 'n1',
    matched_text: 'pistol',
    start_offset: 17,
    end_offset: 23,
    suggested_type: 'prop',
    suggested_name: 'PISTOL',
    matched_entity_id: null,
    confidence: 0.92,
    model: 'claude-test',
    prompt_version: '1',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export interface Seed {
  user: User
  projects: Project[]
  screenplays: Screenplay[]
  scenes: Scene[]
  entities: Entity[]
  annotations: Annotation[]
  suggestions: AiSuggestion[]
}

export function seed(overrides: Partial<Seed> = {}): Seed {
  return {
    user: buildUser(),
    projects: [buildProject()],
    screenplays: [buildScreenplay()],
    scenes: [
      buildScene({ id: 'scene-1', order_key: 1, number: '1' }),
      buildScene({
        id: 'scene-2',
        order_key: 2,
        number: '2',
        location_entity_id: null,
      }),
    ],
    entities: [buildEntity()],
    annotations: [buildAnnotation()],
    suggestions: [],
    ...overrides,
  }
}
