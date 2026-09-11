import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { buildScene } from '#/api/mocks/fixtures'
import { renderApp } from '#/test/renderApp'
import { sceneKeys } from './queries'

const WRITER = '/projects/project-1/screenplays/screenplay-1/writer'

async function renderWriter() {
  const options = await renderApp({ initialEntries: [WRITER] })
  const editor = await screen.findByTestId(
    'scene-editor',
    {},
    { timeout: 10_000 },
  )
  return { ...options, editor }
}

function pressKey(
  editor: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
) {
  act(() => {
    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    )
  })
}

describe('writer view — scene list', () => {
  it('renders the scene navigator and the active scene in the editor', async () => {
    const { editor } = await renderWriter()

    const navigator = screen.getByTestId('scene-navigator')
    expect(within(navigator).getAllByTestId(/^scene-item-/)).toHaveLength(2)
    expect(within(navigator).getAllByText(/POLICE STATION/)).toHaveLength(2)
    expect(
      within(screen.getByTestId('scene-item-scene-1')).getByText(
        'INT. POLICE STATION - NIGHT',
      ),
    ).toBeInTheDocument()
    expect(editor).toHaveTextContent('John enters the room.')
  })

  it('switches the active scene through the sidebar', async () => {
    const { editor } = await renderWriter()

    await userEvent.click(screen.getByTestId('scene-item-scene-2'))
    await waitFor(() =>
      expect(screen.getByTestId('scene-editor')).toHaveTextContent(
        'John enters the room.',
      ),
    )

    await userEvent.click(screen.getByTestId('scene-item-scene-1'))
    await waitFor(() =>
      expect(screen.getByTestId('scene-editor')).toHaveTextContent(
        'John enters the room.',
      ),
    )
    void editor
  })
})

describe('writer view — locked scenes', () => {
  it('renders a locked scene as read-only', async () => {
    server.use(
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json({
          items: [
            buildScene({ id: 'scene-1', locked: true }),
            buildScene({ id: 'scene-2', locked: false }),
          ],
        }),
      ),
    )
    await renderWriter()

    expect(screen.getByTestId('scene-editor')).toHaveAttribute(
      'contenteditable',
      'false',
    )
  }, 10_000)
})

describe('writer view — slash command (SPEC §24)', () => {
  it('opens on "/", filters as you type, and converts the block on Enter', async () => {
    const { editor } = await renderWriter()

    // Place the caret inside the editable action block. Target the block via
    // data-node-type rather than getByText: the semantic annotation overlay
    // wraps "John" in a span (splitting the text node), so the unsplit literal
    // is not a direct text-node child and getByText races with its async load.
    await userEvent.click(
      editor.querySelector('[data-node-type="action"]') as HTMLElement,
    )

    pressKey(editor, '/', { ctrlKey: true })
    await screen.findByTestId('slash-menu')
    const all = screen
      .getByTestId('slash-menu')
      .querySelectorAll('[role="option"]')
    expect(all).toHaveLength(8)

    pressKey(editor, 'c')
    pressKey(editor, 'h')
    await waitFor(() => {
      const filtered = screen
        .getByTestId('slash-menu')
        .querySelectorAll('[role="option"]')
      expect(filtered).toHaveLength(1)
      expect(filtered[0]).toHaveTextContent('Character')
    })

    pressKey(editor, 'Enter')
    await waitFor(() =>
      expect(screen.queryByTestId('slash-menu')).not.toBeInTheDocument(),
    )
    const character = editor.querySelector('[data-node-type="character"]')
    expect(character).toHaveTextContent('JOHN ENTERS THE ROOM.')
    expect(
      (character as HTMLElement).closest('[data-node-type="character"]'),
    ).not.toBeNull()
  }, 10_000)

  it('closes on Escape and drops an empty menu on Backspace', async () => {
    const { editor } = await renderWriter()
    await userEvent.click(
      editor.querySelector('[data-node-type="action"]') as HTMLElement,
    )

    pressKey(editor, '/', { ctrlKey: true })
    await screen.findByTestId('slash-menu')

    pressKey(editor, 'Backspace')
    await waitFor(() =>
      expect(screen.queryByTestId('slash-menu')).not.toBeInTheDocument(),
    )

    pressKey(editor, '/', { ctrlKey: true })
    await screen.findByTestId('slash-menu')
    pressKey(editor, 'Escape')
    await waitFor(() =>
      expect(screen.queryByTestId('slash-menu')).not.toBeInTheDocument(),
    )
  }, 10_000)
})

