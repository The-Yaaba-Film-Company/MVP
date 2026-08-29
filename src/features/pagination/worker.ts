// Pagination off the main thread when a Worker is available (SPEC.md §9).
// jsdom tests lack `Worker`, so `computePagination` transparently falls back
// to the in-process engine — the same pure algorithm either way.
import { paginateScenes } from './layout'
import type { PaginationOptions, PaginationResult } from './layout'
import type { Scene } from '#/api/types'

export interface LayoutWorkerMessage {
  scenes: Scene[]
  options: PaginationOptions
}

export type { Page, PaginationOptions, PaginationResult } from './layout'

export function computePaginationInProcess(
  scenes: Scene[],
  options: PaginationOptions = {},
): PaginationResult {
  return paginateScenes(scenes, options)
}

function computeInWorker(
  scenes: Scene[],
  options: PaginationOptions,
): Promise<PaginationResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<PaginationResult>) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'pagination worker failed'))
    }
    const payload: LayoutWorkerMessage = { scenes, options }
    worker.postMessage(payload)
  })
}

export function computePagination(
  scenes: Scene[],
  options: { useWorker?: boolean } & PaginationOptions = {},
): Promise<PaginationResult> {
  const useWorker = options.useWorker ?? typeof Worker !== 'undefined'
  if (!useWorker)
    return Promise.resolve(computePaginationInProcess(scenes, options))
  return computeInWorker(scenes, options)
}
