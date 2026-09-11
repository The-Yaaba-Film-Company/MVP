import {
  SCREENPLAY_ELEMENT_LABELS,
  SCREENPLAY_ELEMENTS
  
} from '#/lib/screenplay/types'
import type {ScreenplayElement} from '#/lib/screenplay/types';
import { cn } from '#/lib/utils'

export function ElementToolbar({
  active,
  onSelect,
  disabled,
}: {
  active?: ScreenplayElement | undefined
  onSelect: (type: ScreenplayElement) => void
  disabled?: boolean | undefined
}) {
  return (
    <div
      role="toolbar"
      aria-label="Screenplay elements"
      data-testid="element-toolbar"
      className="flex flex-wrap gap-1 rounded-lg border border-paper-300 bg-paper-100 p-1.5"
    >
      {SCREENPLAY_ELEMENTS.map((type, i) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          data-testid={`element-button-${type}`}
          aria-pressed={active === type}
          title={`${SCREENPLAY_ELEMENT_LABELS[type]} (Ctrl/⌘${i + 1})`}
          onClick={() => onSelect(type)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
            active === type
              ? 'bg-clay-600 text-paper-50'
              : 'text-ink-700 hover:bg-paper-200',
          )}
        >
          {SCREENPLAY_ELEMENT_LABELS[type]}
        </button>
      ))}
    </div>
  )
}
