import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useScenes } from '../writer/queries'
import { headingFromContent } from '../writer/heading'
import { useWriterStore } from '../writer/store'
import { usePaginationReport } from '../pagination/usePaginationReport'
import type { PaginationReport, Scene } from '#/api/types'

const NAV_FROM =
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/navigator'
const WRITER_TO = '/projects/$projectId/screenplays/$screenplayId/writer'

type SortKey = 'number' | 'heading'
type SortDir = 'asc' | 'desc'

interface Row {
  scene: Scene
  heading: string
  pages: string
  locked: boolean
}

function buildRows(
  scenes: Scene[] | undefined,
  report: PaginationReport | undefined,
): Row[] {
  const metrics = new Map(
    (report?.scene_metrics ?? []).map((m) => [m.scene_id, m]),
  )
  return (scenes ?? []).map((scene) => {
    const metric = metrics.get(scene.id)
    return {
      scene,
      heading: headingFromContent(scene.content),
      pages: metric ? `${metric.start_page}–${metric.end_page}` : '–',
      locked: scene.locked,
    }
  })
}

function sortRows(rows: Row[], key: SortKey, dir: SortDir): Row[] {
  const dirSign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'number') {
      return (a.scene.order_key - b.scene.order_key) * dirSign
    }
    return a.heading.localeCompare(b.heading) * dirSign
  })
}

export function NavigatorView() {
  const { projectId, screenplayId } = useParams({ from: NAV_FROM })
  const { data: scenes } = useScenes(screenplayId)
  const { data: pagination } = usePaginationReport(screenplayId)
  const navigate = useNavigate()
  const setActiveSceneId = useWriterStore((s) => s.setActiveSceneId)

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(
    () => buildRows(scenes?.items, pagination),
    [scenes, pagination],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? rows.filter((r) =>
          `${r.heading} ${r.scene.number ?? ''}`.toLowerCase().includes(q),
        )
      : rows
    return sortRows(filtered, sortKey, sortDir)
  }, [rows, query, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const openScene = (scene: Scene) => {
    setActiveSceneId(scene.id)
    void navigate({ to: WRITER_TO, params: { projectId, screenplayId } })
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div data-testid="navigator-view" className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-medium text-ink-900">
          Scene Navigator
        </h1>
        <input
          data-testid="navigator-filter"
          type="search"
          placeholder="Filter scenes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-md border border-paper-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-paper-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-200 text-left text-xs uppercase tracking-[0.15em] text-clay-700">
              <th className="px-3 py-2">
                <button
                  type="button"
                  data-testid="navigator-sort-number"
                  onClick={() => toggleSort('number')}
                  className="font-semibold uppercase"
                >
                  # {sortIndicator('number')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  type="button"
                  data-testid="navigator-sort-heading"
                  onClick={() => toggleSort('heading')}
                  className="font-semibold uppercase"
                >
                  Scene {sortIndicator('heading')}
                </button>
              </th>
              <th className="px-3 py-2">Pages</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr
                key={row.scene.id}
                data-testid={`navigator-row-${row.scene.id}`}
                className="border-b border-paper-100"
              >
                <td
                  data-testid="navigator-number"
                  className="px-3 py-2 text-right font-mono text-clay-700"
                >
                  {row.scene.number ?? '–'}
                </td>
                <td
                  data-testid={`navigator-heading-cell-${index}`}
                  className="px-3 py-2 font-medium text-ink-900"
                >
                  <span data-testid="navigator-heading">{row.heading}</span>
                </td>
                <td
                  data-testid="navigator-pages"
                  className="px-3 py-2 text-ink-500"
                >
                  {row.pages}
                </td>
                <td data-testid="navigator-status" className="px-3 py-2">
                  {row.locked ? (
                    <span
                      data-testid="navigator-locked"
                      className="rounded-md border border-ochre-600/40 bg-ochre-100 px-2 py-0.5 text-xs text-ochre-600"
                    >
                      Locked
                    </span>
                  ) : (
                    <span className="text-ink-400">–</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    data-testid={`navigator-open-${row.scene.id}`}
                    onClick={() => openScene(row.scene)}
                    className="rounded-md bg-clay-600 px-2.5 py-1 text-xs font-medium text-paper-50 hover:bg-clay-700"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="px-3 py-6 text-sm text-ink-500">
            No scenes match the filter.
          </p>
        ) : null}
      </div>
    </div>
  )
}
