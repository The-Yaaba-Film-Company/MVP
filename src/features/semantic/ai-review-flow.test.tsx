import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

/** Open the AI sheet and wait for the suggestion panel contents. */
async function openAiPanel() {
  await userEvent.click(screen.getByTestId('ai-integrations-trigger'))
  await screen.findByTestId('ai-integrations-panel', {}, { timeout: 10_000 })
}

function panel() {
  return within(screen.getByTestId('ai-integrations-panel'))
}

/**
 * Seed a pending suggestion for scene-1's n1 action block. The AI panel and the
 * read-only decoration hooks both read `/ai-suggestions`, so the dashed overlay
 * renders from the same cache.
 */
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

describe('AI review from the AI tab (SPEC §26, §5.2)', () => {
  it('analyzes the active scene and lists the suggestions the API returned', async () => {
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
    await openAiPanel()

    fireEvent.click(await screen.findByTestId('ai-run-analysis'))

    const row = await panel().findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )
    expect(analyzed).toBe(true)
    expect(csrf).toBe('flow-csrf')
    expect(row).toHaveTextContent('PISTOL')
    // The returned suggestions render as dashed overlays, never scene content.
    await waitFor(() =>
      expect(
        editor.querySelector(
          '.semantic-suggestion[data-span-id="suggestion-1"]',
        ),
      ).not.toBeNull(),
    )
  }, 15_000)

  it('uses a suggestion from the AI tab: dashed overlay becomes a solid annotation', async () => {
    let used = false
    let useCsrf: string | null = null
    server.use(
      http.post(
        '/api/ai-suggestions/suggestion-1/accept',
        async ({ request }) => {
          used = true
          useCsrf = request.headers.get('x-csrf-token')
          return HttpResponse.json({ ...suggestion, status: 'accepted' })
        },
      ),
      http.get('/api/scenes/scene-1/ai-suggestions', () =>
        HttpResponse.json({
          items: used ? [{ ...suggestion, status: 'accepted' }] : [suggestion],
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
    await openAiPanel()

    await panel().findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )
    await waitFor(() =>
      expect(editor.querySelector('.semantic-suggestion')).not.toBeNull(),
    )

    fireEvent.click(screen.getByTestId('suggestion-accept-suggestion-1'))

    await waitFor(() => expect(used).toBe(true))
    expect(useCsrf).toBe('flow-csrf')
    await waitFor(
      () =>
        expect(
          panel().queryByTestId('suggestion-suggestion-1'),
        ).not.toBeInTheDocument(),
      { timeout: 10_000 },
    )
    // The accepted suggestion is now a persisted annotation overlay.
    await waitFor(
      () =>
        expect(
          editor.querySelector(
            '.semantic-annotation[data-span-id="annotation-ai"]',
          ),
        ).not.toBeNull(),
      { timeout: 10_000 },
    )
    expect(
      editor.querySelector('.semantic-suggestion[data-span-id="suggestion-1"]'),
    ).toBeNull()
  }, 15_000)

  it('removes a suggestion from the AI tab: no annotation is created and the overlay clears', async () => {
    let removed = false
    let removeCsrf: string | null = null
    server.use(
      http.post(
        '/api/ai-suggestions/suggestion-1/reject',
        async ({ request }) => {
          removed = true
          removeCsrf = request.headers.get('x-csrf-token')
          return HttpResponse.json({ ...suggestion, status: 'rejected' })
        },
      ),
      http.get('/api/scenes/scene-1/ai-suggestions', () =>
        HttpResponse.json({
          items: removed
            ? [{ ...suggestion, status: 'rejected' }]
            : [suggestion],
        }),
      ),
      http.get('/api/scenes/scene-1/annotations', () =>
        HttpResponse.json({ items: [buildAnnotation({ id: 'annotation-1' })] }),
      ),
    )
    const { editor } = await renderWriter()
    await openAiPanel()

    await panel().findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )
    await waitFor(() =>
      expect(editor.querySelector('.semantic-suggestion')).not.toBeNull(),
    )

    fireEvent.click(screen.getByTestId('suggestion-reject-suggestion-1'))

    await waitFor(() => expect(removed).toBe(true))
    expect(removeCsrf).toBe('flow-csrf')
    await waitFor(
      () =>
        expect(
          panel().queryByTestId('suggestion-suggestion-1'),
        ).not.toBeInTheDocument(),
      { timeout: 10_000 },
    )
    // Removes never write to the annotation or entity graph.
    expect(
      editor.querySelector(
        '.semantic-annotation[data-span-id="annotation-ai"]',
      ),
    ).toBeNull()
    await waitFor(() =>
      expect(
        editor.querySelector(
          '.semantic-suggestion[data-span-id="suggestion-1"]',
        ),
      ).toBeNull(),
    )
  }, 15_000)

  it('rolls back the use when the server rejects it: suggestion stays pending, no annotation', async () => {
    seedPendingSuggestion()
    server.use(
      http.post('/api/ai-suggestions/suggestion-1/accept', () =>
        HttpResponse.json({ detail: 'conflict' }, { status: 409 }),
      ),
      http.get('/api/scenes/scene-1/annotations', () =>
        HttpResponse.json({ items: [buildAnnotation({ id: 'annotation-1' })] }),
      ),
    )
    const { editor } = await renderWriter()
    await openAiPanel()

    await panel().findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )

    fireEvent.click(screen.getByTestId('suggestion-accept-suggestion-1'))

    // Failed use rolls the suggestion back to pending and no solid
    // annotation for it exists.
    await waitFor(
      () =>
        expect(
          panel().getByTestId('suggestion-suggestion-1'),
        ).toBeInTheDocument(),
      { timeout: 10_000 },
    )
    expect(
      editor.querySelector('.semantic-suggestion[data-span-id="suggestion-1"]'),
    ).not.toBeNull()
    expect(
      editor.querySelector('.semantic-annotation[data-span-id="ann-"]'),
    ).toBeNull()
  }, 15_000)

  it('rolls back the removal when the server rejects it: suggestion stays pending', async () => {
    seedPendingSuggestion()
    server.use(
      http.post('/api/ai-suggestions/suggestion-1/reject', () =>
        HttpResponse.json({ detail: 'conflict' }, { status: 409 }),
      ),
    )
    const { editor } = await renderWriter()
    await openAiPanel()

    await panel().findByTestId(
      'suggestion-suggestion-1',
      {},
      { timeout: 10_000 },
    )

    fireEvent.click(screen.getByTestId('suggestion-reject-suggestion-1'))

    // Failed remove rolls the suggestion back to pending.
    await waitFor(
      () =>
        expect(
          panel().getByTestId('suggestion-suggestion-1'),
        ).toBeInTheDocument(),
      { timeout: 10_000 },
    )
    expect(editor.querySelector('.semantic-suggestion')).not.toBeNull()
  }, 15_000)
})

it('buildSuggestion offsets match the annotated span so overlays align', () => {
  expect(suggestion.start_offset).toBe(0)
  expect(suggestion.end_offset).toBe(4)
})
