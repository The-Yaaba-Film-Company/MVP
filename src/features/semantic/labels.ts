import type { EntityType } from '#/api/types'

// Tag menu entity types in SPEC §27 order (Location is structural — created
// from Scene Heading edits, not manual tagging, per SPEC.md §5.4).
const TAGGABLE_TYPES: Array<{ type: EntityType; label: string }> = [
  { type: 'character', label: 'Character' },
  { type: 'prop', label: 'Prop' },
  { type: 'vehicle', label: 'Vehicle' },
  { type: 'set_dressing', label: 'Set Dressing' },
  { type: 'wardrobe', label: 'Wardrobe' },
  { type: 'sound', label: 'Sound' },
  { type: 'vfx', label: 'VFX' },
  { type: 'sfx', label: 'SFX' },
  { type: 'makeup', label: 'Makeup' },
  { type: 'hair', label: 'Hair' },
  { type: 'stunt', label: 'Stunt' },
  { type: 'animal', label: 'Animal' },
  { type: 'extra', label: 'Extra' },
  { type: 'equipment', label: 'Equipment' },
  { type: 'camera_setup', label: 'Camera Setup' },
  { type: 'other', label: 'Other' },
]

export const ENTITY_TYPE_LABELS = TAGGABLE_TYPES
