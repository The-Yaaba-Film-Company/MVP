import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { buildScene } from '#/api/mocks/fixtures'
import { renderApp } from '#/test/renderApp'
import { useWriterStore } from '../writer/store'
import { setPaginationPublishDebounceMs } from '../pagination/usePaginationReport'

const SCENE = '/projects/project-1/screenplays/screenplay-1/scene'

function actScene(
  id: string,
  order: number,
  number: string,
  intExt: 'INT' | 'EXT',
  location: string,
  timeOfDay: string,
  text: string,
) {
  return buildScene({
    id,
    order_key: order,
    number,
    int_ext: intExt,
    time_of_day: timeOfDay,
    content: {
      type: 'doc',
      content: [
        { type: 'sceneHeading', attrs: { intExt, location, timeOfDay } },
        {
          type: 'action',
          attrs: { id: `${id}-n` },
          content: [{ type: 'text', text }],
        },
      ],
    },
  })
}

async function renderSceneView() {
  server.use(
    http.get('/api/screenplays/screenplay-1/scenes', () =>
      HttpResponse.json({
        items: [
          actScene(
            'scene-1',
            1,
            '1',
            'INT',
            'POLICE STATION',
            'NIGHT',
            'John enters the room.',
          ),
          actScene(
            'scene-2',
            2,
            '2',
            'EXT',
            'PARK',
            'DAY',
            'Caroline runs across the grass.',
          ),
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
  const options = await renderApp({ initialEntries: [SCENE] })
  await screen.findByTestId('scene-view', {}, { timeout: 10_000 })
  return options
}

beforeEach(() => {
  useWriterStore.setState({ activeSceneId: null })
  setPaginationPublishDebounceMs(0)
})

describe('scene view', () => {
  it('shows the active scene read-only with heading, body, and page range', async () => {
    await renderSceneView()

    expect(screen.getByTestId('scene-view')).toBeInTheDocument()
    expect(
      await screen.findByTestId('scene-heading', {}, { timeout: 10_000 }),
    ).toHaveTextContent('INT. POLICE STATION - NIGHT')
    expect(screen.getByTestId('scene-editor').textContent).toContain(
      'John enters the room.',
    )
    expect(screen.getByTestId('scene-editor')).toHaveAttribute(
      'contenteditable',
      'false',
    )
    expect(screen.getByTestId('scene-number')).toHaveTextContent('1')
    // Both short scenes are measured into one page by the client engine.
    await waitFor(
      () => {
        expect(screen.getByTestId('scene-pages')).toHaveTextContent('1–1')
        expect(screen.getByTestId('scene-metadata')).toHaveTextContent(
          'Pages 1 · ~1 min',
        )
      },
      { timeout: 10_000 },
    )
  })

  it('pagers through scenes and records the active scene', async () => {
    const user = userEvent.setup()
    await renderSceneView()

    await user.click(screen.getByTestId('scene-next'))
    expect(screen.getByTestId('scene-heading')).toHaveTextContent(
      'EXT. PARK - DAY',
    )
    expect(screen.getByTestId('scene-editor').textContent).toContain(
      'Caroline runs',
    )
    expect(screen.getByTestId('scene-number')).toHaveTextContent('2')
    expect(useWriterStore.getState().activeSceneId).toBe('scene-2')
    await waitFor(
      () => expect(screen.getByTestId('scene-pages')).toHaveTextContent('1–1'),
      { timeout: 10_000 },
    )

    await user.click(screen.getByTestId('scene-prev'))
    await waitFor(() =>
      expect(screen.getByTestId('scene-heading')).toHaveTextContent(
        'INT. POLICE STATION - NIGHT',
      ),
    )
    expect(useWriterStore.getState().activeSceneId).toBe('scene-1')
  })
})
