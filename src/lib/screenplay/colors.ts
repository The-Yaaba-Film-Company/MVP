import type { EntityType } from '#/api/types'

/** Single source of truth for department/entity chip colors. */
const MAP: Record<EntityType, string> = {
  character: 'bg-clay-100 text-clay-700 border-clay-500/40',
  location: 'bg-olive-100 text-olive-600 border-olive-600/40',
  prop: 'bg-ochre-100 text-ochre-600 border-ochre-500/40',
  vehicle: 'bg-paper-200 text-ink-700 border-ink-700/30',
  set_dressing: 'bg-olive-100 text-olive-500 border-olive-500/40',
  wardrobe: 'bg-ochre-100 text-ochre-600 border-ochre-600/50',
  sound: 'bg-verdigris-100 text-verdigris-600 border-verdigris-600/40',
  vfx: 'bg-plum-100 text-plum-600 border-plum-600/40',
  sfx: 'bg-rust-100 text-rust-600 border-rust-600/40',
  makeup: 'bg-clay-100 text-clay-600 border-clay-500/30',
  hair: 'bg-clay-100 text-clay-600 border-clay-500/30',
  stunt: 'bg-rust-100 text-rust-600 border-rust-600/60',
  animal: 'bg-ochre-100 text-ochre-600 border-ochre-500/25',
  extra: 'bg-paper-300 text-ink-700 border-ink-700/25',
  equipment: 'bg-paper-100 text-ink-500 border-ink-500/30',
  camera_setup: 'bg-paper-200 text-ink-900 border-ink-900/30',
  other: 'bg-paper-100 text-ink-500 border-ink-500/30',
}

export function entityTypeColor(type: EntityType): string {
  return MAP[type]
}
