import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { buildProject, buildScreenplay } from '#/api/mocks/fixtures'
import { renderApp } from '#/test/renderApp'

describe('projects page', () => {
  it('renders project cards fetched from the API', async () => {
    await renderApp({ initialEntries: ['/'] })

    expect(await screen.findByTestId('projects-page')).toBeInTheDocument()
    const card = await screen.findByTestId(
      'project-card-project-1',
      {},
      { timeout: 10_000 },
    )
    expect(card).toHaveTextContent('Project: Test')
  }, 10_000)

  it('creates a project via POST with X-CSRF-Token, then shows the new card', async () => {
    document.cookie = 'csrf_token=proj-csrf; path=/'
    let seen: string | null = null
    let posted: unknown = null
    const created = buildProject({ id: 'project-9', title: 'New Film' })
    server.use(
      http.post('/api/projects', async ({ request }) => {
        seen = request.headers.get('x-csrf-token')
        posted = await request.json()
        return HttpResponse.json(created)
      }),
      http.get('/api/projects', () =>
        HttpResponse.json([created, buildProject()]),
      ),
    )
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/'] })

    await user.click(await screen.findByTestId('new-project-button'))
    await user.type(screen.getByTestId('project-title'), 'New Film')
    await user.click(screen.getByTestId('project-create-submit'))

    expect(
      await screen.findByTestId('project-card-project-9'),
    ).toHaveTextContent('New Film')
    expect(seen).toBe('proj-csrf')
    expect(posted).toEqual({ title: 'New Film' })
  })

  it('opens a project to its screenplays page', async () => {
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/'] })

    await user.click(await screen.findByTestId('project-card-project-1'))

    expect(await screen.findByTestId('screenplays-page')).toBeInTheDocument()
    expect(
      screen.getByTestId('screenplay-card-screenplay-1'),
    ).toBeInTheDocument()
  })
})

describe('screenplays page', () => {
  it('lists screenplays filtered to the project', async () => {
    await renderApp({ initialEntries: ['/projects/project-1'] })

    expect(await screen.findByTestId('screenplays-page')).toBeInTheDocument()
    const card = await screen.findByTestId(
      'screenplay-card-screenplay-1',
      {},
      { timeout: 10_000 },
    )
    expect(within(card).getByText('My Feature')).toBeInTheDocument()
  }, 10_000)

  it('creates a screenplay via POST with X-CSRF-Token, then shows the new card', async () => {
    document.cookie = 'csrf_token=scr-csrf; path=/'
    let seen: string | null = null
    let posted: unknown = null
    const created = buildScreenplay({ id: 'screenplay-9', title: 'Pilot' })
    server.use(
      http.post('/api/projects/project-1/screenplays', async ({ request }) => {
        seen = request.headers.get('x-csrf-token')
        posted = await request.json()
        return HttpResponse.json(created)
      }),
      http.get('/api/projects/project-1/screenplays', () =>
        HttpResponse.json([created, buildScreenplay()]),
      ),
    )
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/projects/project-1'] })

    await user.click(await screen.findByTestId('new-screenplay-button'))
    await user.type(screen.getByTestId('screenplay-title'), 'Pilot')
    await user.click(screen.getByTestId('screenplay-create-submit'))

    expect(
      await screen.findByTestId('screenplay-card-screenplay-9'),
    ).toHaveTextContent('Pilot')
    expect(seen).toBe('scr-csrf')
    expect(posted).toEqual({ title: 'Pilot' })
  })
})

describe('screenplay views', () => {
  it('opens the Writer view then switches to Scene, Breakdown and Navigator', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp({
      initialEntries: ['/projects/project-1/screenplays/screenplay-1/writer'],
    })

    expect(await screen.findByTestId('writer-view')).toBeInTheDocument()

    await user.click(screen.getByTestId('view-tab-scene'))
    expect(await screen.findByTestId('scene-view')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(
      '/projects/project-1/screenplays/screenplay-1/scene',
    )

    await user.click(screen.getByTestId('view-tab-breakdown'))
    expect(await screen.findByTestId('breakdown-view')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(
      '/projects/project-1/screenplays/screenplay-1/breakdown',
    )

    await user.click(screen.getByTestId('view-tab-navigator'))
    expect(await screen.findByTestId('navigator-view')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(
      '/projects/project-1/screenplays/screenplay-1/navigator',
    )

    expect(screen.queryByTestId('writer-view')).not.toBeInTheDocument()
  })

  it('redirects the screenplay base URL to the Writer view', async () => {
    const { router } = await renderApp({
      initialEntries: ['/projects/project-1/screenplays/screenplay-1'],
    })

    expect(await screen.findByTestId('writer-view')).toBeInTheDocument()
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/projects/project-1/screenplays/screenplay-1/writer',
      ),
    )
  })
})
