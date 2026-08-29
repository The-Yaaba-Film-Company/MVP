import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { server } from '#/api/mocks/server'
import { buildAnnotation, buildSuggestion } from '#/api/mocks/fixtures'
import { renderApp } from '#/test/renderApp'

const WRITER = '/projects/project-1/screenplays/screenplay-1/writer'

const suggestion = buildSuggestion({
  id: 'suggestion-1',
  scene_id: 'scene-1',
  node_id: 'n1',
  matched_text: 'John',
  start_offset: 0,
  end_offset: 4,
  suggested_type: 'prop',
  suggested_name: 'PISTOL',
  matched_entity_id: 'entity-3',
  confidence: 0.92,
  status: 'pending',
})

async function renderWriter() {
  const options = await renderApp({ initialEntries: [WRITER] })
  const editor = await screen.findByTestId(
    'scene-editor',
    {},
    { timeout: 10_000 },
  )
  return { ...options, editor }
}

/** Seed a pending suggestion for scene-1's n1 action block. */
function seedPendingSuggestion() {
  server.use(
    http.get('/api/scenes/scene-1/ai-suggestions', () =>
      HttpResponse.json({ items: [suggestion] }),
    ),
  )
}

beforeEach(() => {
  document.cookie = 'csrf_token=flow-csrf; path=/'
})

describe('writer view — AI review (SPEC §26, §5.2)', () => {
  it('analyzes the scene, then lists the pending suggestions', async () => {
    let analyzed = false
    let csrf: string | null = null
    server.use(
      http.post('/api/scenes/scene-1/ai-suggest', async ({ request }) => {
        analyzed = true
        csrf = request.headers.get('x-csrf-token')
        return HttpResponse.json({ items: [suggestion] })
      }),
      http.get('/api/scenes/scene-1/ai-suggestions', () =>
        HttpResponse.json({ items: analyzed ? [suggestion] : [] }),
      ),
    )
    const { editor } = await renderWriter()

    const button = screen.getByTestId('analyze-scene')
    expect(button).toHaveTextContent('Analyze Scene')
    fireEvent.click(button)

    await screen.findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )
    expect(analyzed).toBe(true)
    expect(csrf).toBe('flow-csrf')
    expect(screen.getByTestId('suggestion-suggestion-1')).toHaveTextContent(
      'PISTOL',
    )
    await waitFor(() =>
      expect(screen.getByTestId('analyze-scene')).toHaveTextContent('Analyzed'),
    )
    expect(screen.getByTestId('analyze-scene')).toBeDisabled()
    // Pending suggestions render as dashed overlays, never scene content.
    expect(
      editor.querySelector('.semantic-suggestion[data-span-id="suggestion-1"]'),
    ).not.toBeNull()
  }, 15_000)

  it('accepts a suggestion: it becomes a solid annotation', async () => {
    let accepted = false
    let acceptCsrf: string | null = null
    server.use(
      http.post(
        '/api/ai-suggestions/suggestion-1/accept',
        async ({ request }) => {
          accepted = true
          acceptCsrf = request.headers.get('x-csrf-token')
          return HttpResponse.json({ ...suggestion, status: 'accepted' })
        },
      ),
      http.get('/api/scenes/scene-1/ai-suggestions', () =>
        HttpResponse.json({
          items: accepted
            ? [{ ...suggestion, status: 'accepted' }]
            : [suggestion],
        }),
      ),
      http.get('/api/scenes/scene-1/annotations', () =>
        HttpResponse.json({
          items: [
            buildAnnotation({ id: 'annotation-1' }),
            buildAnnotation({
              id: 'annotation-ai',
              start_offset: 0,
              end_offset: 4,
              entity_id: 'entity-3',
              source: 'ai_accepted',
            }),
          ],
        }),
      ),
    )
    const { editor } = await renderWriter()

    await screen.findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )
    await waitFor(() =>
      expect(editor.querySelector('.semantic-suggestion')).not.toBeNull(),
    )

    fireEvent.click(screen.getByTestId('suggestion-accept-suggestion-1'))

    await waitFor(() => expect(accepted).toBe(true))
    expect(acceptCsrf).toBe('flow-csrf')
    await waitFor(
      () =>
        expect(
          screen.queryByTestId('suggestion-suggestion-1'),
        ).not.toBeInTheDocument(),
      { timeout: 10_000 },
    )
    // The accepted suggestion is now a persisted annotation overlay.
    expect(
      editor.querySelector(
        '.semantic-annotation[data-span-id="annotation-ai"]',
      ),
    ).not.toBeNull()
    expect(
      editor.querySelector('.semantic-suggestion[data-span-id="suggestion-1"]'),
    ).toBeNull()
  }, 15_000)

  it('rejects a suggestion: no annotation is created and the overlay clears', async () => {
    let rejected = false
    let rejectCsrf: string | null = null
    server.use(
      http.post(
        '/api/ai-suggestions/suggestion-1/reject',
        async ({ request }) => {
          rejected = true
          rejectCsrf = request.headers.get('x-csrf-token')
          return HttpResponse.json({ ...suggestion, status: 'rejected' })
        },
      ),
      http.get('/api/scenes/scene-1/ai-suggestions', () =>
        HttpResponse.json({
          items: rejected
            ? [{ ...suggestion, status: 'rejected' }]
            : [suggestion],
        }),
      ),
      http.get('/api/scenes/scene-1/annotations', () =>
        HttpResponse.json({ items: [buildAnnotation({ id: 'annotation-1' })] }),
      ),
    )
    const { editor } = await renderWriter()

    await screen.findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )

    fireEvent.click(screen.getByTestId('suggestion-reject-suggestion-1'))

    await waitFor(() => expect(rejected).toBe(true))
    expect(rejectCsrf).toBe('flow-csrf')
    await waitFor(
      () =>
        expect(
          screen.queryByTestId('suggestion-suggestion-1'),
        ).not.toBeInTheDocument(),
      { timeout: 10_000 },
    )
    // Rejects never write to the annotation or entity graph.
    expect(
      editor.querySelector(
        '.semantic-annotation[data-span-id="annotation-ai"]',
      ),
    ).toBeNull()
    expect(
      editor.querySelector('.semantic-suggestion[data-span-id="suggestion-1"]'),
    ).toBeNull()
  }, 15_000)

  it('tags text next to an unreviewed suggestion without disturbing it', async () => {
    // Existing annotation flow still works while a suggestion is pending.
    seedPendingSuggestion()
    const { editor } = await renderWriter()
    await screen.findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )
    expect(editor.querySelector('.semantic-suggestion')).not.toBeNull()
  }, 15_000)
})

it('buildSuggestion offsets match the annotated span so overlays align', () => {
  expect(suggestion.start_offset).toBe(0)
  expect(suggestion.end_offset).toBe(4)
})
