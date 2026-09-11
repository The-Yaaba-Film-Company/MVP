import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { getScreenplayExtensions } from './schema'
import type { TiptapNode } from '#/api/types'

const active: Editor[] = []

function makeEditor(content: TiptapNode): Editor {
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: getScreenplayExtensions(),
    content,
  })
  active.push(editor)
  return editor
}

afterEach(() => {
  while (active.length > 0) active.pop()?.destroy()
})

function selectNodeAt(editor: Editor, pos = 0) {
  const tr = editor.state.tr.setSelection(
    NodeSelection.create(editor.state.doc, pos),
  )
  editor.view.dispatch(tr)
}

function placeCursor(editor: Editor, pos = 1) {
  const tr = editor.state.tr.setSelection(
    TextSelection.create(editor.state.doc, pos),
  )
  editor.view.dispatch(tr)
}

function press(
  editor: Editor,
  key: string,
  mods: { ctrl?: boolean; shift?: boolean } = {},
) {
  editor.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ctrlKey: mods.ctrl ?? false,
      shiftKey: mods.shift ?? false,
    }),
  )
}

const text = (s: string) => ({ type: 'text', text: s }) as const
const block = (
  type: string,
  attrs: Record<string, unknown>,
  content?: unknown[],
) =>
  ({
    type,
    attrs,
    ...(content ? { content } : {}),
  }) as TiptapNode

describe('setScreenplayElement', () => {
  it('converts a text block to another text block, preserving text', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('Hello')])],
    })
    placeCursor(editor, 1)
    editor.commands.setScreenplayElement('dialogue')

    const doc = editor.getJSON()
    expect(doc.content[0]).toMatchObject({
      type: 'dialogue',
      content: [{ type: 'text', text: 'Hello' }],
    })
  })

  it('converts a text block to an atom character, uppercasing the name', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('John')])],
    })
    placeCursor(editor, 1)
    editor.commands.setScreenplayElement('character')

    const doc = editor.getJSON()
    expect(doc.content[0]).toMatchObject({
      type: 'character',
      attrs: { displayName: 'JOHN', characterId: null },
    })
  })

  it('converts an atom back to a text block, drawing text from its attrs', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        block('sceneHeading', {
          intExt: 'INT',
          location: 'POLICE STATION',
          timeOfDay: 'NIGHT',
        }),
      ],
    })
    selectNodeAt(editor, 0)
    editor.commands.setScreenplayElement('action')

    const doc = editor.getJSON()
    expect(doc.content[0]).toMatchObject({
      type: 'action',
      content: [{ type: 'text', text: 'INT. POLICE STATION - NIGHT' }],
    })
  })
})

describe('INT/EXT parsing on scene heading conversion', () => {
  it('sets EXT when the text starts with EXT.', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('EXT. PARK - NIGHT')])],
    })
    placeCursor(editor, 1)
    editor.commands.setScreenplayElement('sceneHeading')

    expect(editor.getJSON().content[0]).toMatchObject({
      type: 'sceneHeading',
      attrs: { intExt: 'EXT', location: 'PARK - NIGHT' },
    })
  })

  it('sets INT_EXT when the text starts with INT./EXT.', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('INT./EXT. ALLEY')])],
    })
    placeCursor(editor, 1)
    editor.commands.setScreenplayElement('sceneHeading')

    expect(editor.getJSON().content[0]).toMatchObject({
      type: 'sceneHeading',
      attrs: { intExt: 'INT_EXT', location: 'ALLEY' },
    })
  })

  it('sets INT when the text starts with a lowercase int.', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('int. warehouse')])],
    })
    placeCursor(editor, 1)
    editor.commands.setScreenplayElement('sceneHeading')

    expect(editor.getJSON().content[0]).toMatchObject({
      type: 'sceneHeading',
      attrs: { intExt: 'INT', location: 'warehouse' },
    })
  })

  it('defaults to INT when no marker is present', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('CUT TO:')])],
    })
    placeCursor(editor, 1)
    editor.commands.setScreenplayElement('sceneHeading')

    expect(editor.getJSON().content[0]).toMatchObject({
      type: 'sceneHeading',
      attrs: { intExt: 'INT', location: 'CUT TO:' },
    })
  })
})

