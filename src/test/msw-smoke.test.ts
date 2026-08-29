import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '#/api/mocks/server'

async function rawGet(path: string) {
  return fetch(path, { headers: { accept: 'application/json' } })
}

describe('msw harness smoke', () => {
  it('intercepts requests via the contract handlers', async () => {
    const res = await rawGet('/api/auth/me')
    expect(res.ok).toBe(true)
    expect((await res.json()).email).toBe('writer@example.com')
  })

  it('lets tests override a handler with server.use', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ detail: 'not signed in' }, { status: 401 }),
      ),
    )
    const res = await rawGet('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('unhandled requests are rejected as errors', async () => {
    await expect(rawGet('/api/never-registered')).rejects.toThrow()
  })
})
