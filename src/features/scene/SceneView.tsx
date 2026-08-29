import { useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { useParams } from '@tanstack/react-router'
import { useScenes } from '../writer/queries'
import { headingFromContent } from '../writer/heading'
import { useWriterStore } from '../writer/store'
import { getScreenplayExtensions } from '../writer/schema'
import { usePaginationReport } from '../pagination/usePaginationReport'
import { useSemanticDecorations } from '../semantic/decorations'
import { SuggestionList } from '../semantic/SuggestionList'
import { ValidationPanel } from '../validation/ValidationPanel'
import type { Scene } from '#/api/types'

const SCENE_FROM =
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/scene'

function ReadOnlySceneDoc({
  scene,
  projectId,
}: {
  scene: Scene
  projectId: string
}) {
  const editor = useEditor({
    extensions: getScreenplayExtensions(scene.id),
    content: scene.content,
    editable: false,
    editorProps: {
      attributes: { 'data-testid': 'scene-editor', class: 'outline-none' },
    },
  })
  useSemanticDecorations(scene.id, editor)
  return (
    <>
      <EditorContent editor={editor} />
      <div className="mt-4 flex flex-col gap-3">
        <ValidationPanel sceneId={scene.id} editor={editor} />
        <SuggestionList sceneId={scene.id} projectId={projectId} />
      </div>
    </>
  )
}

export function SceneView() {
  const { projectId, screenplayId } = useParams({ from: SCENE_FROM })
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
    <div data-testid="scene-view" className="flex min-h-full">
      <section className="min-w-0 flex-1 px-8 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <span
            data-testid="scene-number"
            className="font-mono text-sm text-neutral-500"
          >
            {scene?.number ?? '–'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="scene-prev"
              disabled={!prev}
              onClick={() => prev && goTo(prev)}
              className="rounded border border-neutral-300 px-2.5 py-1 text-xs disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              data-testid="scene-next"
              disabled={!next}
              onClick={() => next && goTo(next)}
              className="rounded border border-neutral-300 px-2.5 py-1 text-xs disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        {scene ? (
          <>
            <h1
              data-testid="scene-heading"
              className="mb-2 text-xl font-semibold uppercase tracking-wide"
            >
              {headingFromContent(scene.content)}
            </h1>
            <div
              data-testid="scene-metadata"
              className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-500"
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
                <span className="text-amber-700">Locked</span>
              ) : null}
            </div>
            <ReadOnlySceneDoc
              key={scene.id}
              scene={scene}
              projectId={projectId}
            />
          </>
        ) : (
          <p className="text-neutral-500">No scene selected.</p>
        )}
      </section>
    </div>
  )
}
