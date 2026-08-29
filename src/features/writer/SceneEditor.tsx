import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { getScreenplayExtensions } from './schema'
import { useSceneAutosave } from './useSceneAutosave'
import { SlashCommandMenu } from './SlashCommandMenu'
import { slashItems } from './elements'
import { useSemanticDecorations } from '../semantic/decorations'
import { TagMenu } from '../semantic/TagMenu'
import { EntityPicker } from '../semantic/EntityPicker'
import { SuggestionList } from '../semantic/SuggestionList'
import { CharacterAutocomplete } from '../semantic/CharacterAutocomplete'
import { selectionToSpan } from '../semantic/offset'
import { useCreateAnnotation, useCreateEntity } from '../semantic/queries'
import type { TextSpan } from '../semantic/offset'
import type { EntityType, Scene } from '#/api/types'

interface SlashState {
  query: string
  index: number
  left: number
  top: number
}

interface SceneEditorProps {
  scene: Scene
  screenplayId: string
  projectId: string
  onNewScene?: () => void
}

export function SceneEditor({
  scene,
  screenplayId,
  projectId,
  onNewScene,
}: SceneEditorProps) {
  const save = useSceneAutosave(scene, screenplayId)
  const createAnnotation = useCreateAnnotation(scene.id)
  const createEntity = useCreateEntity(projectId)

  const [slash, setSlash] = useState<SlashState | null>(null)
  const slashRef = useRef<SlashState | null>(null)
  slashRef.current = slash

  // Tag flow (SPEC §27–28): a capture of the selection as offsets plus the
  // chosen entity type (null while the type menu is showing).
  const [tag, setTag] = useState<{
    span: TextSpan
    left: number
    top: number
  } | null>(null)
  const [tagType, setTagType] = useState<EntityType | null>(null)
  const tagRef = useRef<{ span: TextSpan } | null>(null)
  tagRef.current = tag

  const onNewSceneRef = useRef(onNewScene)
  onNewSceneRef.current = onNewScene

  const editor = useEditor({
    extensions: getScreenplayExtensions(scene.id),
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
        // Ctrl/Cmd + Shift + T — tag selected text (SPEC §28).
        if (
          event.key.toLowerCase() === 't' &&
          event.shiftKey &&
          (event.metaKey || event.ctrlKey) &&
          !slashRef.current &&
          !tagRef.current
        ) {
          openTag(editor)
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

  useSemanticDecorations(scene.id, editor)

  function openSlash(ed: Exclude<typeof editor, null>) {
    const coords = ed.view.coordsAtPos(ed.state.selection.from)
    setSlash({ query: '', index: 0, left: coords.left, top: coords.bottom + 4 })
  }

  function openTag(ed: Exclude<typeof editor, null>) {
    const span = selectionToSpan(ed.state.selection)
    if (!span) return
    const coords = ed.view.coordsAtPos(ed.state.selection.from)
    setTag({ span, left: coords.left, top: coords.bottom + 4 })
    setTagType(null)
  }

  function closeTag() {
    setTag(null)
    setTagType(null)
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

  const tagSpan = tag?.span
  const pickEntity = (entityId: string) => {
    if (!tagSpan) return
    createAnnotation.mutate({
      node_id: tagSpan.node_id,
      start_offset: tagSpan.start_offset,
      end_offset: tagSpan.end_offset,
      entity_id: entityId,
    })
    closeTag()
  }

  const createAndTag = (payload: {
    entity_type: EntityType
    canonical_name: string
  }) => {
    if (!tagSpan) return
    createEntity.mutate(payload, {
      onSuccess: (entity) => {
        createAnnotation.mutate({
          node_id: tagSpan.node_id,
          start_offset: tagSpan.start_offset,
          end_offset: tagSpan.end_offset,
          entity_id: entity.id,
        })
      },
    })
    closeTag()
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
      <div className="px-8 pt-3">
        <SuggestionList sceneId={scene.id} projectId={projectId} />
      </div>
      <EditorContent editor={editor} />
      <CharacterAutocomplete editor={editor} projectId={projectId} />
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
      {tag && !tagType ? (
        <TagMenu
          left={tag.left}
          top={tag.top}
          onSelect={(type) => setTagType(type)}
          onClose={closeTag}
        />
      ) : null}
      {tag && tagType ? (
        <EntityPicker
          projectId={projectId}
          type={tagType}
          left={tag.left}
          top={tag.top}
          onPick={pickEntity}
          onCreate={createAndTag}
          onClose={closeTag}
        />
      ) : null}
    </div>
  )
}
