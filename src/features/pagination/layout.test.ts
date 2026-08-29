import { describe, expect, it } from 'vitest'
import { buildScene } from '#/api/mocks/fixtures'
import { charsPerLine, layoutFor, LINES_PER_PAGE, wrapText } from './geometry'
import { paginateScenes } from './layout'
import type { Scene, TiptapNode } from '#/api/types'

function headingNode(
  intExt: 'INT' | 'EXT',
  location: string,
  timeOfDay: string,
): TiptapNode {
  return { type: 'sceneHeading', attrs: { intExt, location, timeOfDay } }
}

function textNode(type: string, text: string, id: string): TiptapNode {
  return { type, attrs: { id }, content: [{ type: 'text', text }] }
}

function scene(id: string, order: number, ...content: TiptapNode[]): Scene {
  return buildScene({
    id,
    order_key: order,
    number: String(order),
    content: { type: 'doc', content },
  })
}

describe('geometry (§33–34)', () => {
  it('carves the page into 54 Courier lines', () => {
    expect(LINES_PER_PAGE).toBe(54)
  })

  it('derives element widths from the margin table', () => {
    expect(charsPerLine(layoutFor('action'))).toBe(60)
    expect(charsPerLine(layoutFor('character'))).toBe(40)
    expect(charsPerLine(layoutFor('dialogue'))).toBe(35)
    expect(charsPerLine(layoutFor('transition'))).toBe(45)
    expect(layoutFor('sceneHeading').topSpacing).toBe(2)
    expect(layoutFor('unknownType')).toBe(layoutFor('action'))
  })

  it('wraps monospace text on word boundaries with contiguous offsets', () => {
    const lines = wrapText('Hello world, this is a screenplay', 10)
    expect(lines.map((line) => line.text)).toEqual([
      'Hello',
      'world,',
      'this is a',
      'screenplay',
    ])
    expect(lines[2]).toEqual({ text: 'this is a', start: 13, end: 22 })
    expect(lines[lines.length - 1].end).toBe(
      'Hello world, this is a screenplay'.length,
    )
    expect(wrapText('', 60)).toEqual([{ text: '', start: 0, end: 0 }])
  })
})

describe('paginateScenes (§35–38)', () => {
  it('lays out two short scenes on a single page with per-scene metrics', () => {
    const result = paginateScenes([
      scene(
        's1',
        1,
        headingNode('INT', 'POLICE STATION', 'NIGHT'),
        textNode('action', 'John enters.', 's1-action'),
      ),
      scene(
        's2',
        2,
        headingNode('EXT', 'PARK', 'DAY'),
        textNode('action', 'Caroline runs.', 's2-action'),
      ),
    ])

    expect(result.page_count).toBe(1)
    expect(result.runtime_minutes).toBe(1)
    expect(result.scene_metrics).toEqual([
      { scene_id: 's1', start_page: 1, end_page: 1, page_length: 0.1 },
      { scene_id: 's2', start_page: 1, end_page: 1, page_length: 0.1 },
    ])
    expect(result.pages[0].blocks).toHaveLength(4)
    expect(result.pages[0].blocks[0]).toEqual({ nodeId: 's1-b0' })
  })

  it('estimates runtime as pages × runtimePerPage', () => {
    const onePage = paginateScenes(
      [
        scene(
          's1',
          1,
          headingNode('INT', 'A', 'DAY'),
          textNode('action', 'Hi.', 'a1'),
        ),
      ],
      { runtimePerPage: 2 },
    )
    expect(onePage.runtime_minutes).toBe(2)
  })

  it('splits an over-page block across pages and records continuation offsets', () => {
    const result = paginateScenes([
      scene(
        's1',
        1,
        headingNode('INT', 'A', 'DAY'),
        textNode('action', 'A'.repeat(3200), 'act1'),
      ),
    ])

    expect(result.page_count).toBe(2)
    expect(result.scene_metrics[0]).toEqual({
      scene_id: 's1',
      start_page: 1,
      end_page: 2,
      page_length: 1.1,
    })
    expect(result.pages[0].blocks[1]).toEqual({
      nodeId: 'act1',
      startOffset: 0,
      endOffset: 3060,
    })
    expect(result.pages[1].blocks[0]).toEqual({
      nodeId: 'act1',
      startOffset: 3060,
      endOffset: 3200,
    })
  })

  it('never cuts a scene heading across pages (scene-aware break)', () => {
    const result = paginateScenes([
      scene(
        's1',
        1,
        headingNode('INT', 'A', 'DAY'),
        textNode('action', 'A'.repeat(3060), 'act1'),
        headingNode('EXT', 'B', 'NIGHT'),
      ),
    ])

    expect(result.page_count).toBe(2)
    expect(result.pages[0].blocks.map((b) => b.nodeId)).toEqual([
      's1-b0',
      'act1',
    ])
    expect(result.pages[1].blocks[0].nodeId).toBe('s1-b2')
  })

  it('continues element lines onto the next page with character offsets', () => {
    const result = paginateScenes([
      scene(
        's1',
        1,
        headingNode('INT', 'A', 'DAY'),
        textNode('action', 'A'.repeat(3000), 'act1'),
        textNode('dialogue', 's'.repeat(141), 'dlg1'),
      ),
    ])

    expect(result.page_count).toBe(2)
    expect(result.pages[0].blocks[2]).toEqual({
      nodeId: 'dlg1',
      startOffset: 0,
      endOffset: 35,
    })
    expect(result.pages[1].blocks[0]).toEqual({
      nodeId: 'dlg1',
      startOffset: 35,
      endOffset: 141,
    })
  })

  it('extracts text from character atoms and scene heading attrs', () => {
    const result = paginateScenes([
      scene(
        's1',
        1,
        headingNode('INT', 'A', 'DAY'),
        {
          type: 'character',
          attrs: { id: 'ch1', displayName: 'JOHN', characterId: null },
        },
        textNode('dialogue', 'Hello there.', 'd1'),
      ),
    ])

    expect(result.page_count).toBe(1)
    expect(result.pages[0].blocks.map((b) => b.nodeId)).toEqual([
      's1-b0',
      'ch1',
      'd1',
    ])
  })

  it('omits metrics for scenes with no content', () => {
    const empty = buildScene({
      id: 's0',
      order_key: 1,
      content: { type: 'doc', content: [] },
    })
    const result = paginateScenes([empty])
    expect(result.page_count).toBe(0)
    expect(result.runtime_minutes).toBe(0)
    expect(result.scene_metrics).toEqual([])
  })
})
