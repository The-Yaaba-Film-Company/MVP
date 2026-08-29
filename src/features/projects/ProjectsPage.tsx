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
        <p className="text-neutral-600">Loading projects…</p>
      </div>
    )
  }

  const projects = projectQuery.data ?? []

  return (
    <div data-testid="projects-page" className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <button
          type="button"
          data-testid="new-project-button"
          onClick={() => setCreating((v) => !v)}
          className="rounded bg-neutral-900 px-4 py-2 text-white"
        >
          New Project
        </button>
      </div>

      {creating ? (
        <form
          data-testid="project-create-form"
          onSubmit={onSubmit}
          className="mb-6 flex items-end gap-3 rounded border border-neutral-200 p-4"
        >
          <label className="flex flex-1 flex-col gap-1">
            Title
            <input
              data-testid="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            data-testid="project-create-submit"
            disabled={create.isPending}
            className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      ) : null}

      {create.isError ? (
        <p
          role="alert"
          data-testid="project-create-error"
          className="mb-4 text-sm text-red-600"
        >
          Could not create project.
        </p>
      ) : null}

      {projects.length === 0 ? (
        <p className="text-neutral-600">
          No projects yet. Start a new one above.
        </p>
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
                className="w-full rounded border border-neutral-200 p-4 text-left hover:border-neutral-400"
              >
                <span className="block font-medium">{project.title}</span>
                <span className="mt-1 block text-xs text-neutral-500">
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
