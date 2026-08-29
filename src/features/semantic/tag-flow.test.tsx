import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { buildAnnotation } from '#/api/mocks/fixtures'
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

/**
 * Select the first `count` chars of the action block using a native DOM
 * Range + PM's selectionchange observer (jsdom cannot emulate mouse-drag
 * selections; ProseMirror syncs real selections on focus).
 */
function selectFirstChars(editor: HTMLElement, count: number): string {
  const action = editor.querySelector('[data-node-type="action"]') as Node
  const walker = document.createTreeWalker(action, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    nodes.push(node as Text)
    node = walker.nextNode()
  }
  if (nodes.length === 0) return 'no text nodes in action block'

  const cumulative: number[] = []
  let total = 0
  for (const text of nodes) {
    total += text.data.length
    cumulative.push(total)
  }
  if (total < count) return `selection ${count} exceeds text length ${total}`

  let prev = 0
  const endIndex = cumulative.findIndex((c) => {
    if (c >= count) return true
    prev = c
    return false
  })
  const range = document.createRange()
  range.setStart(nodes[0], 0)
  range.setEnd(nodes[endIndex], count - prev)
  editor.focus()
  const selection = window.getSelection()
  if (!selection) return 'no window selection'
  selection.removeAllRanges()
  selection.addRange(range)
  document.dispatchEvent(new Event('selectionchange'))
  return `selected ${range.toString()}`
}

async function selectJohn(editor: HTMLElement) {
  editor.focus()
  const info = selectFirstChars(editor, 4)
  expect(info).toBe('selected John')
  // PM's observer processes the DOM selection asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 40))
}

beforeEach(() => {
  document.cookie = 'csrf_token=flow-csrf; path=/'
})

describe('writer view — tagging text (SPEC §27–28)', () => {
  it('tags a selection against an existing entity, with CSRF, leaving the doc text untouched', async () => {
    let body: unknown = null
    let csrf: string | null = null
    server.use(
      http.post('/api/scenes/scene-1/annotations', async ({ request }) => {
        body = await request.json()
        csrf = request.headers.get('x-csrf-token')
        return HttpResponse.json(
          buildAnnotation({
            id: 'annotation-new',
            start_offset: 0,
            end_offset: 4,
            entity_id: 'entity-3',
          }),
        )
      }),
    )
    const { editor } = await renderWriter()

    await selectJohn(editor)
    pressKey(editor, 't', { ctrlKey: true, shiftKey: true })

    await screen.findByTestId('tag-menu')
    fireEvent.mouseDown(screen.getByTestId('tag-item-prop'))

    await screen.findByTestId('entity-picker')
    // seed prop entity PISTOL (entity-3) is the only prop match.
    fireEvent.mouseDown(await screen.findByTestId('entity-option-entity-3'))

    await waitFor(() => expect(body).not.toBeNull())
    expect(body).toEqual({
      node_id: 'n1',
      start_offset: 0,
      end_offset: 4,
      entity_id: 'entity-3',
    })
    expect(csrf).toBe('flow-csrf')

    // Optimistic annotation cache → solid decoration overlay (Text ≠ Entity).
    await waitFor(
      () =>
        expect(
          editor.querySelector(
            '.semantic-annotation[data-span-id="annotation-new"]',
          ),
        ).not.toBeNull(),
      { timeout: 10_000 },
    )
    // The source text itself is never written into the scene document.
    expect(editor.querySelector('[data-node-type="action"]')).toHaveTextContent(
      'John enters the room.',
    )
  }, 15_000)

  it('creates a brand-new entity for the selection, then annotates it', async () => {
    let entityBody: unknown = null
    let entityCsrf: string | null = null
    let annotationBody: unknown = null
    let createdEntityId = ''
    server.use(
      http.post('/api/projects/project-1/entities', async ({ request }) => {
        entityBody = await request.json()
        entityCsrf = request.headers.get('x-csrf-token')
        return HttpResponse.json(
          {
            id: 'entity-gun',
            project_id: 'project-1',
            entity_type: 'prop',
            canonical_name: 'GUN',
            aliases: [],
            attributes: {},
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 },
        )
      }),
      http.post('/api/scenes/scene-1/annotations', async ({ request }) => {
        annotationBody = await request.json()
        const typed = annotationBody as { entity_id?: string }
        createdEntityId = typed.entity_id ?? ''
        return HttpResponse.json(
          buildAnnotation({
            id: 'annotation-gun',
            start_offset: 0,
            end_offset: 4,
            entity_id: 'entity-gun',
          }),
        )
      }),
    )
    const { editor } = await renderWriter()

    await selectJohn(editor)
    pressKey(editor, 't', { ctrlKey: true, shiftKey: true })

    await screen.findByTestId('tag-menu')
    fireEvent.mouseDown(screen.getByTestId('tag-item-prop'))

    const input = await screen.findByTestId('entity-picker-input')
    await userEvent.type(input, 'gun')

    await waitFor(() =>
      expect(screen.getByTestId('entity-create')).toHaveTextContent('GUN'),
    )
    fireEvent.mouseDown(screen.getByTestId('entity-create'))

    await waitFor(() => expect(entityBody).not.toBeNull())
    expect(entityBody).toEqual({
      entity_type: 'prop',
      canonical_name: 'GUN',
    })
    expect(entityCsrf).toBe('flow-csrf')
    await waitFor(() => expect(annotationBody).not.toBeNull())
    expect(createdEntityId).toBe('entity-gun')
    expect(annotationBody).toEqual({
      node_id: 'n1',
      start_offset: 0,
      end_offset: 4,
      entity_id: 'entity-gun',
    })

    await waitFor(
      () =>
        expect(
          editor.querySelector(
            '.semantic-annotation[data-span-id="annotation-gun"]',
          ),
        ).not.toBeNull(),
      { timeout: 10_000 },
    )
    // Text still intact — semantic span is an overlay, never scene content.
    expect(editor.querySelector('[data-node-type="action"]')).toHaveTextContent(
      'John enters the room.',
    )
  }, 15_000)
})
