import { useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { useParams } from '@tanstack/react-router'
import { useScenes } from '../writer/queries'
import { headingFromContent } from '../writer/heading'
import { useWriterStore } from '../writer/store'
import { getScreenplayExtensions } from '../writer/schema'
import { usePaginationReport } from '../pagination/usePaginationReport'
import { useSemanticDecorations } from '../semantic/decorations'
import { ValidationPanel } from '../validation/ValidationPanel'
import type { Scene } from '#/api/types'

const SCENE_FROM =
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/scene'

function ReadOnlySceneDoc({ scene }: { scene: Scene }) {
  const editor = useEditor({
    extensions: getScreenplayExtensions(scene.id),
    content: scene.content,
    editable: false,
    editorProps: {
      attributes: {
        'data-testid': 'scene-editor',
        class: 'script-body outline-none',
      },
    },
  })
  useSemanticDecorations(scene.id, editor)
  return (
    <>
      <div className="rounded-lg border border-paper-300 bg-white px-8 pt-4 shadow-sm">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <ValidationPanel sceneId={scene.id} editor={editor} />
      </div>
    </>
  )
}

export function SceneView() {
  const { screenplayId } = useParams({ from: SCENE_FROM })
  const { data } = useScenes(screenplayId)
  const { data: pagination } = usePaginationReport(screenplayId)
  const activeSceneId = useWriterStore((s) => s.activeSceneId)
  const setActiveSceneId = useWriterStore((s) => s.setActiveSceneId)

  const scenes = useMemo(() => (data ? data.items : []), [data])
  const rawIndex = scenes.findIndex((s) => s.id === activeSceneId)
  const index = useMemo(() => Math.max(0, rawIndex), [rawIndex])
  const scene: Scene | undefined = useMemo(
    () => (scenes.length > 0 ? scenes[index] : undefined),
    [scenes, index],
  )
  const [prev, next] = useMemo(
    () => [
      index > 0 ? scenes[index - 1] : undefined,
      index < scenes.length - 1 ? scenes[index + 1] : undefined,
    ],
    [scenes, index],
  )

  const metrics = useMemo(
    () =>
      new Map((pagination?.scene_metrics ?? []).map((m) => [m.scene_id, m])),
    [pagination],
  )
  const sceneMetric = scene ? metrics.get(scene.id) : undefined

  const goTo = (target: Scene) => {
    setActiveSceneId(target.id)
  }

  return (
    <div data-testid="scene-view" className="flex min-h-0 flex-1">
      <section className="min-w-0 flex-1 px-8 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <span
            data-testid="scene-number"
            className="font-mono text-sm text-clay-700"
          >
            {scene?.number ?? '–'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="scene-prev"
              disabled={!prev}
              onClick={() => prev && goTo(prev)}
              className="rounded-md border border-paper-300 bg-white px-2.5 py-1 text-xs text-ink-700 hover:border-clay-500 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              data-testid="scene-next"
              disabled={!next}
              onClick={() => next && goTo(next)}
              className="rounded-md border border-paper-300 bg-white px-2.5 py-1 text-xs text-ink-700 hover:border-clay-500 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        {scene ? (
          <>
            <h1
              data-testid="scene-heading"
              className="mb-2 font-serif text-2xl font-medium uppercase tracking-wide text-ink-900"
            >
              {headingFromContent(scene.content)}
            </h1>
            <div
              data-testid="scene-metadata"
              className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-500"
            >
              <span>
                Pages {pagination?.page_count ?? '–'} · ~
                {pagination?.runtime_minutes ?? '–'} min
              </span>
              <span data-testid="scene-pages">
                Scene pages:{' '}
                {sceneMetric
                  ? `${sceneMetric.start_page}–${sceneMetric.end_page}`
                  : '–'}
              </span>
              {scene.locked ? (
                <span className="rounded-md border border-ochre-600/40 bg-ochre-100 px-1.5 py-0.5 text-xs text-ochre-600">
                  Locked
                </span>
              ) : null}
            </div>
            <ReadOnlySceneDoc key={scene.id} scene={scene} />
          </>
        ) : (
          <p className="text-ink-500">No scene selected.</p>
        )}
      </section>
    </div>
  )
}
