import { useEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '#/api/mocks/server'
import { buildScene } from '#/api/mocks/fixtures'
import { createTestQueryClient } from '#/test/renderApp'
import {
  AUTOSAVE_DEBOUNCE_MS,
  setAutosaveDebounceMs,
  useSceneAutosave,
} from './useSceneAutosave'
import { sceneKeys } from './queries'
import type { Scene, TiptapNode } from '#/api/types'

/**
 * Fake Tiptap Editor covering the surface `useSceneAutosave` touches while
 * staying decoupled from ProseMirror's jsdom issues: `getJSON()` returns the
 * doc a test drives, `commands.setContent` replaces it.
 */
function makeEditor(docRef: { current: TiptapNode }) {
  return {
    getJSON: () => docRef.current,
    commands: {
      setContent: (d: unknown) => {
        docRef.current = d as TiptapNode
      },
    },
  }
}

function baseDoc(text: string): TiptapNode {
  return {
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
        attrs: { id: 'n1' },
        content: [{ type: 'text', text }],
      },
    ],
  }
}

function editDoc(doc: TiptapNode, append: string): TiptapNode {
  const action = doc.content![1]
  const text = action.content![0]
  return {
    ...doc,
    content: [
      doc.content![0],
      { ...action, content: [{ ...text, text: `${text.text}${append}` }] },
    ],
  }
}

function AutosaveHarness({ scene }: { scene: Scene }) {
  const save = useSceneAutosave(scene, 'screenplay-1')
  const docRef = useRef<TiptapNode>(scene.content)
  const editorRef = useRef(makeEditor(docRef))

  useEffect(() => {
    save.editorRef.current = editorRef.current as never
    return () => {
      save.editorRef.current = null
    }
  }, [save])

  return (
    <div>
      <span data-testid="status">
        {save.conflict
          ? 'conflict'
          : save.error
            ? 'error'
            : save.saving
              ? 'saving'
              : 'idle'}
      </span>
      <span data-testid="editor-doc">{JSON.stringify(docRef.current)}</span>
      <button
        data-testid="edit-and-schedule"
        onClick={() => {
          docRef.current = editDoc(docRef.current, 'X')
          save.schedule()
        }}
      >
        edit
      </button>
      <button data-testid="flush" onClick={save.flush}>
        flush
      </button>
    </div>
  )
}

