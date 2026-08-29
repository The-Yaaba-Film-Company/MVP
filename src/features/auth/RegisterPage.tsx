import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '#/api/client'
import { authKeys } from './queries'

export function RegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.auth.register({ email, password, display_name: displayName }),
    onSuccess: async (user) => {
      queryClient.setQueryData(authKeys.me, user)
      await navigate({ to: '/', replace: true })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!displayName || !email || !password) return
    mutation.mutate()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={onSubmit}
        data-testid="register-form"
      >
        <label className="flex flex-col gap-1">
          Display name
          <input
            data-testid="register-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            data-testid="register-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="rounded border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input
            type="password"
            data-testid="register-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="rounded border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        {mutation.isError ? (
          <p
            role="alert"
            data-testid="register-error"
            className="text-sm text-red-600"
          >
            Registration failed. Please try again.
          </p>
        ) : null}
        <button
          type="submit"
          data-testid="register-submit"
          disabled={mutation.isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  )
}
