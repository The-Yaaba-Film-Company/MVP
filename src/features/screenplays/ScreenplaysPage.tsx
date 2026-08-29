import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
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
    <div data-testid="screenplays-page" className="p-8">
      <div className="mb-6">
        <Link
          to="/"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← All projects
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Screenplays</h1>
          <button
            type="button"
            data-testid="new-screenplay-button"
            onClick={() => setCreating((v) => !v)}
            className="rounded bg-neutral-900 px-4 py-2 text-white"
          >
            New Screenplay
          </button>
        </div>
      </div>

      {creating ? (
        <form
          data-testid="screenplay-create-form"
          onSubmit={onSubmit}
          className="mb-6 flex items-end gap-3 rounded border border-neutral-200 p-4"
        >
          <label className="flex flex-1 flex-col gap-1">
            Title
            <input
              data-testid="screenplay-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            data-testid="screenplay-create-submit"
            disabled={create.isPending}
            className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      ) : null}

      {screenplays.length === 0 ? (
        <p className="text-neutral-600">
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
                className="w-full rounded border border-neutral-200 p-4 text-left hover:border-neutral-400"
              >
                <span className="block font-medium">{screenplay.title}</span>
                <span className="mt-1 block text-xs text-neutral-500">
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