describe('keyboard shortcuts (Ctrl/Cmd + 1..8)', () => {
  it('switches the block with Ctrl+2 (Action) and Ctrl+6 (Transition)', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('dialogue', { id: 'n1' }, [text('Get out.')])],
    })
    placeCursor(editor, 1)

    press(editor, '2', { ctrl: true })
    expect(editor.getJSON().content[0].type).toBe('action')

    press(editor, '6', { ctrl: true })
    expect(editor.getJSON().content[0].type).toBe('transition')
  })
})

describe('smart Enter (SPEC §22)', () => {
  it('sceneHeading → Action', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        block('sceneHeading', {
          intExt: 'EXT',
          location: 'STREET',
          timeOfDay: 'NIGHT',
        }),
      ],
    })
    selectNodeAt(editor, 0)
    press(editor, 'Enter')
    expect(editor.getJSON().content[0].type).toBe('action')
    expect(
      (editor.getJSON().content[0] as { content?: Array<{ text?: string }> })
        .content?.[0]?.text,
    ).toContain('EXT. STREET - NIGHT')
  })

  it('character → Dialogue', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('character', { displayName: 'JOHN', characterId: null })],
    })
    selectNodeAt(editor, 0)
    press(editor, 'Enter')
    expect(editor.getJSON().content[0].type).toBe('dialogue')
    expect(
      (editor.getJSON().content[0] as { content?: Array<{ text?: string }> })
        .content?.[0]?.text,
    ).toBe('JOHN')
  })

  it('dialogue → Action', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('dialogue', { id: 'n1' }, [text('Get out.')])],
    })
    placeCursor(editor, 1)
    press(editor, 'Enter')
    expect(editor.getJSON().content[0].type).toBe('action')
    expect(
      (editor.getJSON().content[0] as { content?: Array<{ text?: string }> })
        .content?.[0]?.text,
    ).toBe('Get out.')
  })

  it('parenthetical → Dialogue', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('parenthetical', { id: 'n1' }, [text('(whispering)')])],
    })
    placeCursor(editor, 1)
    press(editor, 'Enter')
    expect(editor.getJSON().content[0].type).toBe('dialogue')
  })

  it('transition → Scene Heading', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('transition', { transitionType: 'CUT TO:' })],
    })
    selectNodeAt(editor, 0)
    press(editor, 'Enter')
    expect(editor.getJSON().content[0].type).toBe('sceneHeading')
  })

  it('action keeps default Enter (new action block)', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('action', { id: 'n1' }, [text('Rain.')])],
    })
    placeCursor(editor, 1)
    press(editor, 'Enter')
    const doc = editor.getJSON()
    expect(doc.content.length).toBe(2)
    expect(doc.content[0].type).toBe('action')
    expect(doc.content[1].type).toBe('action')
  })
})

describe('element rendering (screenplay style)', () => {
  it('centers and bolds character, wrapping the label in parentheses', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        block('character', { displayName: 'JOHN', characterId: null }),
        block('character', {
          displayName: 'JOHN',
          characterId: null,
          extension: 'V.O.',
        }),
      ],
    })

    const [plain, voiced] = Array.from(
      editor.view.dom.querySelectorAll('[data-node-type="character"]'),
    ) as [HTMLElement, HTMLElement]
    expect(plain.className).toContain('text-center')
    expect(plain.className).toContain('font-bold')
    expect(plain.textContent).toBe('(JOHN)')
    expect(voiced.className).toContain('text-center')
    expect(voiced.className).toContain('font-bold')
    expect(voiced.textContent).toBe('(JOHN (V.O.))')
  })

  it('centers dialogue within its indent band', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('dialogue', { id: 'n1' }, [text('Hello.')])],
    })

    const node = editor.view.dom.querySelector(
      '[data-node-type="dialogue"]',
    ) as HTMLElement
    expect(node.className).toContain('text-center')
    expect(node.className).toContain('ml-32')
  })

  it('bolds and right-aligns transitions', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [block('transition', { transitionType: 'CUT TO:' })],
    })

    const node = editor.view.dom.querySelector(
      '[data-node-type="transition"]',
    ) as HTMLElement
    expect(node.className).toContain('text-right')
    expect(node.className).toContain('font-bold')
  })

  it('bolds and left-aligns scene headings', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        block('sceneHeading', {
          intExt: 'INT',
          location: 'POLICE STATION',
          timeOfDay: 'NIGHT',
        }),
      ],
    })

    const node = editor.view.dom.querySelector(
      '[data-node-type="sceneHeading"]',
    ) as HTMLElement
    expect(node.className).toContain('text-left')
    expect(node.className).toContain('font-bold')
  })
})
