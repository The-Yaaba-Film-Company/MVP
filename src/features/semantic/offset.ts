import type { Node as PMNode } from '@tiptap/pm/model'
import type { Selection } from '@tiptap/pm/state'

export interface TextSpan {
  node_id: string
  start_offset: number
  end_offset: number
}

export type SpanInput = Pick<
  TextSpan,
  'node_id' | 'start_offset' | 'end_offset'
>

/**
 * Derive an annotation span from the current editor selection (SPEC §27).
 * Only a non-empty selection fully inside a single text block is taggable —
 * atoms (character, sceneHeading, transition) and cross-node selections are
 * returned as null so the caller can disable tagging.
 */
export function selectionToSpan(selection: Selection): TextSpan | null {
  const { from, to } = selection
  if (from === to) return null
  const $from = selection.$from
  const $to = selection.$to
  if ($from.parent !== $to.parent) return null
  const node = $from.parent
  if (!node.isTextblock) return null
  const textLength = node.textContent.length
  const nodeStart = $from.before()
  const startOffset = Math.max(0, Math.min(textLength, from - nodeStart - 1))
  const endOffset = Math.max(0, Math.min(textLength, to - nodeStart - 1))
  if (endOffset <= startOffset) return null
  const nodeId = node.attrs.id
  if (typeof nodeId !== 'string' || nodeId === '') return null
  return { node_id: nodeId, start_offset: startOffset, end_offset: endOffset }
}

export interface NodeRange {
  node: PMNode
  start: number
}

/** Locate a block node by its stable ProseMirror `id` attribute. */
export function findNodeRange(doc: PMNode, nodeId: string): NodeRange | null {
  let result: NodeRange | null = null
  doc.descendants((node, pos) => {
    if (result !== null) return false
    if (typeof node.attrs.id === 'string' && node.attrs.id === nodeId) {
      result = { node, start: pos }
      return false
    }
    return true
  })
  return result
}

export interface DocSpan {
  from: number
  to: number
  node: PMNode
}

/**
 * Map an annotation's per-node offsets to ProseMirror positions. Returns null
 * when the node is missing/atom or the offsets fall outside its text run, so
 * a stale or malformed annotation never breaks the editor.
 */
export function spanToPos(doc: PMNode, span: SpanInput): DocSpan | null {
  const range = findNodeRange(doc, span.node_id)
  if (!range) return null
  const { node, start } = range
  if (!node.isTextblock) return null
  const textLength = node.textContent.length
  if (span.start_offset < 0 || span.end_offset > textLength) return null
  if (span.end_offset <= span.start_offset) return null
  return {
    from: start + 1 + span.start_offset,
    to: start + 1 + span.end_offset,
    node,
  }
}
