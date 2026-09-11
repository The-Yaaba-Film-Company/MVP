import type { EntityType } from '#/api/types'
import { entityTypeColor } from '#/lib/screenplay/colors'
import { ENTITY_TYPE_LABELS } from '#/lib/screenplay/types'
import { cn } from '#/lib/utils'

export function EntityChip({
  type,
  label,
  className,
}: {
  type: EntityType
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        entityTypeColor(type),
        className,
      )}
    >
      {label ?? ENTITY_TYPE_LABELS[type]}
    </span>
  )
}
