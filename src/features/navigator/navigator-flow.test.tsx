import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { buildScene } from '#/api/mocks/fixtures'
import type { IntExt } from '#/api/types'
import { renderApp } from '#/test/renderApp'
import { useWriterStore } from '../writer/store'
import { setPaginationPublishDebounceMs } from '../pagination/usePaginationReport'

const NAV = '/projects/project-1/screenplays/screenplay-1/navigator'

function actScene(
  id: string,
  order: number,
  number: string,
  intExt: IntExt,
  location: string,
  timeOfDay: string,
  locked = false,
) {
  return buildScene({
    id,
    order_key: order,
    number,
    locked,
    int_ext: intExt,
    time_of_day: timeOfDay,
    content: {
      type: 'doc',
      content: [
        { type: 'sceneHeading', attrs: { intExt, location, timeOfDay } },
      ],
    },
  })
}

async function renderNavigator() {
  server.use(
    http.get('/api/screenplays/screenplay-1/scenes', () =>
      HttpResponse.json({
        items: [
          actScene('scene-1', 1, '1', 'INT', 'POLICE STATION', 'NIGHT'),
          actScene('scene-2', 2, '2', 'EXT', 'PARK', 'DAY'),
          actScene('scene-3', 3, '3', 'INT', 'COURTHOUSE', 'DAY', true),
        ],
      }),
    ),
    http.get('/api/screenplays/screenplay-1/reports/pagination', () =>
      HttpResponse.json({
        page_count: 6,
        runtime_minutes: 6,
        scene_metrics: [
          { scene_id: 'scene-1', start_page: 1, end_page: 3, page_length: 2.5 },
          { scene_id: 'scene-2', start_page: 3, end_page: 4, page_length: 1.5 },
        ],
      }),
    ),
  )
  const options = await renderApp({ initialEntries: [NAV] })
  await screen.findByTestId('navigator-view', {}, { timeout: 10_000 })
  return {
    router: options.router,
  }
}

describe('navigator view', () => {
  beforeEach(() => setPaginationPublishDebounceMs(0))

  it('lists every scene with heading, page range, and lock status', async () => {
    await renderNavigator()

    const row1 = await screen.findByTestId(
      'navigator-row-scene-1',
      {},
      { timeout: 10_000 },
    )
    expect(within(row1).getByTestId('navigator-number')).toHaveTextContent('1')
    expect(within(row1).getByTestId('navigator-heading')).toHaveTextContent(
      'INT. POLICE STATION - NIGHT',
    )
    await waitFor(
      () =>
        expect(within(row1).getByTestId('navigator-pages')).toHaveTextContent(
          '1–1',
        ),
      { timeout: 10_000 },
    )
    expect(
      within(row1).queryByTestId('navigator-locked'),
    ).not.toBeInTheDocument()

    const row2 = screen.getByTestId('navigator-row-scene-2')
    expect(within(row2).getByTestId('navigator-heading')).toHaveTextContent(
      'EXT. PARK - DAY',
    )
    await waitFor(
      () =>
        expect(within(row2).getByTestId('navigator-pages')).toHaveTextContent(
          '1–1',
        ),
      { timeout: 10_000 },
    )

    const row3 = screen.getByTestId('navigator-row-scene-3')
    await waitFor(
      () =>
        expect(within(row3).getByTestId('navigator-pages')).toHaveTextContent(
          '1–1',
        ),
      { timeout: 10_000 },
    )
    expect(within(row3).getByTestId('navigator-locked')).toHaveTextContent(
      'Locked',
    )
  })

  it('sorts the scene list by heading when the column header is toggled', async () => {
    const user = userEvent.setup()
    await renderNavigator()

    expect(
      await screen.findByTestId(
        'navigator-heading-cell-0',
        {},
        { timeout: 10_000 },
      ),
    ).toHaveTextContent('INT. POLICE STATION - NIGHT')

    await user.click(screen.getByTestId('navigator-sort-heading'))
    expect(screen.getByTestId('navigator-heading-cell-0')).toHaveTextContent(
      'EXT. PARK - DAY',
    )

    await user.click(screen.getByTestId('navigator-sort-heading'))
    expect(screen.getByTestId('navigator-heading-cell-0')).toHaveTextContent(
      'INT. POLICE STATION - NIGHT',
    )
  })

  it('filters the scene list by free text', async () => {
    const user = userEvent.setup()
    await renderNavigator()

    await user.type(screen.getByTestId('navigator-filter'), 'park')

    expect(screen.getByTestId('navigator-row-scene-2')).toBeInTheDocument()
    expect(
      screen.queryByTestId('navigator-row-scene-1'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('navigator-row-scene-3'),
    ).not.toBeInTheDocument()
  })

  it('opens a scene in the writer and marks it active', async () => {
    const user = userEvent.setup()
    const { router } = await renderNavigator()

    await screen.findByTestId('navigator-row-scene-2', {}, { timeout: 10_000 })
    await user.click(screen.getByTestId('navigator-open-scene-2'))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/projects/project-1/screenplays/screenplay-1/writer',
      ),
    )
    expect(useWriterStore.getState().activeSceneId).toBe('scene-2')
  })
})
