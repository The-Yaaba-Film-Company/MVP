import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { getScreenplayExtensions } from './schema'
import { useSceneAutosave } from './useSceneAutosave'
import { SlashCommandMenu } from './SlashCommandMenu'
import { slashItems } from './elements'
import type { Scene } from '#/api/types'

interface SlashState {
  query: string
  index: number
  left: number
  top: number
}

interface SceneEditorProps {
  scene: Scene
  screenplayId: string
  onNewScene?: () => void
}

export function SceneEditor({
  scene,
  screenplayId,
  onNewScene,
}: SceneEditorProps) {
  const save = useSceneAutosave(scene, screenplayId)
  const [slash, setSlash] = useState<SlashState | null>(null)
  const slashRef = useRef<SlashState | null>(null)
  slashRef.current = slash
  const onNewSceneRef = useRef(onNewScene)
  onNewSceneRef.current = onNewScene

  const editor = useEditor({
    extensions: getScreenplayExtensions(),
    content: scene.content,
    editable: !scene.locked,
    editorProps: {
      attributes: {
        'data-testid': 'scene-editor',
        class: 'min-h-[60vh] px-8 pb-24 pt-4 outline-none',
      },
      handleKeyDown: (_view, event) => {
        // Ctrl/Cmd + Shift + N — new scene (SPEC §29).
        if (
          event.key.toLowerCase() === 'n' &&
          event.shiftKey &&
          (event.metaKey || event.ctrlKey) &&
          !slashRef.current
        ) {
          onNewSceneRef.current?.()
          return true
        }
        if (slashRef.current) return handleSlashKey(event)
        // Open the slash command menu from an editable text block (SPEC §24).
        if (
          event.key === '/' &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          const { $from } = editor.state.selection
          if ($from.parent.isTextblock) {
            event.preventDefault()
            openSlash(editor)
            return true
          }
        }
        return false
      },
    },
  })

  function openSlash(ed: Exclude<typeof editor, null>) {
    const coords = ed.view.coordsAtPos(ed.state.selection.from)
    setSlash({ query: '', index: 0, left: coords.left, top: coords.bottom + 4 })
  }

  function handleSlashKey(event: KeyboardEvent): boolean {
    const current = slashRef.current
    if (!current) return false
    const items = slashItems(current.query)

    switch (event.key) {
      case 'Escape':
        setSlash(null)
        return true
      case 'ArrowDown':
        if (items.length > 0)
          setSlash({ ...current, index: (current.index + 1) % items.length })
        return true
      case 'ArrowUp':
        if (items.length > 0)
          setSlash({
            ...current,
            index: (current.index - 1 + items.length) % items.length,
          })
        return true
      case 'Enter': {
        if (items.length === 0) {
          setSlash(null)
          return true
        }
        applyElement(items[current.index].type)
        return true
      }
      case 'Backspace':
        if (!current.query) setSlash(null)
        else
          setSlash((prev) =>
            prev ? { ...prev, query: prev.query.slice(0, -1), index: 0 } : prev,
          )
        return true
      default:
        if (
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          // Functional update composes rapid keystrokes (React may not flush
          // a render between back-to-back keydowns).
          setSlash((prev) =>
            prev ? { ...prev, query: prev.query + event.key, index: 0 } : prev,
          )
          return true
        }
        return false
    }
  }

  function applyElement(type: string) {
    editor.chain().focus().setScreenplayElement(type).run()
    setSlash(null)
  }

  useEffect(() => {
    save.editorRef.current = editor
    editor.on('update', save.schedule)
    editor.on('blur', save.flush)
    return () => {
      if (!editor.isDestroyed) save.flush()
      editor.off('update', save.schedule)
      editor.off('blur', save.flush)
      save.editorRef.current = null
    }
  }, [editor, save, scene.id])

  useEffect(() => {
    editor.setEditable(!scene.locked)
  }, [editor, scene.locked])

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 flex items-center justify-end gap-3 border-b border-neutral-200 bg-white px-4 py-1.5 text-xs text-neutral-500">
        <span data-testid="save-status">
          {save.conflict
            ? 'Conflict — server version restored'
            : save.error
              ? 'Save failed'
              : save.saving
                ? 'Saving…'
                : 'Saved'}
        </span>
        {scene.locked ? (
          <span
            data-testid="locked-badge"
            className="rounded bg-amber-100 px-2 py-0.5 text-amber-800"
          >
            Locked
          </span>
        ) : null}
      </div>
      {save.conflict ? (
        <p
          role="alert"
          data-testid="save-conflict"
          className="px-8 pt-2 text-sm text-amber-700"
        >
          Your local edits were discarded and replaced with the server's
          version.
        </p>
      ) : null}
      {save.error && !save.conflict ? (
        <p
          role="alert"
          data-testid="save-error"
          className="px-8 pt-2 text-sm text-red-600"
        >
          Could not save your changes. They were reverted.
        </p>
      ) : null}
      <EditorContent editor={editor} />
      {slash ? (
        <SlashCommandMenu
          items={slashItems(slash.query)}
          activeIndex={Math.min(
            slash.index,
            Math.max(0, slashItems(slash.query).length - 1),
          )}
          left={slash.left}
          top={slash.top}
          onSelect={applyElement}
        />
      ) : null}
    </div>
  )
}