async function renderHarness(ourScene?: Scene) {
  const queryClient = createTestQueryClient()
  const scene =
    ourScene ??
    buildScene({ id: 'scene-1', content: baseDoc('John enters the room.') })
  queryClient.setQueryData<{ items: Scene[] }>(sceneKeys.list('screenplay-1'), {
    items: [scene],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AutosaveHarness scene={scene} />
    </QueryClientProvider>,
  )
  return { queryClient }
}

const CSRF = 'writer-csrf'

interface PatchLog {
  patches: number
  seen: string | null
  body: { content: TiptapNode } | null
}

function trackPatch(): PatchLog {
  const log: PatchLog = { patches: 0, seen: null, body: null }
  server.use(
    http.patch('/api/scenes/scene-1', async ({ request }) => {
      log.patches += 1
      log.seen = request.headers.get('x-csrf-token')
      log.body = (await request.json()) as { content: TiptapNode }
      return HttpResponse.json(
        buildScene({
          id: 'scene-1',
          content: log.body.content,
          content_hash: 'hash-2',
        }),
      )
    }),
  )
  return log
}

describe('useSceneAutosave', () => {
  beforeEach(() => {
    document.cookie = `csrf_token=${CSRF}; path=/`
    setAutosaveDebounceMs(50)
  })
  afterEach(() => {
    setAutosaveDebounceMs(AUTOSAVE_DEBOUNCE_MS)
    document.cookie = 'csrf_token=; path=/; max-age=0'
  })

  it('PATCHes once per debounce window with X-CSRF-Token and updates the cache', async () => {
    const user = userEvent.setup()
    const { queryClient } = await renderHarness()
    const log = trackPatch()

    await user.click(screen.getByTestId('edit-and-schedule'))
    await user.click(screen.getByTestId('edit-and-schedule'))
    await user.click(screen.getByTestId('edit-and-schedule'))

    await waitFor(() => expect(log.patches).toBe(1), { timeout: 2000 })
    expect(log.seen).toBe(CSRF)
    expect(JSON.stringify(log.body?.content)).toContain(
      'John enters the room.XXX',
    )
    await waitFor(() =>
      expect(
        (
          queryClient.getQueryState(sceneKeys.list('screenplay-1'))?.data as {
            items: Scene[]
          }
        ).items[0].content_hash,
      ).toBe('hash-2'),
    )
  }, 10_000)

  it('skips a PATCH while one is in flight, then drains the pending edit', async () => {
    const user = userEvent.setup()
    await renderHarness()
    const resolvePatch: Array<() => void> = []
    let deferred = true
    const log: PatchLog = { patches: 0, seen: null, body: null }
    server.use(
      http.patch('/api/scenes/scene-1', async ({ request }) => {
        log.patches += 1
        log.seen = request.headers.get('x-csrf-token') ?? ''
        const body = (await request.json()) as { content: TiptapNode }
        log.body = body
        if (deferred) {
          deferred = false
          await new Promise<void>((r) => {
            resolvePatch.push(r)
          })
        }
        return HttpResponse.json(
          buildScene({
            id: 'scene-1',
            content: body.content,
            content_hash: 'hash-2',
          }),
        )
      }),
    )

    await user.click(screen.getByTestId('edit-and-schedule'))
    await waitFor(() => expect(log.patches).toBe(1), { timeout: 2000 })

    await user.click(screen.getByTestId('edit-and-schedule'))
    await new Promise((r) => setTimeout(r, 150))
    expect(log.patches).toBe(1)

    resolvePatch[0]?.()
    await waitFor(() => expect(log.patches).toBe(2), { timeout: 2000 })
    await waitFor(
      () => expect(screen.getByTestId('status')).toHaveTextContent('idle'),
      { timeout: 2000 },
    )
  }, 10_000)

  it('reverts to the last saved content when the PATCH fails with 5xx', async () => {
    const user = userEvent.setup()
    await renderHarness()
    server.use(
      http.patch('/api/scenes/scene-1', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )

    await user.click(screen.getByTestId('edit-and-schedule'))

    await waitFor(
      () => expect(screen.getByTestId('status')).toHaveTextContent('error'),
      { timeout: 2000 },
    )
    const editorDoc = JSON.parse(screen.getByTestId('editor-doc').textContent)
    expect(JSON.stringify(editorDoc)).toContain('John enters the room.')
    expect(JSON.stringify(editorDoc)).not.toContain('X')
  }, 10_000)

  it('discards local edits and reloads the server scene on a 409 conflict', async () => {
    const user = userEvent.setup()
    const { queryClient } = await renderHarness()
    const serverVersion = buildScene({
      id: 'scene-1',
      content: baseDoc('The server wins.'),
      content_hash: 'server-hash',
    })
    server.use(
      http.patch('/api/scenes/scene-1', () =>
        HttpResponse.json({ detail: 'conflict' }, { status: 409 }),
      ),
      http.get('/api/scenes/scene-1', () => HttpResponse.json(serverVersion)),
    )

    await user.click(screen.getByTestId('edit-and-schedule'))

    await waitFor(
      () => expect(screen.getByTestId('status')).toHaveTextContent('conflict'),
      { timeout: 2000 },
    )
    const editorDoc = JSON.parse(screen.getByTestId('editor-doc').textContent)
    expect(JSON.stringify(editorDoc)).toContain('The server wins.')
    expect(JSON.stringify(editorDoc)).not.toContain('X')
    await waitFor(() => {
      const list = queryClient.getQueryState(sceneKeys.list('screenplay-1'))
        ?.data as { items: Scene[] }
      expect(list.items.find((s) => s.id === 'scene-1')?.content_hash).toBe(
        'server-hash',
      )
    })
  }, 10_000)
})
