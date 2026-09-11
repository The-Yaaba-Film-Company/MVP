import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { api } from '#/api/client'
import type { EntityType } from '#/api/types'
import { ENTITY_TYPE_LABELS, ENTITY_TYPES } from '#/lib/screenplay/types'
import { entityTypeColor } from '#/lib/screenplay/colors'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { semanticKeys } from '#/features/semantic/queries'
import {
  useCharacterReport,
  useEntityReport,
  useLocationReport,
} from '#/features/reports/queries'

type PanelMode = 'library' | 'in-use'

interface InUseRow {
  id: string
  name: string
  aliases: string[]
  scenes: number
  extra: string | number | null
}

function InUseSection({
  label,
  rows,
  empty,
}: {
  label: string
  rows: InUseRow[]
  empty: string
}) {
  return (
    <section className="rounded-lg border border-paper-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md border border-paper-300 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-600">
          {label}
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-ink-700">
        {rows.map((r) => (
          <li
            key={r.id}
            data-testid={`in-use-${r.id}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="min-w-0 truncate">
              {r.name}
              {r.aliases.length > 0 && (
                <span className="text-xs text-ink-500">
                  {' '}
                  {r.aliases.join(', ')}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-ink-500">
              {r.scenes} scene{r.scenes === 1 ? '' : 's'}
              {r.extra != null
                ? ` · ${r.extra} ${String(label).toLowerCase()}`
                : ''}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-ink-500">{empty}</li>}
      </ul>
    </section>
  )
}

export function ElementsPanel({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
}) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<PanelMode>('library')
  const [openType, setOpenType] = useState<EntityType | null>(null)
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [search, setSearch] = useState('')

  const entitiesQuery = useQuery({
    queryKey: semanticKeys.entitiesPrefix(projectId),
    queryFn: () => api.entities.list(projectId),
  })

  const charactersReport = useCharacterReport(projectId)
  const locationsReport = useLocationReport(projectId)
  const entitiesReport = useEntityReport(projectId)

  const createMutation = useMutation({
    mutationFn: ({
      type,
      name: entityName,
      aliases: entityAliases,
    }: {
      type: EntityType
      name: string
      aliases: string[]
    }) =>
      api.entities.create(projectId, {
        entity_type: type,
        canonical_name: entityName,
        aliases: entityAliases,
      }),
    onSuccess: (entity) => {
      void queryClient.invalidateQueries({
        queryKey: semanticKeys.entitiesPrefix(projectId),
      })
      toast.success(
        `${ENTITY_TYPE_LABELS[entity.entity_type]} “${entity.canonical_name}” added`,
      )
      setName('')
      setAliases('')
      setOpenType(null)
    },
    onError: () => {
      toast.error('Could not add element')
    },
  })

  function submit(type: EntityType) {
    if (!name.trim()) return
    createMutation.mutate({
      type,
      name: name.trim(),
      aliases: aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    })
  }

  const entities = entitiesQuery.data ?? []

  const inUseRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (candidate: string, rowAliases: string[]) =>
      !q || [candidate, ...rowAliases].some((s) => s.toLowerCase().includes(q))

    const characterRows: InUseRow[] = (charactersReport.data ?? []).map(
      (c) => ({
        id: c.id,
        name: c.canonical_name,
        aliases: c.aliases,
        scenes: c.scene_ids.length,
        extra: c.dialogue_count,
      }),
    )
    const locationRows: InUseRow[] = (locationsReport.data ?? []).map((l) => ({
      id: l.id,
      name: l.canonical_name,
      aliases: l.aliases,
      scenes: l.scene_ids.length,
      extra: null,
    }))
    const entityRows: InUseRow[] = (entitiesReport.data ?? []).map((e) => ({
      id: e.id,
      name: e.canonical_name,
      aliases: e.aliases,
      scenes: e.scene_ids.length,
      extra: e.occurrence_count,
    }))

    return {
      characters: characterRows.filter((r) => match(r.name, r.aliases)),
      locations: locationRows.filter((r) => match(r.name, r.aliases)),
      entities: entityRows.filter((r) => match(r.name, r.aliases)),
    }
  }, [charactersReport.data, locationsReport.data, entitiesReport.data, search])

  const modeTab = (m: PanelMode, label: string, testid: string) => (
    <button
      type="button"
      data-testid={testid}
      onClick={() => setMode(m)}
      className={cn(
        'flex-1 rounded px-3 py-1 text-sm font-medium transition-colors',
        mode === m
          ? 'bg-clay-600 text-paper-50'
          : 'text-ink-600 hover:bg-paper-100',
      )}
    >
      {label}
    </button>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="elements-panel"
        className="w-full overflow-y-auto bg-paper-50 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="font-serif text-ink-900">
            Production elements
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <div className="flex gap-1 rounded-md border border-paper-200 bg-white p-1">
            {modeTab('library', 'Library', 'elements-mode-library')}
            {modeTab('in-use', 'In use', 'elements-mode-in-use')}
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              mode === 'library' ? 'Search all elements…' : 'Filter in-use…'
            }
            aria-label={
              mode === 'library' ? 'Search all elements' : 'Filter in-use'
            }
            className="border-paper-300 bg-white"
          />

          {mode === 'in-use' ? (
            <div className="space-y-4">
              <InUseSection
                label="Characters"
                rows={inUseRows.characters}
                empty="No characters in use."
              />
              <InUseSection
                label="Locations"
                rows={inUseRows.locations}
                empty="No locations in use."
              />
              <InUseSection
                label="Props & Elements"
                rows={inUseRows.entities}
                empty="No props or elements in use."
              />
            </div>
          ) : (
            ENTITY_TYPES.map((type) => {
              const list = entities.filter(
                (e) =>
                  e.entity_type === type &&
                  e.canonical_name.toLowerCase().includes(search.toLowerCase()),
              )
              if (search && list.length === 0) return null
              return (
                <section
                  key={type}
                  className="rounded-lg border border-paper-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-md border px-2 py-0.5 text-xs font-semibold',
                        entityTypeColor(type),
                      )}
                    >
                      {ENTITY_TYPE_LABELS[type]}
                    </span>
                    <button
                      type="button"
                      data-testid={`element-panel-add-${type}`}
                      onClick={() =>
                        setOpenType(openType === type ? null : type)
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-paper-300 px-2 py-1 text-xs font-medium text-clay-700 hover:bg-clay-100"
                    >
                      <Plus className="size-3" aria-hidden /> Add{' '}
                      {ENTITY_TYPE_LABELS[type]}
                    </button>
                  </div>

                  {openType === type && (
                    <div className="mt-3 space-y-2">
                      <Input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        aria-label={`${ENTITY_TYPE_LABELS[type]} name`}
                        className="h-8 border-paper-300"
                      />
                      <Input
                        value={aliases}
                        onChange={(e) => setAliases(e.target.value)}
                        placeholder="Aliases (comma separated)"
                        aria-label="Aliases"
                        className="h-8 border-paper-300"
                      />
                      <Button
                        size="sm"
                        disabled={createMutation.isPending}
                        onClick={() => submit(type)}
                        className="bg-clay-600 text-paper-50 hover:bg-clay-700"
                      >
                        Save element
                      </Button>
                    </div>
                  )}

                  <ul
                    data-testid={`element-panel-list-${type}`}
                    className="mt-2 space-y-1 text-sm text-ink-700"
                  >
                    {list.map((e) => (
                      <li key={e.id} className="flex justify-between gap-2">
                        <span>{e.canonical_name}</span>
                        {e.aliases.length > 0 && (
                          <span className="text-xs text-ink-500">
                            {e.aliases.join(', ')}
                          </span>
                        )}
                      </li>
                    ))}
                    {list.length === 0 && (
                      <li className="text-xs text-ink-500">
                        Nothing logged yet.
                      </li>
                    )}
                  </ul>
                </section>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
