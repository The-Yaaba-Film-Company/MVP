import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { buildEntity } from '#/api/mocks/fixtures'
import { renderApp } from '#/test/renderApp'

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

/** Convert the current action block into a Character via the slash menu. */
async function convertToCharacter(editor: HTMLElement) {
  await waitFor(() =>
    expect(editor.querySelector('[data-node-type="action"]')).not.toBeNull(),
  )
  await userEvent
    .setup()
    .click(editor.querySelector('[data-node-type="action"]') as Element)
  pressKey(editor, '/')
  await screen.findByTestId('slash-menu')
  pressKey(editor, 'c')
  pressKey(editor, 'h')
  pressKey(editor, 'Enter')
  await waitFor(() =>
    expect(editor.querySelector('[data-node-type="character"]')).not.toBeNull(),
  )
}

beforeEach(() => {
  document.cookie = 'csrf_token=flow-csrf; path=/'
})

describe('writer view — character autocomplete (SPEC §25–26)', () => {
  it('opens on a focused Character node and binds an existing entity', async () => {
    server.use(
      http.get('/api/projects/project-1/entities', () =>
        HttpResponse.json([
          buildEntity(
            { id: 'entity-2', canonical_name: 'JOAN', aliases: [] },
            'character',
            'JOAN',
          ),
        ]),
      ),
    )
    const { editor } = await renderWriter()

    await convertToCharacter(editor)

    await screen.findByTestId('character-autocomplete', {}, { timeout: 10_000 })
    fireEvent.mouseDown(await screen.findByTestId('character-option-entity-2'))

    // Binding writes the canonical name back onto the Character node.
    await waitFor(() =>
      expect(
        screen.queryByTestId('character-autocomplete'),
      ).not.toBeInTheDocument(),
    )
    expect(
      editor.querySelector('[data-node-type="character"]'),
    ).toHaveTextContent('JOAN')
  }, 15_000)

  it('creates a new character entity for an unmatched name and binds it', async () => {
    let body: unknown = null
    let csrf: string | null = null
    server.use(
      http.post('/api/projects/project-1/entities', async ({ request }) => {
        body = await request.json()
        csrf = request.headers.get('x-csrf-token')
        return HttpResponse.json(
          buildEntity(
            {
              id: 'entity-char',
              canonical_name: 'CAPT HOLT',
              aliases: [],
            },
            'character',
            'CAPT HOLT',
          ),
          { status: 201 },
        )
      }),
    )
    const { editor } = await renderWriter()

    await convertToCharacter(editor)

    const picker = await screen.findByTestId(
      'character-autocomplete',
      {},
      { timeout: 10_000 },
    )
    // "JOHN ENTERS THE ROOM." matches no seed character, so only the create
    // row is offered.
    expect(
      within(picker).getByText(/No matching characters/),
    ).toBeInTheDocument()
    const create = screen.getByTestId('character-create')
    expect(create).toHaveTextContent('JOHN ENTERS THE ROOM.')
    fireEvent.mouseDown(create)

    await waitFor(() => expect(body).not.toBeNull())
    expect(body).toEqual({
      entity_type: 'character',
      canonical_name: 'JOHN ENTERS THE ROOM.',
    })
    expect(csrf).toBe('flow-csrf')
    await waitFor(() =>
      expect(
        screen.queryByTestId('character-autocomplete'),
      ).not.toBeInTheDocument(),
    )
    // The generated canonical name now drives the Character node's label.
    expect(
      editor.querySelector('[data-node-type="character"]'),
    ).toHaveTextContent('CAPT HOLT')
  }, 15_000)
})
