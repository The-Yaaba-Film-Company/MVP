import type { SlashItem } from './elements'

interface SlashCommandMenuProps {
  items: SlashItem[]
  activeIndex: number
  left: number
  top: number
  onSelect: (type: string) => void
}

/** Presentational popover for the slash command (SPEC §24). */
export function SlashCommandMenu({
  items,
  activeIndex,
  left,
  top,
  onSelect,
}: SlashCommandMenuProps) {
  return (
    <div
      data-testid="slash-menu"
      role="listbox"
      aria-label="Insert screenplay element"
      className="fixed z-50 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
      style={{ left, top }}
    >
      {items.map((item, index) => {
        const active = index === activeIndex
        return (
          <button
            key={item.type}
            type="button"
            role="option"
            aria-selected={active}
            data-testid={`slash-item-${item.type}`}
            data-active={active}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(item.type)
            }}
            className={`block w-full px-3 py-1.5 text-left text-sm ${
              active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
