import type { Editor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { findNodeRange } from '../semantic/offset'
import { useSceneValidation } from './queries'
import type { ValidationIssue, ValidationIssueType } from '#/api/types'

interface ValidationPanelProps {
  sceneId: string
  editor?: Editor | null
}

const TYPE_STYLES: Record<ValidationIssueType, string> = {
  error: 'border-red-200 text-red-700',
  warning: 'border-amber-200 text-amber-700',
  info: 'border-sky-200 text-sky-700',
}

const TYPE_DOT: Record<ValidationIssueType, string> = {
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
}

/**
 * Structural issue list for a scene (SPEC.md §6). Clicking an issue selects
 * (and scrolls to) the affected block node inside the optional editor.
 */
export function ValidationPanel({ sceneId, editor }: ValidationPanelProps) {
  const { data } = useSceneValidation(sceneId)
  const issues: ValidationIssue[] = data?.items ?? []

  function goTo(nodeId: string) {
    if (!editor || editor.isDestroyed) return
    const range = findNodeRange(editor.state.doc, nodeId)
    if (!range) return
    const { state, dispatch } = editor.view
    const selection = NodeSelection.create(state.doc, range.start)
    dispatch(
      state.tr
        .setSelection(selection)
        .scrollIntoView()
        .setMeta('addToHistory', false),
    )
    editor.commands.focus()
  }

  return (
    <div
      data-testid="validation-panel"
      className="w-full rounded-md border border-neutral-200 bg-neutral-50/60 p-2"
    >
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
          Validation ({issues.length})
        </span>
      </div>
      {issues.length === 0 ? (
        <p className="px-1 text-xs text-neutral-500">
          No structural issues detected.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {issues.map((issue) => (
            <li
              key={issue.id}
              data-testid={`validation-issue-${issue.id}`}
              className={`flex items-center gap-2 rounded border bg-white px-2 py-1 text-xs ${TYPE_STYLES[issue.type]}`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[issue.type]}`}
              />
              <button
                type="button"
                data-testid={`validation-goto-${issue.id}`}
                onClick={() => goTo(issue.node_id)}
                disabled={!editor}
                className="min-w-0 flex-1 text-left hover:underline disabled:no-underline"
              >
                {issue.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
