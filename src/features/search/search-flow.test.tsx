import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { renderApp } from '#/test/renderApp'
import { useWriterStore } from '../writer/store'

const WRITER = '/projects/project-1/screenplays/screenplay-1/writer'

beforeEach(() => {
  useWriterStore.setState({ activeSceneId: null })
})

describe('project search panel', () => {
  it('searches the project and navigates to the matching scene', async () => {
    let seenQ: string | null = null
    server.use(
      http.get('/api/projects/project-1/search', ({ request }) => {
        seenQ = new URL(request.url).searchParams.get('q')
        return HttpResponse.json({
          items: [
            {
              id: 'sr-1',
              kind: 'entity',
              match: 'PISTOL',
              snippet: 'carrying…pistol.',
              scene_id: 'scene-2',
              node_id: 'n1',
              start_offset: 17,
              end_offset: 23,
            },
          ],
        })
      }),
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json({
          items: [
            {
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
                  {
                    type: 'sceneHeading',
                    attrs: {
                      intExt: 'INT',
                      location: 'POLICE STATION',
                      timeOfDay: 'NIGHT',
                    },
                  },
                ],
              },
              content_hash: 'hash-1',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
            {
              id: 'scene-2',
              screenplay_id: 'screenplay-1',
              order_key: 2,
              number: '2',
              number_suffix: null,
              locked: false,
              int_ext: 'EXT',
              location_entity_id: null,
              time_of_day: 'DAY',
              heading_modifier: null,
              content: {
                type: 'doc',
                content: [
                  {
                    type: 'sceneHeading',
                    attrs: {
                      intExt: 'EXT',
                      location: 'PARK',
                      timeOfDay: 'DAY',
                    },
                  },
                ],
              },
              content_hash: 'hash-2',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
        }),
      ),
    )

    const { router } = await renderApp({ initialEntries: [WRITER] })
    await screen.findByTestId('project-search-input', {}, { timeout: 10_000 })

    const user = userEvent.setup()
    await user.type(screen.getByTestId('project-search-input'), 'pistol')

    const result = await screen.findByTestId(
      'search-result-sr-1',
      {},
      { timeout: 10_000 },
    )
    expect(seenQ).toBe('pistol')
    expect(result).toHaveTextContent('PISTOL')
    expect(result).toHaveTextContent('Entity')

    await user.click(result)
    await waitFor(
      () => expect(router.state.location.pathname).toContain('/scene'),
      { timeout: 10_000 },
    )
    expect(useWriterStore.getState().activeSceneId).toBe('scene-2')
  })

  it('shows an empty state when there are no matches', async () => {
    server.use(
      http.get('/api/projects/project-1/search', () =>
        HttpResponse.json({ items: [] }),
      ),
    )
    await renderApp({ initialEntries: [WRITER] })
    await screen.findByTestId('project-search-input', {}, { timeout: 10_000 })

    await userEvent.type(screen.getByTestId('project-search-input'), 'zzz')
    const results = await screen.findByTestId(
      'project-search-results',
      {},
      { timeout: 10_000 },
    )
    expect(results).toHaveTextContent('No matches')
  })
})
