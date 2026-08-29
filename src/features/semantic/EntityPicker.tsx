import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useEntitySearch, toEntityOptions } from './queries'
import { ENTITY_TYPE_LABELS } from './labels'
import type { EntityType } from '#/api/types'

interface EntityPickerProps {
  projectId: string
  type: EntityType
  left: number
  top: number
  onPick: (entityId: string) => void
  onCreate: (payload: {
    entity_type: EntityType
    canonical_name: string
  }) => void
  onClose: () => void
}

/** ComboBox over the entities-search endpoint + create-new row (SPEC §26). */
export function EntityPicker({
  projectId,
  type,
  left,
  top,
  onPick,
  onCreate,
  onClose,
}: EntityPickerProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const { data, isFetching } = useEntitySearch(projectId, type, query)
  const options = useMemo(() => toEntityOptions(data), [data])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const canCreate = query.trim().length > 0
  const rows = options.length + (canCreate ? 1 : 0)

  const selectRow = (index: number) => {
    if (index < options.length) {
      onPick(options[index].id)
      return
    }
    onCreate({
      entity_type: type,
      canonical_name: query.trim().toUpperCase(),
    })
  }

  useEffect(() => {
    if (activeIndex >= rows && rows > 0) setActiveIndex(rows - 1)
  }, [activeIndex, rows])

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (rows > 0) setActiveIndex((i) => (i + 1) % rows)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (rows > 0) setActiveIndex((i) => (i - 1 + rows) % rows)
        break
      case 'Enter':
        event.preventDefault()
        if (rows > 0) selectRow(Math.min(activeIndex, rows - 1))
        break
      case 'Escape':
        event.preventDefault()
        onClose()
        break
    }
  }

  const label =
    ENTITY_TYPE_LABELS.find((t) => t.type === type)?.label.toUpperCase() ??
    type.toUpperCase()

  return (
    <div
      data-testid="entity-picker"
      className="fixed z-50 w-64 rounded-md border border-neutral-200 bg-white py-2 shadow-lg"
      style={{ left, top }}
    >
      <label className="block px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </label>
      <input
        ref={inputRef}
        data-testid="entity-picker-input"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-label={`Search ${label} entities`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={handleKey}
        onBlur={onClose}
        className="mx-3 mb-1 w-[calc(100%-1.5rem)] rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
      />
      <div role="listbox" aria-label={`${label} entities`}>
        {options.map((option, index) => {
          const active = index === activeIndex
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={active}
              data-testid={`entity-option-${option.id}`}
              data-active={active}
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(option.id)
              }}
              className={`block w-full px-3 py-1 text-left text-sm ${
                active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
              }`}
            >
              {option.canonical_name}
              {option.aliases.length > 0 ? (
                <span
                  className={active ? 'text-neutral-300' : 'text-neutral-400'}
                >
                  {' '}
                  ({option.aliases.join(', ')})
                </span>
              ) : null}
            </button>
          )
        })}
        {canCreate ? (
          <button
            type="button"
            role="option"
            aria-selected={activeIndex === options.length}
            data-testid="entity-create"
            onMouseDown={(e) => {
              e.preventDefault()
              onCreate({
                entity_type: type,
                canonical_name: query.trim().toUpperCase(),
              })
            }}
            onFocus={() => setActiveIndex(options.length)}
            className={`block w-full px-3 py-1 text-left text-sm ${
              activeIndex === options.length
                ? 'bg-neutral-900 text-white'
                : 'hover:bg-neutral-100'
            }`}
          >
            + Create “{query.trim().toUpperCase()}”
          </button>
        ) : null}
      </div>
      <div className="px-3 pt-1 text-xs text-neutral-400">
        {isFetching
          ? 'Searching…'
          : '↑↓ to browse · Enter to select · Esc to cancel'}
      </div>
    </div>
  )
}
