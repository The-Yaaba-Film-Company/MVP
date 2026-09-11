import type { Node as PMNode } from '@tiptap/pm/model'
import type { IntExt } from '#/api/types'
import { headingText, parseIntExtPrefix } from './heading'

// Ctrl/Cmd + 1..8 shortcut order (SPEC §21) == slash menu order (SPEC §24).
export const SCREENPLAY_ELEMENT_LABELS: Record<string, string> = {
  sceneHeading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  shot: 'Shot',
  general: 'General',
}

export interface SlashItem {
  type: string
  label: string
}

export function slashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  return (
    [
      'sceneHeading',
      'action',
      'character',
      'dialogue',
      'parenthetical',
      'transition',
      'shot',
      'general',
    ] as const
  )
    .map((type) => ({ type, label: SCREENPLAY_ELEMENT_LABELS[type] }))
    .filter((item) => !q || item.label.toLowerCase().includes(q))
}

/**
 * Display text for a block node, drawn from its attrs when it is an atom
 * (sceneHeading/character/transition render via renderHTML, storing no text).
 */
export function sourceText(node: PMNode): string {
  switch (node.type.name) {
    case 'sceneHeading':
      return headingText(
        node.attrs.intExt as IntExt,
        node.attrs.location as string,
        node.attrs.timeOfDay as string,
        node.attrs.modifier as string | null,
      )
    case 'character':
      return node.attrs.displayName as string
    case 'transition':
      return node.attrs.transitionType as string
    default:
      return node.textContent
  }
}

/** Attrs for a freshly converted element, carrying over the source text. */
export function elementAttrs(typeName: string, sourceNode: PMNode) {
  const text = sourceText(sourceNode).trim()
  switch (typeName) {
    case 'sceneHeading': {
      const parsed = parseIntExtPrefix(text)
      return {
        intExt: parsed.intExt,
        location: parsed.location,
        timeOfDay: '',
        modifier: null,
      }
    }
    case 'character':
      return {
        characterId: null,
        displayName: text.toUpperCase(),
        extension: null,
      }
    case 'transition':
      return { transitionType: text || null }
    default:
      return {}
  }
}
