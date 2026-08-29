import { useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { api } from '#/api/client'
import { useScenes, sceneKeys } from './queries'
import { useWriterStore } from './store'
import { SceneEditor } from './SceneEditor'
import { headingFromContent } from './heading'
import type { Scene, TiptapNode } from '#/api/types'

const WRITER_FROM =
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/writer'

function defaultSceneContent(): TiptapNode {
  return {
    type: 'doc',
    content: [
      {
        type: 'sceneHeading',
        attrs: { intExt: 'INT', location: '', timeOfDay: '' },
      },
    ],
  }
}

export function WriterView() {
  const { projectId, screenplayId } = useParams({ from: WRITER_FROM })
  const { data } = useScenes(screenplayId)
  const queryClient = useQueryClient()
  const activeSceneId = useWriterStore((s) => s.activeSceneId)
  const setActiveSceneId = useWriterStore((s) => s.setActiveSceneId)

  const items = data ? data.items : []
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.order_key - b.order_key),
    [items],
  )
  useEffect(() => {
    // Pin the active scene once loaded so a reorder refetch (sorted[0] change)
    // can't silently switch the scene the user is editing.
    if (activeSceneId === null && sorted.length > 0) {
      setActiveSceneId(sorted[0].id)
    }
  }, [activeSceneId, sorted, setActiveSceneId])
  const active =
    sorted.length > 0
      ? (sorted.find((s) => s.id === activeSceneId) ?? sorted[0])
      : undefined

  const createScene = useMutation({
    mutationFn: () =>
      api.scenes.create(screenplayId, { content: defaultSceneContent() }),
    onSuccess: async (scene) => {
      setActiveSceneId(scene.id)
      await queryClient.invalidateQueries({
        queryKey: sceneKeys.list(screenplayId),
      })
    },
  })

  // Pessimistic reorder (SPEC §31): swap order_keys with the neighbor, then
  // refetch. Scene IDs are immutable; only order_key changes.
  const reorderScene = useMutation({
    mutationFn: ({ id, orderKey }: { id: string; orderKey: number }) =>
      api.scenes.reorder(id, { order_key: orderKey }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sceneKeys.list(screenplayId),
      })
    },
  })

  const moveScene = (sceneId: string, direction: 'up' | 'down') => {
    const index = sorted.findIndex((s) => s.id === sceneId)
    const neighbor = sorted[index + (direction === 'up' ? -1 : 1)] as
      Scene | undefined
    if (!neighbor || reorderScene.isPending) return
    reorderScene.mutate({ id: sceneId, orderKey: neighbor.order_key })
  }

  return (
    <div data-testid="writer-view" className="flex min-h-screen">
      <aside
        data-testid="scene-navigator"
        className="w-72 shrink-0 border-r border-neutral-200 bg-neutral-50"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Scenes
          </h2>
          <button
            type="button"
            data-testid="new-scene-button"
            onClick={() => createScene.mutate()}
            disabled={createScene.isPending}
            className="rounded bg-neutral-900 px-2.5 py-1 text-xs text-white disabled:opacity-50"
          >
            {createScene.isPending ? 'Adding…' : '+ Scene'}
          </button>
        </div>
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">
            No scenes yet. Add your first scene.
          </p>
        ) : (
          <ul>
            {sorted.map((scene, index) => {
              const isActive = active?.id === scene.id
              return (
                <li key={scene.id}>
                  <div
                    className={`flex items-stretch border-b border-neutral-100 ${
                      isActive ? 'bg-white' : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="flex flex-col justify-between py-1 pl-2">
                      <button
                        type="button"
                        aria-label={`Move ${scene.number ?? 'scene'} up`}
                        data-testid={`scene-move-up-${scene.id}`}
                        disabled={index === 0 || reorderScene.isPending}
                        onClick={() => moveScene(scene.id, 'up')}
                        className="px-1 text-xs text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${scene.number ?? 'scene'} down`}
                        data-testid={`scene-move-down-${scene.id}`}
                        disabled={
                          index === sorted.length - 1 || reorderScene.isPending
                        }
                        onClick={() => moveScene(scene.id, 'down')}
                        className="px-1 text-xs text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      type="button"
                      data-testid={`scene-item-${scene.id}`}
                      onClick={() => setActiveSceneId(scene.id)}
                      className="flex min-w-0 flex-1 items-baseline gap-2 px-2 py-2.5 text-left"
                    >
                      <span className="w-7 shrink-0 text-right text-xs font-semibold text-neutral-400">
                        {scene.number ?? '–'}
                      </span>
                      <span className="truncate text-sm">
                        {headingFromContent(scene.content)}
                      </span>
                      {scene.locked ? (
                        <span className="text-xs text-amber-600">Locked</span>
                      ) : null}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section className="min-w-0 flex-1">
        {active ? (
          <SceneEditor
            key={active.id}
            scene={active}
            screenplayId={screenplayId}
            projectId={projectId}
            onNewScene={() => createScene.mutate()}
          />
        ) : (
          <div className="px-8 py-16 text-neutral-500">
            Select a scene to start writing.
          </div>
        )}{' '}
      </section>
    </div>
  )
}
