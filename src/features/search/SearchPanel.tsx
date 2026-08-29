import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useProjectSearch } from './queries'
import { useWriterStore } from '../writer/store'
import type { SearchResult } from '#/api/types'

interface SearchPanelProps {
  projectId: string
  screenplayId: string
}

const KIND_LABELS: Record<SearchResult['kind'], string> = {
  character: 'Character',
  location: 'Location',
  scene: 'Scene',
  entity: 'Entity',
  text: 'Text',
}

/**
 * Project-wide search (SPEC §7 Search, frontend spec §47). Debounced query
 * into `/projects/{id}/search`; results navigate to their scene.
 */
export function SearchPanel({ projectId, screenplayId }: SearchPanelProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const setActiveSceneId = useWriterStore((s) => s.setActiveSceneId)

  const { data } = useProjectSearch(projectId, query)

  function goTo(result: SearchResult) {
    if (result.scene_id) {
      setActiveSceneId(result.scene_id)
    }
    setOpen(false)
    setQuery('')
    void navigate({
      to: '/projects/$projectId/screenplays/$screenplayId/scene',
      params: { projectId, screenplayId },
    })
  }

  const results: SearchResult[] = data?.items ?? []
  const hasQuery = query.trim().length > 0

  return (
    <div className="relative ml-auto" data-testid="project-search">
      <input
        data-testid="project-search-input"
        value={query}
        placeholder="Search project…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className="w-56 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
      />
      {open && hasQuery ? (
        <div
          data-testid="project-search-results"
          className="absolute right-0 top-full z-20 mt-1 w-72 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-500">
              No matches for “{query.trim()}”.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    data-testid={`search-result-${result.id}`}
                    onClick={() => goTo(result)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-neutral-50"
                  >
                    <span className="flex items-center gap-2 text-sm text-neutral-900">
                      <span className="truncate font-medium">
                        {result.match}
                      </span>
                      <span className="shrink-0 rounded bg-neutral-100 px-1 text-[10px] uppercase tracking-wide text-neutral-500">
                        {KIND_LABELS[result.kind]}
                      </span>
                    </span>
                    {result.snippet ? (
                      <span className="truncate text-xs text-neutral-500">
                        {result.snippet}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
