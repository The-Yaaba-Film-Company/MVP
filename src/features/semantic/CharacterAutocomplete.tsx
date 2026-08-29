import { useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

import { toEntityOptions, useCreateEntity, useEntitySearch } from './queries'

interface ActiveCharacter {
  nodePos: number
  displayName: string
  left: number
  top: number
}

/**
 * Binds a Character node to its canonical character entity (SPEC §25–26):
 * when a character node is focused, offers the entities-search matches for
 * its typed name; selecting one (or creating a new entity for it) sets the
 * node's `characterId`, preventing JOHN / John duplicates.
 */
export function CharacterAutocomplete({
  editor,
  projectId,
}: {
  editor: Editor | null
  projectId: string
}) {
  const [active, setActive] = useState<ActiveCharacter | null>(null)

  useEffect(() => {
    if (!editor) return
    const sync = () => {
      const sel = editor.state.selection
      const selectedCharacter =
        sel instanceof NodeSelection && sel.node.type.name === 'character'
      const parent = sel.$from.parent
      if (!selectedCharacter && parent.type.name !== 'character') {
        setActive(null)
        return
      }
      const displayName = selectedCharacter
        ? (sel.node.attrs.displayName as string)
        : (parent.attrs.displayName as string)
      if (!displayName.trim()) {
        setActive(null)
        return
      }
      const nodePos = selectedCharacter ? sel.from : sel.$from.before()
      const coords = editor.view.coordsAtPos(nodePos)
      setActive({
        nodePos,
        displayName,
        left: coords.left,
        top: coords.bottom + 4,
      })
    }
    sync()
    editor.on('selectionUpdate', sync)
    editor.on('transaction', sync)
    return () => {
      editor.off('selectionUpdate', sync)
      editor.off('transaction', sync)
    }
  }, [editor])

  const query = active ? active.displayName.toLowerCase() : ''
  const { data } = useEntitySearch(projectId, 'character', query, !!active)
  const options = useMemo(() => toEntityOptions(data).filter(Boolean), [data])
  const createCharacter = useCreateEntity(projectId)

  const bind = (entity: { id: string; canonical_name: string }) => {
    if (!editor || !active) return
    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(active.nodePos, null, {
        characterId: entity.id,
        displayName: entity.canonical_name,
        extension: null,
      })
      return true
    })
    setActive(null)
  }

  if (!active) return null

  const pendingCreate = createCharacter.isPending

  return (
    <div
      data-testid="character-autocomplete"
      role="listbox"
      aria-label="Character autocomplete"
      className="fixed z-50 w-64 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
      style={{ left: active.left, top: active.top }}
    >
      {options.length === 0 && !pendingCreate ? (
        <p className="px-3 py-2 text-sm text-neutral-500">
          No matching characters.
        </p>
      ) : (
        options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="option"
            data-testid={`character-option-${option.id}`}
            onMouseDown={(e) => {
              e.preventDefault()
              bind(option)
            }}
            className="block w-full px-3 py-1 text-left text-sm hover:bg-neutral-100"
          >
            {option.canonical_name}
            {option.aliases.length > 0 ? (
              <span className="text-neutral-400">
                {' '}
                ({option.aliases.join(', ')})
              </span>
            ) : null}
          </button>
        ))
      )}
      <button
        type="button"
        role="option"
        data-testid="character-create"
        disabled={pendingCreate}
        onMouseDown={(e) => {
          e.preventDefault()
          const name = query.toUpperCase()
          createCharacter.mutate(
            { entity_type: 'character', canonical_name: name },
            {
              onSuccess: (entity) => {
                bind(entity)
              },
            },
          )
        }}
        className="block w-full border-t border-neutral-100 px-3 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pendingCreate
          ? 'Creating…'
          : `+ Create character “${query.toUpperCase()}”`}
      </button>
    </div>
  )
}
