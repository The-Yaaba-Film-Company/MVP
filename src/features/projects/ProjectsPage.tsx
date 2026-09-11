import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '#/api/client'
import { projectsKeys } from './queries'

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')

  const projectQuery = useQuery({
    queryKey: projectsKeys.all,
    queryFn: () => api.projects.list(),
  })

  const create = useMutation({
    mutationFn: () => api.projects.create({ title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsKeys.all })
      setTitle('')
      setCreating(false)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title || create.isPending) return
    create.mutate()
  }

  if (projectQuery.isPending) {
    return (
      <div data-testid="projects-page" className="p-8">
        <p className="text-ink-500">Loading projects…</p>
      </div>
    )
  }

  const projects = projectQuery.data ?? []

  return (
    <div data-testid="projects-page" className="mx-auto max-w-6xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Your projects</h1>
          <p className="mt-1 text-sm text-ink-500">
            Open a project to write, tag, and break down your screenplays.
          </p>
        </div>
        <button
          type="button"
          data-testid="new-project-button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-paper-50 transition-colors hover:bg-clay-700"
        >
          New Project
        </button>
      </div>

      {creating ? (
        <form
          data-testid="project-create-form"
          onSubmit={onSubmit}
          className="mb-6 flex items-end gap-3 rounded-lg border border-paper-200 bg-white p-4 shadow-sm"
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-ink-900">Title</span>
            <input
              data-testid="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 rounded-md border border-paper-300 bg-white px-3 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
              required
            />
          </label>
          <button
            type="submit"
            data-testid="project-create-submit"
            disabled={create.isPending}
            className="h-9 rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-paper-50 transition-colors hover:bg-clay-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      ) : null}

      {create.isError ? (
        <p
          role="alert"
          data-testid="project-create-error"
          className="mb-4 text-sm font-medium text-rust-600"
        >
          Could not create project.
        </p>
      ) : null}

      {projects.length === 0 ? (
        <p className="text-ink-500">No projects yet. Start a new one above.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                data-testid={`project-card-${project.id}`}
                onClick={() =>
                  void navigate({
                    to: '/projects/$projectId',
                    params: { projectId: project.id },
                  })
                }
                className="w-full rounded-lg border border-paper-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-clay-500"
              >
                <span className="block font-serif text-lg font-medium text-ink-900">
                  {project.title}
                </span>
                <span className="mt-1 block text-xs text-ink-500">
                  {project.description ?? 'No description'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
