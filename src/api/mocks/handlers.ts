import { HttpResponse, http } from 'msw'
import type { JsonBodyType } from 'msw'
import { buildAnnotation, seed } from './fixtures'
import type { Annotation, Entity, EntityType } from '../types'

// Deterministic, non-mutating contract handlers. Feature tests override with
// `server.use(...)` when they need specific state transitions (401s, 409s, ...).
const data = seed()

function items<T>(value: T[]) {
  return { items: value }
}

function json(value: JsonBodyType, status = 200) {
  return HttpResponse.json(value, { status })
}

export const handlers = [
  http.get('/api/health', () => json({ status: 'ok' })),

  // ---- auth (SPEC §7) ----
  http.get('/api/auth/me', () => json(data.user)),
  http.post('/api/auth/register', () => json(data.user)),
  http.post('/api/auth/login', () => json(data.user)),
  http.post('/api/auth/logout', () => json(null, 204)),

  // ---- projects ----
  http.get('/api/projects', () => json(data.projects)),
  http.post('/api/projects', () => json(data.projects[0])),
  http.get('/api/projects/:id', ({ params }) =>
    json(data.projects.find((p) => p.id === params.id) ?? data.projects[0]),
  ),
  http.patch('/api/projects/:id', () => json(data.projects[0])),
  http.delete('/api/projects/:id', () => json(null, 204)),

  // ---- screenplays ----
  http.get('/api/projects/:id/screenplays', () => json(data.screenplays)),
  http.post('/api/projects/:id/screenplays', () => json(data.screenplays[0])),
  http.get('/api/screenplays/:id', () => json(data.screenplays[0])),
  http.patch('/api/screenplays/:id', () => json(data.screenplays[0])),
  http.post('/api/screenplays/:id/lock', () =>
    json({ ...data.screenplays[0], locked_at: '2026-01-02T00:00:00Z' }),
  ),

  // ---- scenes ----
  http.get('/api/screenplays/:id/scenes', () => json(items(data.scenes))),
  http.post('/api/screenplays/:id/scenes', () => json(data.scenes[0])),
  http.get('/api/scenes/:id', ({ params }) =>
    json(data.scenes.find((s) => s.id === params.id) ?? data.scenes[0]),
  ),
  http.patch('/api/scenes/:id', async ({ request, params }) => {
    const body = (await request.json()) as { content: unknown }
    const scene = data.scenes.find((s) => s.id === params.id) ?? data.scenes[0]
    return json({
      ...scene,
      content: body.content,
      content_hash: `hash-${Date.now()}`,
    })
  }),
  http.delete('/api/scenes/:id', () => json(null, 204)),
  http.post('/api/scenes/:id/reorder', () => json(items(data.scenes))),
  http.post('/api/scenes/:id/duplicate', () => json(data.scenes[0])),

  // ---- entities ----
  http.get('/api/projects/:id/entities', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const q = url.searchParams.get('q')?.trim().toLowerCase()
    let matches = data.entities
    if (type) matches = matches.filter((e) => e.entity_type === type)
    if (q)
      matches = matches.filter((e) =>
        [e.canonical_name, ...e.aliases].some((s) =>
          s.toLowerCase().includes(q),
        ),
      )
    return json(matches)
  }),
  http.post('/api/projects/:id/entities', async ({ request }) => {
    const body = (await request.json()) as {
      entity_type: EntityType
      canonical_name: string
      aliases?: string[]
    }
    const entity: Entity = {
      id: `entity-${Date.now()}`,
      project_id: 'project-1',
      entity_type: body.entity_type,
      canonical_name: body.canonical_name,
      aliases: body.aliases ?? [],
      attributes: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    data.entities.push(entity)
    return json(entity, 201)
  }),
  http.get('/api/entities/:id', () => json(data.entities[0])),
  http.patch('/api/entities/:id', () => json(data.entities[0])),

  // ---- annotations ----
  http.get('/api/scenes/:id/annotations', () => json(items(data.annotations))),
  http.post('/api/scenes/:id/annotations', async ({ request, params }) => {
    const body = (await request.json()) as Partial<Annotation>
    return json(
      buildAnnotation({
        ...body,
        id: `annotation-${Date.now()}`,
        scene_id: String(params.id),
        source: 'manual',
        created_at: new Date().toISOString(),
      }),
    )
  }),
  http.delete('/api/annotations/:id', () => json(null, 204)),

  // ---- ai suggestions ----
  http.post('/api/scenes/:id/ai-suggest', () => json(items(data.suggestions))),
  http.get('/api/scenes/:id/ai-suggestions', () =>
    json(items(data.suggestions)),
  ),
  http.post('/api/ai-suggestions/:id/accept', async ({ params }) => {
    const suggestion = data.suggestions.find((s) => s.id === params.id)
    if (!suggestion) return json({ detail: 'not found' }, 404)
    suggestion.status = 'accepted'
    suggestion.reviewed_at = new Date().toISOString()
    if (suggestion.start_offset !== null && suggestion.end_offset !== null)
      data.annotations.push(
        buildAnnotation({
          id: `annotation-${Date.now()}`,
          scene_id: suggestion.scene_id,
          node_id: suggestion.node_id,
          start_offset: suggestion.start_offset,
          end_offset: suggestion.end_offset,
          entity_id: suggestion.matched_entity_id ?? suggestion.suggested_name,
          source: 'ai_accepted',
        }),
      )
    return json(suggestion)
  }),
  http.post('/api/ai-suggestions/:id/reject', async ({ params }) => {
    const suggestion = data.suggestions.find((s) => s.id === params.id)
    if (!suggestion) return json({ detail: 'not found' }, 404)
    suggestion.status = 'rejected'
    suggestion.reviewed_at = new Date().toISOString()
    return json(suggestion)
  }),

  // ---- validation ----
  http.get('/api/scenes/:id/validation', () =>
    json(
      items([
        {
          id: 'v1',
          type: 'warning' as const,
          message: 'Dialogue has no associated Character.',
          node_id: 'n99',
        },
      ]),
    ),
  ),

  // ---- reports ----
  http.get('/api/projects/:id/reports/characters', () =>
    json([
      {
        id: 'entity-1',
        canonical_name: 'JOHN',
        aliases: [],
        scene_ids: ['scene-1'],
        dialogue_count: 2,
      },
    ]),
  ),
  http.get('/api/projects/:id/reports/locations', () =>
    json([
      {
        id: 'entity-2',
        canonical_name: 'POLICE STATION',
        aliases: [],
        scene_ids: ['scene-1'],
      },
    ]),
  ),
  http.get('/api/projects/:id/reports/entities', () =>
    json([
      {
        id: 'entity-3',
        entity_type: 'prop',
        canonical_name: 'PISTOL',
        aliases: [],
        scene_ids: ['scene-1', 'scene-2'],
        occurrence_count: 3,
      },
    ]),
  ),
  http.get('/api/screenplays/:id/reports/runtime', () =>
    json({ runtime_minutes: 47 }),
  ),
  http.get('/api/screenplays/:id/reports/pagination', () =>
    json({
      page_count: 34,
      runtime_minutes: 34,
      scene_metrics: [
        { scene_id: 'scene-1', start_page: 1, end_page: 1, page_length: 0.7 },
      ],
    }),
  ),
  http.patch('/api/screenplays/:id/reports/pagination', async ({ request }) =>
    json((await request.json()) as JsonBodyType),
  ),

  // ---- search ----
  http.get('/api/projects/:id/search', () =>
    json(
      items([
        {
          id: 'sr-1',
          kind: 'entity' as const,
          match: 'pistol',
          snippet: 'carrying...pistol.',
          scene_id: 'scene-1',
          node_id: 'n1',
          start_offset: 17,
          end_offset: 23,
        },
      ]),
    ),
  ),
]
