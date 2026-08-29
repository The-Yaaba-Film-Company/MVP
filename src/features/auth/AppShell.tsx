import type { ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
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
        className="flex items-center justify-between border-b border-neutral-200 px-4 py-3"
      >
        <span className="font-semibold">Screenplay Editor</span>
        <div className="flex items-center gap-3">
          <span
            data-testid="app-shell-user"
            className="text-sm text-neutral-600"
          >
            {user.display_name}
          </span>
          <button
            type="button"
            data-testid="logout-button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="rounded border border-neutral-300 px-3 py-1 text-sm"
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
