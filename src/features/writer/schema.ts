import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { nodeId } from '#/lib/id'
import { ScreenplayElements } from './screenplayElements'
import type { IntExt } from '#/api/types'
import { headingText } from './heading'

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

/** Text source block (action, dialogue, parenthetical, shot, general). */
function textBlock(name: string, classes: string) {
  return Node.create({
    name,
    group: 'block',
    content: 'text*',
    addAttributes() {
      return {
        id: { default: () => nodeId(name[0]) },
      }
    },
    parseHTML() {
      return [{ tag: `div[data-node-type="${name}"]` }]
    },
    renderHTML({ node: _node, HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          'data-node-type': name,
          class: classes,
        }),
        0,
      ]
    },
  })
}

const sceneHeading = Node.create({
  name: 'sceneHeading',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      intExt: { default: 'INT' },
      location: { default: '' },
      timeOfDay: { default: '' },
      modifier: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-node-type="sceneHeading"]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as {
      intExt: IntExt
      location: string
      timeOfDay: string
      modifier: string | null
    }
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-node-type': 'sceneHeading',
        class: 'font-semibold uppercase tracking-wide',
      }),
      headingText(
        attrs.intExt,
        attrs.location,
        attrs.timeOfDay,
        attrs.modifier,
      ),
    ]
  },
})

const character = Node.create({
  name: 'character',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      characterId: { default: null },
      displayName: { default: '' },
      extension: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-node-type="character"]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as {
      displayName: string
      extension: string | null
    }
    const label = attrs.extension
      ? `${attrs.displayName} (${attrs.extension})`
      : attrs.displayName || 'CHARACTER'
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-node-type': 'character',
        class: 'font-bold',
      }),
      label,
    ]
  },
})

const transition = Node.create({
  name: 'transition',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      transitionType: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-node-type="transition"]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-node-type': 'transition',
        class: 'text-right uppercase',
      }),
      (node.attrs.transitionType as string | null) ?? 'CUT TO:',
    ]
  },
})

export function getScreenplayExtensions() {
  return [
    StarterKit.configure({
      paragraph: false,
      heading: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      bold: false,
      italic: false,
      strike: false,
      link: false,
      dropcursor: false,
      gapcursor: false,
      trailingNode: false,
    }),
    ScreenplayElements,
    sceneHeading,
    character,
    transition,
    textBlock('action', 'pl-12'),
    textBlock('dialogue', 'ml-32 mr-10 pl-8 pr-8'),
    textBlock('parenthetical', 'ml-40 pr-8'),
    textBlock('shot', 'ml-32'),
    textBlock('general', ''),
  ]
}
