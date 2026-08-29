import { describe, expect, it } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { findNodeRange, selectionToSpan, spanToPos } from './offset'

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: {
      content: 'text*',
      group: 'block',
      attrs: { id: { default: null } },
      parseDOM: [],
      toDOM: () => ['p', 0],
    },
    text: { group: 'inline' },
  },
})

function doc(blocks: Array<{ id: string; text: string }>) {
  return schema.node('doc', {}, [
    ...blocks.map((b) =>
      schema.node('paragraph', { id: b.id }, [schema.text(b.text)]),
    ),
  ])
}

describe('selectionToSpan', () => {
  const d = doc([{ id: 'n1', text: 'John enters.' }])

  it('returns a span for a selection within a single text block', () => {
    const selection = TextSelection.create(d, 2, 6) // "ohn"
    expect(selectionToSpan(selection)).toEqual({
      node_id: 'n1',
      start_offset: 1,
      end_offset: 5,
    })
  })

  it('clamps offsets to the node text length', () => {
    const selection = TextSelection.create(d, 1, 13)
    expect(selectionToSpan(selection)).toEqual({
      node_id: 'n1',
      start_offset: 0,
      end_offset: 12,
    })
  })

  it('returns null for an empty cursor selection', () => {
    const selection = TextSelection.create(d, 3)
    expect(selectionToSpan(selection)).toBeNull()
  })

  it('returns null for a selection spanning two nodes', () => {
    const selection = TextSelection.create(d, 6, 14) // end of p1 into p2
    expect(selectionToSpan(selection)).toBeNull()
  })

  it('returns null when the node lacks an id', () => {
    const anon = schema.node('doc', {}, [
      schema.node('paragraph', {}, [schema.text('no id here')]),
    ])
    const selection = TextSelection.create(anon, 1, 4)
    expect(selectionToSpan(selection)).toBeNull()
  })
})

describe('findNodeRange', () => {
  it('locates a block by id', () => {
    const d = doc([
      { id: 'n1', text: 'alpha' },
      { id: 'n2', text: 'beta' },
    ])
    expect(findNodeRange(d, 'n2')).toEqual({ node: d.child(1), start: 7 })
  })

  it('returns null for an unknown id', () => {
    expect(findNodeRange(doc([{ id: 'n1', text: 'alpha' }]), 'nope')).toBeNull()
  })
})

describe('spanToPos', () => {
  const d = doc([{ id: 'n1', text: 'John enters.' }])

  it('maps offsets to doc positions inside the text', () => {
    const pos = spanToPos(d, { node_id: 'n1', start_offset: 1, end_offset: 5 })
    expect(pos).toEqual({ from: 2, to: 6, node: d.child(0) })
  })

  it('returns null for a missing node', () => {
    expect(
      spanToPos(d, { node_id: 'ghost', start_offset: 0, end_offset: 1 }),
    ).toBeNull()
  })

  it('returns null for out-of-range end offset', () => {
    expect(
      spanToPos(d, { node_id: 'n1', start_offset: 0, end_offset: 99 }),
    ).toBeNull()
  })

  it('returns null for inverted or empty ranges', () => {
    expect(
      spanToPos(d, { node_id: 'n1', start_offset: 4, end_offset: 2 }),
    ).toBeNull()
    expect(
      spanToPos(d, { node_id: 'n1', start_offset: 2, end_offset: 2 }),
    ).toBeNull()
  })
})
