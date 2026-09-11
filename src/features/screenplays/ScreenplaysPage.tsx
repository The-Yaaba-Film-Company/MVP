import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { api } from '#/api/client'
import {
  useProjectScreenplays,
  projectsKeys,
} from '#/features/projects/queries'

export function ScreenplaysPage() {
  const { projectId } = useParams({
    from: '/_authenticated/projects/$projectId/',
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')

  const screenplaysQuery = useProjectScreenplays(projectId)

  const create = useMutation({
    mutationFn: () => api.screenplays.create(projectId, { title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: projectsKeys.screenplays(projectId),
      })
      setTitle('')
      setCreating(false)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title || create.isPending) return
    create.mutate()
  }

  const screenplays = screenplaysQuery.data ?? []

  return (
    <div data-testid="screenplays-page" className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-clay-700"
        >
          <ChevronLeft className="size-4" aria-hidden /> All projects
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="font-serif text-3xl text-ink-900">Screenplays</h1>
          <button
            type="button"
            data-testid="new-screenplay-button"
            onClick={() => setCreating((v) => !v)}
            className="rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-paper-50 transition-colors hover:bg-clay-700"
          >
            New Screenplay
          </button>
        </div>
      </div>

      {creating ? (
        <form
          data-testid="screenplay-create-form"
          onSubmit={onSubmit}
          className="mb-6 flex items-end gap-3 rounded-lg border border-paper-200 bg-white p-4 shadow-sm"
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-ink-900">Title</span>
            <input
              data-testid="screenplay-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 rounded-md border border-paper-300 bg-white px-3 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
              required
            />
          </label>
          <button
            type="submit"
            data-testid="screenplay-create-submit"
            disabled={create.isPending}
            className="h-9 rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-paper-50 transition-colors hover:bg-clay-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      ) : null}

      {screenplays.length === 0 ? (
        <p className="text-ink-500">
          No screenplays yet. Create one to start writing.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {screenplays.map((screenplay) => (
            <li key={screenplay.id}>
              <button
                type="button"
                data-testid={`screenplay-card-${screenplay.id}`}
                onClick={() =>
                  void navigate({
                    to: '/projects/$projectId/screenplays/$screenplayId/writer',
                    params: { projectId, screenplayId: screenplay.id },
                  })
                }
                className="w-full rounded-lg border border-paper-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-clay-500"
              >
                <span className="block font-serif text-lg font-medium text-ink-900">
                  {screenplay.title}
                </span>
                <span className="mt-1 block text-xs text-ink-500">
                  {screenplay.locked_at ? 'Locked' : 'Draft'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
