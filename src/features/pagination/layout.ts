// Pure pagination engine (frontend spec §35–38). Input: ordered scenes as
// Tiptap fragments. Output: Page[] with continuation offsets, per-scene page
// metrics, and a runtime estimate (1 page ≈ 1 minute). No DOM or Worker
// involved — runs anywhere, which keeps it unit-testable and Worker-friendly.
import { LINES_PER_PAGE, charsPerLine, layoutFor, wrapText } from './geometry'
import type { ElementLayout, WrappedLine } from './geometry'
import { headingText } from '../writer/heading'
import type { IntExt, Scene, SceneMetrics, TiptapNode } from '#/api/types'

export interface PageBlock {
  nodeId: string
  /** Present only when the block is split across pages (spec §35). */
  startOffset?: number
  endOffset?: number
}

export interface Page {
  pageNumber: number
  blocks: PageBlock[]
}

export interface PaginationResult {
  pages: Page[]
  page_count: number
  runtime_minutes: number
  scene_metrics: SceneMetrics[]
}

export interface PaginationOptions {
  runtimePerPage?: number
}

const RUNTIME_PER_PAGE = 1

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function nodeText(node: TiptapNode): string {
  if (node.type === 'sceneHeading') {
    const attrs = node.attrs ?? {}
    return headingText(
      attrs.intExt as IntExt,
      attrs.location as string,
      attrs.timeOfDay as string,
      attrs.modifier as string | null,
    )
  }
  if (node.type === 'character') {
    return String(node.attrs?.displayName ?? '')
  }
  return (node.content ?? []).map((child) => child.text ?? '').join('')
}

interface WorkBlock {
  sceneId: string
  nodeId: string
  type: string
  layout: ElementLayout
  lines: WrappedLine[]
}

function buildBlocks(scenes: Scene[]): WorkBlock[] {
  const sorted = [...scenes].sort((a, b) => a.order_key - b.order_key)
  const blocks: WorkBlock[] = []
  for (const scene of sorted) {
    for (const [index, node] of (scene.content.content ?? []).entries()) {
      const layout = layoutFor(node.type)
      blocks.push({
        sceneId: scene.id,
        nodeId: String(node.attrs?.id ?? `${scene.id}-b${index}`),
        type: node.type,
        layout,
        lines: wrapText(nodeText(node), charsPerLine(layout)),
      })
    }
  }
  return blocks
}

function paginateBlocks(blocks: WorkBlock[]): Page[] {
  const pages: Page[] = []
  const usedLines: number[] = []
  let current = freshPage(pages, usedLines)

  const currentUsed = () => usedLines[current.pageNumber - 1]
  const addLines = (page: Page, count: number) => {
    usedLines[page.pageNumber - 1] += count
  }

  const placeWhole = (block: WorkBlock) => {
    current.blocks.push({ nodeId: block.nodeId })
    addLines(
      current,
      block.layout.topSpacing + block.layout.bottomSpacing + block.lines.length,
    )
  }

  // Fill the rest of the current page, then fresh pages, until the block's
  // body is placed. Top spacing is consumed before the first body lines;
  // continuation slices record their character offsets in the block.
  const placeSpanning = (block: WorkBlock) => {
    let from = 0
    let spacingToConsume = block.layout.topSpacing
    while (from < block.lines.length) {
      let avail = LINES_PER_PAGE - currentUsed()
      if (spacingToConsume > 0) {
        const takeSpace = Math.min(spacingToConsume, avail)
        addLines(current, takeSpace)
        spacingToConsume -= takeSpace
        avail -= takeSpace
      }
      const take = Math.min(block.lines.length - from, avail)
      if (take > 0) {
        if (from === 0 && from + take === block.lines.length) {
          current.blocks.push({ nodeId: block.nodeId })
        } else {
          current.blocks.push({
            nodeId: block.nodeId,
            startOffset: block.lines[from].start,
            endOffset: block.lines[from + take - 1].end,
          })
        }
        addLines(current, take)
        from += take
      }
      if (from < block.lines.length) {
        current = freshPage(pages, usedLines)
      }
    }
  }

  for (const block of blocks) {
    const height =
      block.layout.topSpacing + block.layout.bottomSpacing + block.lines.length

    if (currentUsed() === 0) {
      // Empty page never rejects a block, even one taller than a page.
      if (height <= LINES_PER_PAGE) placeWhole(block)
      else placeSpanning(block)
      continue
    }

    if (height <= LINES_PER_PAGE - currentUsed()) {
      placeWhole(block)
      continue
    }

    if (block.type === 'sceneHeading') {
      // Scene-aware break (spec §39): never cut a heading across pages.
      current = freshPage(pages, usedLines)
      placeWhole(block)
    } else {
      placeSpanning(block)
    }
  }

  // Drop the eagerly-created page when no content ever landed on it.
  return pages.filter((page) => page.blocks.length > 0)
}

function freshPage(pages: Page[], usedLines: number[]): Page {
  const page = { pageNumber: pages.length + 1, blocks: [] as PageBlock[] }
  pages.push(page)
  usedLines.push(0)
  return page
}

function sceneMetrics(
  scenes: Scene[],
  blocks: WorkBlock[],
  pages: Page[],
): SceneMetrics[] {
  const sceneOfNode = new Map(
    blocks.map((block) => [block.nodeId, block.sceneId]),
  )
  const pageNumbers = new Map<string, Set<number>>()
  const consumed = new Map<string, number>()

  for (const block of blocks) {
    consumed.set(
      block.sceneId,
      (consumed.get(block.sceneId) ?? 0) +
        block.layout.topSpacing +
        block.layout.bottomSpacing +
        block.lines.length,
    )
  }
  for (const page of pages) {
    for (const entry of page.blocks) {
      const sceneId = sceneOfNode.get(entry.nodeId)
      if (!sceneId) continue
      const set = pageNumbers.get(sceneId) ?? new Set<number>()
      set.add(page.pageNumber)
      pageNumbers.set(sceneId, set)
    }
  }

  const sorted = [...scenes].sort((a, b) => a.order_key - b.order_key)
  const metrics: SceneMetrics[] = []
  for (const scene of sorted) {
    const pagesFor = pageNumbers.get(scene.id)
    if (!pagesFor) continue
    const startPage = Math.min(...pagesFor)
    const endPage = Math.max(...pagesFor)
    metrics.push({
      scene_id: scene.id,
      start_page: startPage,
      end_page: endPage,
      page_length: round1((consumed.get(scene.id) ?? 0) / LINES_PER_PAGE),
    })
  }
  return metrics
}

export function paginateScenes(
  scenes: Scene[],
  options: PaginationOptions = {},
): PaginationResult {
  const runtimePerPage = options.runtimePerPage ?? RUNTIME_PER_PAGE
  const blocks = buildBlocks(scenes)
  const pages = paginateBlocks(blocks)
  return {
    pages,
    page_count: pages.length,
    runtime_minutes: Math.round(pages.length * runtimePerPage),
    scene_metrics: sceneMetrics(scenes, blocks, pages),
  }
}
