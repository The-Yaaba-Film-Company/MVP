import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '#/api/mocks/server'
import { renderApp } from '#/test/renderApp'

function useUnauthenticated() {
  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({ detail: 'not signed in' }, { status: 401 }),
    ),
  )
}

describe('route guard', () => {
  it('redirects an unauthenticated visit of / to /login', async () => {
    useUnauthenticated()
    await renderApp({ initialEntries: ['/'] })

    expect(await screen.findByTestId('login-form')).toBeInTheDocument()
    expect(screen.queryByTestId('app-shell-header')).not.toBeInTheDocument()
  })

  it('renders the authenticated shell for a signed-in user', async () => {
    await renderApp({ initialEntries: ['/'] })

    expect(await screen.findByTestId('app-shell-header')).toBeInTheDocument()
    expect(screen.getByTestId('app-shell-user')).toHaveTextContent('Writer')
  })
})

describe('login', () => {
  it('signs in and navigates to the projects page', async () => {
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/login'] })

    await user.type(screen.getByTestId('login-email'), 'writer@example.com')
    await user.type(screen.getByTestId('login-password'), 'secret')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('app-shell-header')).toBeInTheDocument()
    expect(screen.getByTestId('projects-page')).toBeInTheDocument()
  })

  it('sends X-CSRF-Token with the login POST', async () => {
    document.cookie = 'csrf_token=csrf-login-token; path=/'
    let seen: string | null = null
    server.use(
      http.post('/api/auth/login', ({ request }) => {
        seen = request.headers.get('x-csrf-token')
        return HttpResponse.json({
          id: 'user-1',
          email: 'a@b.c',
          display_name: 'Writer',
        })
      }),
    )
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/login'] })

    await user.type(screen.getByTestId('login-email'), 'a@b.c')
    await user.type(screen.getByTestId('login-password'), 'secret')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => expect(seen).toBe('csrf-login-token'))
  })

  it('shows an error and stays on /login when credentials are rejected', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ detail: 'invalid credentials' }, { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/login'] })

    await user.type(screen.getByTestId('login-email'), 'writer@example.com')
    await user.type(screen.getByTestId('login-password'), 'wrong')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Invalid email or password.',
    )
    expect(screen.queryByTestId('app-shell-header')).not.toBeInTheDocument()
  })
})

describe('register', () => {
  it('creates an account and signs the user in', async () => {
    const user = userEvent.setup()
    await renderApp({ initialEntries: ['/register'] })

    await user.type(screen.getByTestId('register-name'), 'New Writer')
    await user.type(screen.getByTestId('register-email'), 'new@example.com')
    await user.type(screen.getByTestId('register-password'), 'secret')
    await user.click(screen.getByTestId('register-submit'))

    expect(await screen.findByTestId('app-shell-header')).toBeInTheDocument()
  })
})

describe('logout', () => {
  it('signs out, clears auth cache, and returns to /login', async () => {
    const user = userEvent.setup()
    const { queryClient } = await renderApp({ initialEntries: ['/'] })

    expect(await screen.findByTestId('app-shell-header')).toBeInTheDocument()
    await user.click(screen.getByTestId('logout-button'))

    expect(await screen.findByTestId('login-form')).toBeInTheDocument()
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined()
  })
})
