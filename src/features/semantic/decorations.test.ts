import { describe, expect, it } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import {
  ANNOTATION_CLASS,
  SUGGESTION_CLASS,
  buildDecorationSet,
  clearSemanticSpans,
  getSemanticSpans,
  setSemanticSpans,
} from './decorations'
import type { SemanticSpan, SemanticSpanSpec } from './decorations'

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

function byId(id: string) {
  return (spec: SemanticSpanSpec) => spec.spanId === id
}

describe('buildDecorationSet', () => {
  const d = doc([
    { id: 'n1', text: 'John grabs the pistol.' },
    { id: 'n2', text: 'Cut to black.' },
  ])

  const annotation: SemanticSpan = {
    kind: 'annotation',
    id: 'a1',
    node_id: 'n1',
    start_offset: 0,
    end_offset: 4,
  }
  const suggestion: SemanticSpan = {
    kind: 'suggestion',
    id: 's1',
    node_id: 'n1',
    start_offset: 16,
    end_offset: 22,
  }

  it('renders an annotation span with the solid class at mapped positions', () => {
    const set = buildDecorationSet(d, [annotation, suggestion])
    const decos = set.find(0, d.content.size, byId('a1'))
    expect(decos).toHaveLength(1)
    expect(decos[0].from).toBe(1)
    expect(decos[0].to).toBe(5)
    expect((decos[0].spec as SemanticSpanSpec).spanClass).toBe(ANNOTATION_CLASS)
  })

  it('renders a pending suggestion with the dashed class', () => {
    const set = buildDecorationSet(d, [annotation, suggestion])
    const decos = set.find(0, d.content.size, byId('s1'))
    expect(decos).toHaveLength(1)
    expect((decos[0].spec as SemanticSpanSpec).spanClass).toBe(SUGGESTION_CLASS)
  })

  it('skips spans pointing at a missing node', () => {
    const set = buildDecorationSet(d, [{ ...annotation, node_id: 'ghost' }])
    expect(set.find(0, d.content.size, byId('a1'))).toHaveLength(0)
  })

  it('skips out-of-range offsets without throwing', () => {
    const set = buildDecorationSet(d, [
      { ...annotation, start_offset: 0, end_offset: 999 },
    ])
    expect(set.find(0, d.content.size, byId('a1'))).toHaveLength(0)
  })

  it('returns an empty set for no spans', () => {
    const set = buildDecorationSet(d, [])
    expect(set.find(0, d.content.size)).toHaveLength(0)
  })
})

describe('span registry', () => {
  it('round-trips spans per scene and clears them', () => {
    const span: SemanticSpan = {
      kind: 'annotation',
      id: 'a1',
      node_id: 'n1',
      start_offset: 0,
      end_offset: 4,
    }
    setSemanticSpans('scene-1', [span])
    expect(getSemanticSpans('scene-1')).toEqual([span])
    expect(getSemanticSpans('scene-2')).toEqual([])
    clearSemanticSpans('scene-1')
    expect(getSemanticSpans('scene-1')).toEqual([])
  })
})
