import { ENTITY_TYPE_LABELS } from './labels'
import type { EntityType } from '#/api/types'

interface TagMenuProps {
  left: number
  top: number
  activeIndex?: number
  onSelect: (type: EntityType) => void
  onClose: () => void
}

/** The entity-type menu behind Ctrl/Cmd+Shift+T (SPEC §27). */
export function TagMenu({
  left,
  top,
  activeIndex = 0,
  onSelect,
  onClose,
}: TagMenuProps) {
  return (
    <div
      data-testid="tag-menu"
      role="listbox"
      aria-label="Tag element"
      className="fixed z-50 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
      style={{ left, top }}
    >
      <p className="px-3 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Tag Element
      </p>
      {ENTITY_TYPE_LABELS.map((item, index) => {
        const active = index === activeIndex
        return (
          <button
            key={item.type}
            type="button"
            role="option"
            aria-selected={active}
            data-testid={`tag-item-${item.type}`}
            data-active={active}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(item.type)
            }}
            className={`block w-full px-3 py-1 text-left text-sm ${
              active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
            }`}
          >
            {item.label}
          </button>
        )
      })}
      <button
        type="button"
        data-testid="tag-menu-close"
        onMouseDown={(e) => {
          e.preventDefault()
          onClose()
        }}
        className="block w-full border-t border-neutral-100 px-3 py-1 text-left text-xs text-neutral-400 hover:bg-neutral-100"
      >
        Esc — cancel
      </button>
    </div>
  )
}
