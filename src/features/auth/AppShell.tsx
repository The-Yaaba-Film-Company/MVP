import type { ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { api } from '#/api/client'
import type { User } from '#/api/types'
import { authKeys } from '#/features/auth/queries'

export function AppShell({
  user,
  children,
}: {
  user: User
  children: ReactNode
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: async () => {
      queryClient.setQueryData(authKeys.me, null)
      queryClient.removeQueries({ queryKey: authKeys.me })
      await navigate({ to: '/login', replace: true })
    },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header
        data-testid="app-shell-header"
        className="flex items-center justify-between border-b border-paper-200 bg-paper-100 px-6 py-3"
      >
        <Link
          to="/"
          className="font-serif text-lg text-ink-900 hover:text-clay-700"
        >
          The Story Room
        </Link>
        <div className="flex items-center gap-3">
          <span data-testid="app-shell-user" className="text-sm text-ink-700">
            {user.display_name}
          </span>
          <button
            type="button"
            data-testid="logout-button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="rounded-md border border-paper-300 bg-white px-3 py-1.5 text-sm text-ink-700 hover:border-clay-500 hover:text-clay-700 disabled:opacity-50"
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="flex-1 bg-paper-50">{children}</main>
    </div>
  )
}
