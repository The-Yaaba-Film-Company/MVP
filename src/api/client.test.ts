import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { api } from './client'
import { isApiError } from './errors'
import { readCsrfToken } from './csrf'
import { server } from './mocks/server'
import { buildUser } from './mocks/fixtures'
import type { Scene } from './types'

afterEach(() => {
  document.cookie = 'csrf_token=; Max-Age=0; path=/'
  vi.unstubAllGlobals()
})

describe('readCsrfToken', () => {
  it('returns null when no csrf_token cookie is set', () => {
    document.cookie = 'foo=bar; path=/'
    expect(readCsrfToken()).toBeNull()
  })

  it('reads the csrf_token cookie', () => {
    document.cookie = 'csrf_token=csrf-abc123; path=/'
    expect(readCsrfToken()).toBe('csrf-abc123')
  })

  it('ignores unrelated cookies', () => {
    document.cookie = 'a=1; path=/'
    document.cookie = 'csrf_token=csrf-xyz; path=/'
    document.cookie = 'b=2; path=/'
    expect(readCsrfToken()).toBe('csrf-xyz')
  })
})

describe('api client contract', () => {
  it('GET /auth/me returns the signed-in user', async () => {
    const me = buildUser()
    server.use(http.get('/api/auth/me', () => HttpResponse.json(me)))
    await expect(api.auth.me()).resolves.toEqual(me)
  })

  it('sends X-CSRF-Token on mutating requests', async () => {
    document.cookie = 'csrf_token=csrf-abc123; path=/'
    let seen: string | null = null
    server.use(
      http.patch('/api/scenes/scene-1', ({ request }) => {
        seen = request.headers.get('x-csrf-token')
        return HttpResponse.json({
          ...sceneFixture,
          content_hash: 'hash-2',
        })
      }),
    )
    await api.scenes.update('scene-1', {
      content: { type: 'doc', content: [] },
    })
    expect(seen).toBe('csrf-abc123')
  })

  it('does not send X-CSRF-Token on GET requests', async () => {
    document.cookie = 'csrf_token=csrf-abc123; path=/'
    let seen: string | null = 'sentinel'
    server.use(
      http.get('/api/auth/me', ({ request }) => {
        seen = request.headers.get('x-csrf-token')
        return HttpResponse.json(buildUser())
      }),
    )
    await api.auth.me()
    expect(seen).toBeNull()
  })

  it('maps 401 to UNAUTHENTICATED and emits auth:session-expired', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ detail: 'nope' }, { status: 401 }),
      ),
    )
    const listener = vi.fn()
    window.addEventListener('auth:session-expired', listener)
    await expect(api.auth.me()).rejects.toSatisfy(
      (e: unknown) =>
        isApiError(e) && e.code === 'UNAUTHENTICATED' && e.status === 401,
    )
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('maps 403 to CSRF_FAILED', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ detail: 'csrf' }, { status: 403 }),
      ),
    )
    await expect(
      api.auth.login({ email: 'a@b.c', password: 'x' }),
    ).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'CSRF_FAILED',
    )
  })

  it('maps 409 to CONFLICT (scene changed server-side)', async () => {
    server.use(
      http.patch('/api/scenes/scene-1', () =>
        HttpResponse.json({ detail: 'conflict' }, { status: 409 }),
      ),
    )
    await expect(
      api.scenes.update('scene-1', { content: { type: 'doc', content: [] } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        isApiError(e) && e.code === 'CONFLICT' && e.status === 409,
    )
  })

  it('maps network failure to NETWORK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    await expect(api.auth.me()).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'NETWORK',
    )
  })

  it('returns a typed Scene list from GET /screenplays/:id/scenes', async () => {
    server.use(
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json({ items: [sceneFixture] }),
      ),
    )
    const { items } = await api.scenes.list('screenplay-1')
    expect(items[0].id).toBe('scene-1')
    expect(items[0].content.type).toBe('doc')
  })
})

const sceneFixture: Scene = {
  id: 'scene-1',
  screenplay_id: 'screenplay-1',
  order_key: 1,
  number: '1',
  number_suffix: null,
  locked: false,
  int_ext: 'INT',
  location_entity_id: null,
  time_of_day: null,
  heading_modifier: null,
  content: { type: 'doc', content: [] },
  content_hash: 'hash-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}
