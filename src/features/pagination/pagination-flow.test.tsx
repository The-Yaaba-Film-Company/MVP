import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import { server } from '#/api/mocks/server'
import { buildScene } from '#/api/mocks/fixtures'
import { renderApp } from '#/test/renderApp'
import { setPaginationPublishDebounceMs } from './usePaginationReport'
import type { PaginationReport, Scene } from '#/api/types'

const SCENE_ROUTE = '/projects/project-1/screenplays/screenplay-1/scene'

const CSRF = 'test-csrf'

function actScene(id: string, order: number, text: string): Scene {
  return buildScene({
    id,
    order_key: order,
    number: String(order),
    content: {
      type: 'doc',
      content: [
        {
          type: 'sceneHeading',
          attrs: {
            intExt: 'INT',
            location: 'POLICE STATION',
            timeOfDay: 'NIGHT',
          },
        },
        {
          type: 'action',
          attrs: { id: `${id}-n` },
          content: [{ type: 'text', text }],
        },
      ],
    },
  })
}

describe('pagination (client-measured, server-cached)', () => {
  const published: Array<{ header: string | null; body: PaginationReport }> = []

  beforeEach(() => {
    setPaginationPublishDebounceMs(0)
    published.length = 0
    document.cookie = `csrf_token=${CSRF}; path=/`
    server.use(
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json({
          items: [
            actScene('scene-1', 1, 'John enters the room.'),
            actScene('scene-2', 2, 'Caroline runs across the grass.'),
          ],
        }),
      ),
      // Deliberately stale cache: computed metrics must win over the GET.
      http.get('/api/screenplays/screenplay-1/reports/pagination', () =>
        HttpResponse.json({
          page_count: 99,
          runtime_minutes: 99,
          scene_metrics: [],
        }),
      ),
      http.patch(
        '/api/screenplays/screenplay-1/reports/pagination',
        async ({ request }) => {
          const body = (await request.json()) as PaginationReport
          published.push({ header: request.headers.get('X-CSRF-Token'), body })
          return HttpResponse.json(body)
        },
      ),
    )
  })

  it('measures scenes client-side, publishes a CSRF-signed summary, and renders it', async () => {
    await renderApp({ initialEntries: [SCENE_ROUTE] })

    await waitFor(
      () => {
        expect(screen.getByTestId('scene-metadata')).toHaveTextContent(
          'Pages 1 · ~1 min',
        )
        expect(screen.getByTestId('scene-pages')).toHaveTextContent('1–1')
      },
      { timeout: 10_000 },
    )

    await waitFor(() => expect(published.length).toBe(1), { timeout: 10_000 })
    expect(published[0].header).toBe(CSRF)
    expect(published[0].body).toEqual({
      page_count: 1,
      runtime_minutes: 1,
      scene_metrics: [
        { scene_id: 'scene-1', start_page: 1, end_page: 1, page_length: 0.1 },
        { scene_id: 'scene-2', start_page: 1, end_page: 1, page_length: 0.1 },
      ],
    })
  })
})
