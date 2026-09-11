import { ENTITY_TYPES  } from '#/api/types'
import type {EntityType} from '#/api/types';

export { ENTITY_TYPES }
export type { EntityType }

/** Human labels for production-element departments (SPEC §4.3). */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  character: 'Character',
  location: 'Location',
  prop: 'Prop',
  vehicle: 'Vehicle',
  set_dressing: 'Set Dressing',
  wardrobe: 'Wardrobe',
  sound: 'Sound',
  vfx: 'VFX',
  sfx: 'SFX',
  makeup: 'Makeup',
  hair: 'Hair',
  stunt: 'Stunt',
  animal: 'Animal',
  extra: 'Extra',
  equipment: 'Equipment',
  camera_setup: 'Camera Setup',
  other: 'Other',
}

export const SCREENPLAY_ELEMENTS = [
  'sceneHeading',
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
  'shot',
  'general',
] as const

export type ScreenplayElement = (typeof SCREENPLAY_ELEMENTS)[number]

export const SCREENPLAY_ELEMENT_LABELS: Record<ScreenplayElement, string> = {
  sceneHeading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  shot: 'Shot',
  general: 'General',
}
