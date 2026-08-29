import { describe, expect, it } from 'vitest'
import { buildScene } from '#/api/mocks/fixtures'
import { computePagination } from './worker'
import type { Scene } from '#/api/types'

describe('computePagination worker orchestration', () => {
  const scenes: Scene[] = [
    buildScene({
      id: 'scene-1',
      order_key: 1,
      content: {
        type: 'doc',
        content: [
          {
            type: 'sceneHeading',
            attrs: { intExt: 'INT', location: 'A', timeOfDay: 'DAY' },
          },
        ],
      },
    }),
  ]

  it('runs in-process when no Worker exists (jsdom/test path)', async () => {
    const result = await computePagination(scenes)
    expect(result.page_count).toBe(1)
    expect(result.runtime_minutes).toBe(1)
  })

  it('honours an explicit in-process request', async () => {
    const result = await computePagination(scenes, { useWorker: false })
    expect(result.pages[0].blocks[0].nodeId).toBe('scene-1-b0')
  })
})
