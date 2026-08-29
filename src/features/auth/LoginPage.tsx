import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '#/api/client'
import { isApiError } from '#/api/errors'
import { authKeys } from './queries'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.auth.login({ email, password }),
    onSuccess: async (user) => {
      queryClient.setQueryData(authKeys.me, user)
      await navigate({ to: '/', replace: true })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email || !password) return
    mutation.mutate()
  }

  const errorMessage = mutation.isError
    ? isApiError(mutation.error) && mutation.error.status === 401
      ? 'Invalid email or password.'
      : 'Sign in failed. Please try again.'
    : null

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={onSubmit}
        data-testid="login-form"
      >
        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            data-testid="login-email"
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
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        {errorMessage ? (
          <p
            role="alert"
            data-testid="login-error"
            className="text-sm text-red-600"
          >
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          data-testid="login-submit"
          disabled={mutation.isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
