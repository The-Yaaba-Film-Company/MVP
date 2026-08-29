// Client-measured, server-cached pagination (SPEC.md §9). Measures the screen-
// play in a Web Worker, fills the `pagination` query cache optimistically, and
// publishes the summary for the server's non-authoritative cache.
import { useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '#/api/client'
import { reportKeys, usePaginationSummary } from '../reports/queries'
import { useScenes } from '../writer/queries'
import { computePagination } from './worker'
import type { PaginationReport, Scene } from '#/api/types'

export const PAGINATION_PUBLISH_DEBOUNCE_MS = 400

let publishDebounceMs = PAGINATION_PUBLISH_DEBOUNCE_MS

/** Test seam — collapse the recompute debounce like useSceneAutosave. */
export function setPaginationPublishDebounceMs(ms: number): void {
  publishDebounceMs = ms
}

function publishSummary(
  screenplayId: string,
  scenes: Scene[],
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  // Cache-sync is best-effort: the measured report always reaches the view,
  // and the server copy is recomputed on the next edit anyway (SPEC.md §9).
  void (async () => {
    const result = await computePagination(scenes)
    const report: PaginationReport = {
      page_count: result.page_count,
      runtime_minutes: result.runtime_minutes,
      scene_metrics: result.scene_metrics,
    }
    queryClient.setQueryData(reportKeys.pagination(screenplayId), report)
    try {
      await api.reports.updatePagination(screenplayId, report)
    } catch {
      /* server cache is non-authoritative — refreshed on the next change */
    }
  })()
}

export function usePaginationReport(screenplayId: string) {
  const summary = usePaginationSummary(screenplayId)
  const { data: scenesData } = useScenes(screenplayId)
  const queryClient = useQueryClient()
  const scenes = scenesData?.items

  // content_hash is bumped on every scene save, so this signature covers both
  // edits and reorders. Stable by value — never publishes the same doc twice.
  const signature = useMemo(
    () =>
      (scenes ?? [])
        .map((scene) => `${scene.id}:${scene.order_key}:${scene.content_hash}`)
        .join('|'),
    [scenes],
  )
  const lastPublished = useRef(signature)

  useEffect(() => {
    if (!scenes?.length || signature === lastPublished.current) return
    const timer = window.setTimeout(() => {
      lastPublished.current = signature
      publishSummary(screenplayId, scenes, queryClient)
    }, publishDebounceMs)
    return () => window.clearTimeout(timer)
  }, [scenes, signature, screenplayId, queryClient])

  return summary
}