describe('writer view — scene reorder (SPEC §31)', () => {
  it('moves a scene down, swaps order_keys, and re-sorts the navigator', async () => {
    const original = {
      items: [
        buildScene({ id: 'scene-1', order_key: 1, number: '1' }),
        buildScene({ id: 'scene-2', order_key: 2, number: '2' }),
      ],
    }
    const swapped = {
      items: [
        buildScene({ id: 'scene-2', order_key: 1, number: '1' }),
        buildScene({ id: 'scene-1', order_key: 2, number: '2' }),
      ],
    }
    let reordered = false
    let postedBody: unknown = null
    server.use(
      http.post('/api/scenes/scene-1/reorder', async ({ request }) => {
        postedBody = await request.json()
        reordered = true
        return HttpResponse.json(swapped)
      }),
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json(reordered ? swapped : original),
      ),
      // Keep any autosave PATCH from clobbering the swapped order_key.
      http.patch('/api/scenes/:id', ({ params }) => {
        const list = reordered ? swapped.items : original.items
        return HttpResponse.json(
          list.find((s) => s.id === params.id) ?? list[0],
        )
      }),
    )
    const { queryClient } = await renderWriter()

    expect(screen.getByTestId('scene-move-up-scene-1')).toBeDisabled()
    expect(screen.getByTestId('scene-move-down-scene-2')).toBeDisabled()

    await userEvent.click(screen.getByTestId('scene-move-down-scene-1'))

    await waitFor(() => {
      const items = within(
        screen.getByTestId('scene-navigator'),
      ).getAllByTestId(/^scene-item-/)
      expect(items[0]).toHaveAttribute('data-testid', 'scene-item-scene-2')
      expect(items[1]).toHaveAttribute('data-testid', 'scene-item-scene-1')
    })
    expect(postedBody).toEqual({ order_key: 2 })

    const items = (
      queryClient.getQueryState(sceneKeys.list('screenplay-1'))?.data as {
        items: { id: string; order_key: number }[]
      }
    ).items
    expect(items.map((s) => s.id)).toEqual(['scene-2', 'scene-1'])

    // The moved scene keeps its id — only order_key changed (SPEC §31).
    expect(items[1]).toMatchObject({ id: 'scene-1', order_key: 2 })
  }, 10_000)
})

describe('writer view — scene creation (SPEC §29)', () => {
  it('creates a new scene, makes it active, and shows it in the navigator', async () => {
    const newScene = buildScene({
      id: 'scene-9',
      order_key: 3,
      number: '3',
      content: {
        type: 'doc',
        content: [
          {
            type: 'sceneHeading',
            attrs: { intExt: 'INT', location: '', timeOfDay: '' },
          },
        ],
      },
      content_hash: 'hash-9',
    })
    let postedBody: unknown = null
    server.use(
      http.post('/api/screenplays/screenplay-1/scenes', async ({ request }) => {
        postedBody = await request.json()
        return HttpResponse.json(newScene)
      }),
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json({
          items: [
            buildScene({ id: 'scene-1' }),
            buildScene({ id: 'scene-2' }),
            newScene,
          ],
        }),
      ),
    )
    const { queryClient } = await renderWriter()

    await userEvent.click(screen.getByTestId('new-scene-button'))

    await waitFor(() =>
      expect(screen.getByTestId('scene-item-scene-9')).toBeInTheDocument(),
    )
    expect(postedBody).toEqual({
      content: {
        type: 'doc',
        content: [
          {
            type: 'sceneHeading',
            attrs: { intExt: 'INT', location: '', timeOfDay: '' },
          },
        ],
      },
    })
    expect(
      (
        queryClient.getQueryState(['screenplays', 'screenplay-1', 'scenes'])
          ?.data as { items: unknown[] }
      ).items,
    ).toHaveLength(3)
  }, 10_000)

  it('creates a scene from Ctrl/Cmd + Shift + N in the editor (SPEC §29)', async () => {
    const newScene = buildScene({
      id: 'scene-9',
      order_key: 3,
      number: '3',
      content: {
        type: 'doc',
        content: [
          {
            type: 'sceneHeading',
            attrs: { intExt: 'INT', location: '', timeOfDay: '' },
          },
        ],
      },
      content_hash: 'hash-9',
    })
    server.use(
      http.post('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json(newScene),
      ),
      http.get('/api/screenplays/screenplay-1/scenes', () =>
        HttpResponse.json({
          items: [
            buildScene({ id: 'scene-1' }),
            buildScene({ id: 'scene-2' }),
            newScene,
          ],
        }),
      ),
    )
    const { editor } = await renderWriter()

    pressKey(editor, 'n', { ctrlKey: true, shiftKey: true })

    await waitFor(() =>
      expect(screen.getByTestId('scene-item-scene-9')).toBeInTheDocument(),
    )
  }, 10_000)
})
