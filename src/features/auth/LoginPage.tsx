import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
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
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
            Yaaba Film Company
          </p>
          <h1 className="mt-1 font-serif text-3xl text-ink-900">
            The Story Room
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Sign in to your writing room.
          </p>
        </div>

        <div className="rounded-lg border border-paper-300 bg-white p-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={onSubmit}
            data-testid="login-form"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-900">Email</span>
              <input
                type="email"
                data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@studio.com"
                className="h-9 rounded-md border border-paper-300 bg-white px-3 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-900">Password</span>
              <input
                type="password"
                data-testid="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-9 rounded-md border border-paper-300 bg-white px-3 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
                required
              />
            </label>
            {errorMessage ? (
              <p
                role="alert"
                data-testid="login-error"
                className="text-sm font-medium text-rust-600"
              >
                {errorMessage}
              </p>
            ) : null}
            <button
              type="submit"
              data-testid="login-submit"
              disabled={mutation.isPending}
              className="h-9 rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-paper-50 transition-colors hover:bg-clay-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          New to the Story Room?{' '}
          <Link
            to="/register"
            className="font-medium text-clay-700 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
