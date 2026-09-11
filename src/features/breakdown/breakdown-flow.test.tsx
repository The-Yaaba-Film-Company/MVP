import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { renderApp } from '#/test/renderApp'

const BREAKDOWN = '/projects/project-1/screenplays/screenplay-1/breakdown'

async function renderBreakdown() {
  server.use(
    http.get('/api/projects/project-1/reports/characters', () =>
      HttpResponse.json([
        {
          id: 'entity-1',
          canonical_name: 'JOHN',
          aliases: [],
          scene_ids: ['scene-1'],
          dialogue_count: 2,
        },
        {
          id: 'entity-2',
          canonical_name: 'CAROLINE',
          aliases: [],
          scene_ids: ['scene-1', 'scene-2'],
          dialogue_count: 5,
        },
      ]),
    ),
    http.get('/api/projects/project-1/reports/locations', () =>
      HttpResponse.json([
        {
          id: 'entity-3',
          canonical_name: 'POLICE STATION',
          aliases: [],
          scene_ids: ['scene-1'],
        },
        {
          id: 'entity-4',
          canonical_name: 'PARK',
          aliases: ['The Park'],
          scene_ids: ['scene-2'],
        },
      ]),
    ),
    http.get('/api/projects/project-1/reports/entities', () =>
      HttpResponse.json([
        {
          id: 'entity-5',
          entity_type: 'prop',
          canonical_name: 'PISTOL',
          aliases: [],
          scene_ids: ['scene-1'],
          occurrence_count: 3,
        },
      ]),
    ),
  )
  await renderApp({ initialEntries: [BREAKDOWN] })
  await screen.findByTestId('breakdown-view', {}, { timeout: 10_000 })
}

describe('breakdown view', () => {
  it('renders the characters report table with runtime summary', async () => {
    await renderBreakdown()

    expect(screen.getByTestId('breakdown-view')).toBeInTheDocument()
    const charRow = await screen.findByTestId(
      'breakdown-row-entity-1',
      {},
      { timeout: 10_000 },
    )
    expect(
      within(charRow).getByTestId('breakdown-cell-entity-1-name'),
    ).toHaveTextContent('JOHN')
    expect(
      within(charRow).getByTestId('breakdown-cell-entity-1-dialogue'),
    ).toHaveTextContent('2')
    expect(screen.getByTestId('breakdown-row-entity-2')).toHaveTextContent(
      'CAROLINE',
    )
    expect(screen.getByTestId('breakdown-runtime')).toHaveTextContent(
      'Estimated runtime: 47 min',
    )
  })

  it('sorts and filters the active report client-side', async () => {
    const user = userEvent.setup()
    await renderBreakdown()

    await user.click(screen.getByTestId('breakdown-sort-dialogue'))
    expect(screen.getByTestId('breakdown-name-cell-0')).toHaveTextContent(
      'JOHN',
    )
    await user.click(screen.getByTestId('breakdown-sort-dialogue'))
    expect(screen.getByTestId('breakdown-name-cell-0')).toHaveTextContent(
      'CAROLINE',
    )

    await user.type(screen.getByTestId('breakdown-filter'), 'JOHN')
    expect(screen.getByTestId('breakdown-row-entity-1')).toBeInTheDocument()
    expect(
      screen.queryByTestId('breakdown-row-entity-2'),
    ).not.toBeInTheDocument()
  })

  it('switches between characters, locations, and entities reports', async () => {
    const user = userEvent.setup()
    await renderBreakdown()

    await user.click(screen.getByTestId('breakdown-tab-locations'))
    expect(screen.getByTestId('breakdown-row-entity-3')).toHaveTextContent(
      'POLICE STATION',
    )
    expect(screen.getByTestId('breakdown-row-entity-4')).toHaveTextContent(
      'PARK',
    )

    await user.click(screen.getByTestId('breakdown-tab-entities'))
    expect(screen.getByTestId('breakdown-row-entity-5')).toHaveTextContent(
      'PISTOL',
    )
    expect(
      screen.queryByTestId('breakdown-row-entity-1'),
    ).not.toBeInTheDocument()
  })
})
