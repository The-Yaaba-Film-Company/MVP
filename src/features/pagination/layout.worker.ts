// Web Worker entry for the pagination engine. Imported via
// `new Worker(new URL(...), { type: 'module' })` and bundled by Vite; never
// imported directly by app/test code.
import { paginateScenes } from './layout'
import type { LayoutWorkerMessage } from './worker'
import type { PaginationResult } from './layout'

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<LayoutWorkerMessage>) => void) | null
  postMessage: (data: PaginationResult) => void
}

ctx.onmessage = (event) => {
  const { scenes, options } = event.data
  ctx.postMessage(paginateScenes(scenes, options))
}
