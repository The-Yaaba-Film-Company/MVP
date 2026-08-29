import { Extension } from '@tiptap/core'
import type { CommandProps, Editor } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import { elementAttrs, sourceText } from './elements'

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- must match tiptap's declared param name
  interface Commands<ReturnType> {
    screenplayElements: {
      setScreenplayElement: (typeName: string) => ReturnType
    }
  }
}

// SPEC §22 — element created on Enter per the current block type.
const SMART_ENTER_NEXT: Record<string, string> = {
  sceneHeading: 'action',
  character: 'dialogue',
  dialogue: 'action',
  parenthetical: 'dialogue',
  transition: 'sceneHeading',
}

function currentBlockName(editor: Editor): string {
  const sel = editor.state.selection
  return sel instanceof NodeSelection
    ? sel.node.type.name
    : sel.$from.parent.type.name
}

/**
 * Convert the block under the selection to another screenplay element,
 * carrying over its display text. Cursor lands at the start of the new block
 * (or selects the node when the target is an atom like Character).
 */
function convertToElement(
  typeName: string,
  { state, tr, dispatch }: CommandProps,
): boolean {
  const target = state.schema.nodes[typeName]
  if (!target.isInGroup('block')) return false

  const sel = state.selection
  let source: PMNode
  let from: number
  let to: number
  if (sel instanceof NodeSelection) {
    source = sel.node
    from = sel.from
    to = sel.to
  } else {
    source = sel.$from.parent
    from = sel.$from.before(sel.$from.depth)
    to = sel.$from.after(sel.$from.depth)
  }
  if (source.type.name === typeName) return false

  const text = sourceText(source).trim()
  const content = target.isLeaf ? null : text ? [state.schema.text(text)] : []

  tr.replaceWith(
    from,
    to,
    target.create(elementAttrs(typeName, source), content),
  )
  if (target.isLeaf) {
    tr.setSelection(NodeSelection.create(tr.doc, from))
  } else {
    tr.setSelection(TextSelection.create(tr.doc, from + 1))
  }
  if (dispatch) dispatch(tr)
  return true
}

export const ScreenplayElements = Extension.create({
  name: 'screenplayElements',

  addCommands() {
    return {
      setScreenplayElement:
        (typeName: string) =>
        (props: CommandProps): boolean =>
          convertToElement(typeName, props),
    }
  },

  addKeyboardShortcuts() {
    const shortcutFor: Array<[string, string]> = [
      ['Mod-1', 'sceneHeading'],
      ['Mod-2', 'action'],
      ['Mod-3', 'character'],
      ['Mod-4', 'dialogue'],
      ['Mod-5', 'parenthetical'],
      ['Mod-6', 'transition'],
      ['Mod-7', 'shot'],
      ['Mod-8', 'general'],
    ]
    const shortcuts: Record<string, () => boolean> = {}
    for (const [key, typeName] of shortcutFor) {
      shortcuts[key] = () => this.editor.commands.setScreenplayElement(typeName)
    }
    shortcuts['Enter'] = () => {
      const next = SMART_ENTER_NEXT[currentBlockName(this.editor)]
      return next ? this.editor.commands.setScreenplayElement(next) : false
    }
    return shortcuts
  },
})
