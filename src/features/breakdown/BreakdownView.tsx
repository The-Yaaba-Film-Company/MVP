import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useParams } from '@tanstack/react-router'
import {
  useCharacterReport,
  useEntityReport,
  useLocationReport,
  useRuntime,
} from '../reports/queries'

const BREAKDOWN_FROM =
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/breakdown'

type ReportKind = 'characters' | 'locations' | 'entities'

interface ReportRow {
  id: string
  name: string
  aliases: string[]
  scenes: number
  secondary: number | null
}

const TABS: Array<{ key: ReportKind; label: string }> = [
  { key: 'characters', label: 'Characters' },
  { key: 'locations', label: 'Locations' },
  { key: 'entities', label: 'Props & Elements' },
]

function ReportTable({
  rows,
  secondaryLabel,
  secondaryKey,
}: {
  rows: ReportRow[]
  secondaryLabel: string
  secondaryKey?: string
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, query])

  const tableRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    const accessor = (
      row: ReportRow,
      key: string,
    ): string | number | null | undefined => {
      if (key === 'aliases') return row.aliases.join(' ')
      if (key === 'name' || key === 'scenes') return row[key]
      return row.secondary
    }
    return [...filtered].sort((a, b) => {
      const av = accessor(a, sort.key)
      const bv = accessor(b, sort.key)
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir
      }
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir
    })
  }, [filtered, sort])

  const toggleSort = (key: string) =>
    setSort((s) =>
      s.key === key
        ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )

  const columns = useMemo<Array<ColumnDef<ReportRow>>>(
    () => [
      { id: 'name', accessorKey: 'name', header: 'Name' },
      {
        id: 'aliases',
        accessorKey: 'aliases',
        header: 'Aliases',
        cell: (ctx) => String((ctx.getValue() as string[]).join(', ') || '–'),
      },
      { id: 'scenes', accessorKey: 'scenes', header: 'Scenes' },
      {
        id: secondaryKey ?? 'secondary',
        accessorKey: 'secondary',
        header: secondaryLabel,
        cell: (ctx) => (ctx.getValue() == null ? '–' : ctx.getValue()),
      },
    ],
    [secondaryKey, secondaryLabel],
  )

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const sortIndicator = (key: string) =>
    sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div>
      <input
        data-testid="breakdown-filter"
        type="search"
        placeholder="Filter rows…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full max-w-xs rounded-md border border-paper-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-clay-500 focus:outline-none focus:ring-1 focus:ring-clay-500"
      />
      <div className="overflow-x-auto rounded-lg border border-paper-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-200 text-left text-xs uppercase tracking-[0.15em] text-clay-700">
              {table.getHeaderGroups()[0].headers.map((header) => (
                <th key={header.id} className="px-3 py-2">
                  <button
                    type="button"
                    data-testid={`breakdown-sort-${header.id}`}
                    onClick={() => toggleSort(header.id)}
                    className="font-semibold uppercase"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {sortIndicator(header.id)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.original.id}
                data-testid={`breakdown-row-${row.original.id}`}
                className="border-b border-paper-100"
              >
                {row.getVisibleCells().map((cell) => {
                  const value = flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext(),
                  )
                  return cell.column.id === 'name' ? (
                    <td
                      key={cell.id}
                      data-testid={`breakdown-cell-${row.original.id}-name`}
                      className="px-3 py-2 font-medium text-ink-900"
                    >
                      <span data-testid={`breakdown-name-cell-${row.index}`}>
                        {value}
                      </span>
                    </td>
                  ) : (
                    <td
                      key={cell.id}
                      data-testid={`breakdown-cell-${row.original.id}-${cell.column.id}`}
                      className="px-3 py-2 text-ink-500"
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {tableRows.length === 0 ? (
          <p className="px-3 py-6 text-sm text-ink-500">
            Nothing matches the filter.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function BreakdownView() {
  const { projectId, screenplayId } = useParams({ from: BREAKDOWN_FROM })
  const characters = useCharacterReport(projectId)
  const locations = useLocationReport(projectId)
  const entities = useEntityReport(projectId)
  const runtime = useRuntime(screenplayId)
  const [tab, setTab] = useState<ReportKind>('characters')

  const characterRows: ReportRow[] = useMemo(
    () =>
      (characters.data ?? []).map((c) => ({
        id: c.id,
        name: c.canonical_name,
        aliases: c.aliases,
        scenes: c.scene_ids.length,
        secondary: c.dialogue_count,
      })),
    [characters.data],
  )

  const locationRows: ReportRow[] = useMemo(
    () =>
      (locations.data ?? []).map((l) => ({
        id: l.id,
        name: l.canonical_name,
        aliases: l.aliases,
        scenes: l.scene_ids.length,
        secondary: null,
      })),
    [locations.data],
  )

  const entityRows: ReportRow[] = useMemo(
    () =>
      (entities.data ?? []).map((e) => ({
        id: e.id,
        name: e.canonical_name,
        aliases: e.aliases,
        scenes: e.scene_ids.length,
        secondary: e.occurrence_count,
      })),
    [entities.data],
  )

  const active: {
    rows: ReportRow[]
    secondaryLabel: string
    secondaryKey?: string
  } =
    tab === 'characters'
      ? {
          rows: characterRows,
          secondaryLabel: 'Dialogue Lines',
          secondaryKey: 'dialogue',
        }
      : tab === 'locations'
        ? { rows: locationRows, secondaryLabel: 'Scenes' }
        : {
            rows: entityRows,
            secondaryLabel: 'Occurrences',
            secondaryKey: 'occurrences',
          }

  return (
    <div data-testid="breakdown-view" className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-medium text-ink-900">
          Breakdown
        </h1>
        <span data-testid="breakdown-runtime" className="text-sm text-ink-500">
          Estimated runtime: {runtime.data?.runtime_minutes ?? '–'} min
        </span>
      </div>

      <div
        className="mb-4 flex gap-1"
        role="tablist"
        aria-label="Breakdown reports"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            data-testid={`breakdown-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-clay-600 text-paper-50'
                : 'text-ink-600 hover:bg-paper-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ReportTable
        rows={active.rows}
        secondaryLabel={active.secondaryLabel}
        secondaryKey={active.secondaryKey}
      />
    </div>
  )
}
