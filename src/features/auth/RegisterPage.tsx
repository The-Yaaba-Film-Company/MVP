import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
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
            Create your writing room account.
          </p>
        </div>

        <div className="rounded-lg border border-paper-300 bg-white p-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={onSubmit}
            data-testid="register-form"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-900">
                Display name
              </span>
              <input
                data-testid="register-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ada Nwosu"
                className="h-9 rounded-md border border-paper-300 bg-white px-3 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-900">Email</span>
              <input
                type="email"
                data-testid="register-email"
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
                data-testid="register-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-9 rounded-md border border-paper-300 bg-white px-3 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
                required
              />
            </label>
            {mutation.isError ? (
              <p
                role="alert"
                data-testid="register-error"
                className="text-sm font-medium text-rust-600"
              >
                Registration failed. Please try again.
              </p>
            ) : null}
            <button
              type="submit"
              data-testid="register-submit"
              disabled={mutation.isPending}
              className="h-9 rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-paper-50 transition-colors hover:bg-clay-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-clay-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
