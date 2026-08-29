import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { useEffect } from 'react'
import { useAnnotations, useAiSuggestions } from './queries'
import { spanToPos } from './offset'
import type { TextSpan } from './offset'

export const ANNOTATION_CLASS = 'semantic-annotation'
export const SUGGESTION_CLASS = 'semantic-suggestion'

export interface SemanticSpan extends TextSpan {
  kind: 'annotation' | 'suggestion'
  id: string
}

// Per-scene span cache the plugin reads on every transaction. React hooks
// write it; the ProseMirror plugin never touches the document itself
// (Text ≠ Formatting ≠ Semantic Entity, SPEC §59).
const spanRegistry = new Map<string, SemanticSpan[]>()

export function setSemanticSpans(sceneId: string, spans: SemanticSpan[]): void {
  spanRegistry.set(sceneId, spans)
}

export function clearSemanticSpans(sceneId: string): void {
  spanRegistry.delete(sceneId)
}

export function getSemanticSpans(sceneId: string): SemanticSpan[] {
  return spanRegistry.get(sceneId) ?? []
}

export interface SemanticSpanSpec {
  spanClass: string
  spanId: string
}

function toDecoration(doc: PMNode, span: SemanticSpan): Decoration | null {
  const range = spanToPos(doc, span)
  if (!range) return null
  const spanClass =
    span.kind === 'annotation' ? ANNOTATION_CLASS : SUGGESTION_CLASS
  const spec: SemanticSpanSpec = { spanClass, spanId: span.id }
  return Decoration.inline(
    range.from,
    range.to,
    { class: spanClass, 'data-span-id': span.id },
    spec,
  )
}

/** Compute the decorSet for one scene's cached spans. Pure and testable. */
export function buildDecorationSet(
  doc: PMNode,
  spans: SemanticSpan[],
): DecorationSet {
  const decos: Decoration[] = []
  for (const span of spans) {
    const deco = toDecoration(doc, span)
    if (deco) decos.push(deco)
  }
  return DecorationSet.create(doc, decos)
}

/** Tiptap extension; configure with the sceneId the editor is mounted for. */
export const semanticDecorations = Extension.create<{ sceneId: string }>({
  name: 'semanticDecorations',
  addOptions() {
    return { sceneId: '' }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) =>
            buildDecorationSet(
              state.doc,
              getSemanticSpans(this.options.sceneId),
            ),
        },
      }),
    ]
  },
})

/**
 * Feed the annotations + pending AI-suggestion caches into the decoration
 * registry and force a dry (doc-unchanged) transaction so the view redraws.
 * Runs in both the editable Writer editor and the read-only Scene view.
 *
 * NOTE: the registry is populated asynchronously after the editor's view
 * exists (data always arrives post-mount), so the dispatch below always has a
 * live view; decorations() also re-reads the registry on every later
 * transaction (typing, selection), keeping the overlay fresh.
 */
export function useSemanticDecorations(
  sceneId: string | undefined,
  editor: Editor | null,
) {
  const { data: annotations } = useAnnotations(sceneId)
  const { data: suggestions } = useAiSuggestions(sceneId)

  useEffect(() => {
    if (!sceneId || !editor) return
    const spans: SemanticSpan[] = [
      ...(annotations?.items ?? []).map((a) => ({
        node_id: a.node_id,
        start_offset: a.start_offset,
        end_offset: a.end_offset,
        kind: 'annotation' as const,
        id: a.id,
      })),
      ...(suggestions?.items ?? [])
        .filter((s) => s.status === 'pending')
        .map((s) => ({
          node_id: s.node_id,
          start_offset: s.start_offset ?? -1,
          end_offset: s.end_offset ?? -1,
          kind: 'suggestion' as const,
          id: s.id,
        })),
    ]
    setSemanticSpans(sceneId, spans)
    // Recompute decorations without touching the document (SPEC §59).
    editor.view.dispatch(editor.state.tr)
  }, [annotations, editor, sceneId, suggestions])

  useEffect(() => {
    if (!sceneId) return
    return () => clearSemanticSpans(sceneId)
  }, [sceneId])
}
