// Layout geometry for the pagination engine (frontend spec §33–34).
// Courier 12pt is monospaced, so "measurement" is char-count per element
// width; the engine never guesses pages from raw character count alone.

export const PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  leftIn: 1.5,
  rightIn: 1,
  topIn: 1,
  bottomIn: 1,
  fontSizePt: 12,
  charAdvancePt: 7.2,
  lineHeightPt: 12,
} as const

export const LINE_HEIGHT_IN = PAGE.lineHeightPt / 72

/** Spec §33 — 9" of usable height at 12pt lines. */
export const LINES_PER_PAGE = Math.floor(
  (PAGE.heightIn - PAGE.topIn - PAGE.bottomIn) / LINE_HEIGHT_IN,
)

export interface ElementLayout {
  leftIn: number
  rightIn: number
  topSpacing: number
  bottomSpacing: number
  alignment: 'left' | 'center' | 'right'
}

// Traditional screenplay geometry (spec §34). Spacing is measured in blank
// lines: scene headings need two clear lines above, dialogue's character line
// gets one.
export const ELEMENT_LAYOUT: Record<string, ElementLayout> = {
  sceneHeading: {
    leftIn: 1.5,
    rightIn: 1,
    topSpacing: 2,
    bottomSpacing: 0,
    alignment: 'left',
  },
  action: {
    leftIn: 1.5,
    rightIn: 1,
    topSpacing: 0,
    bottomSpacing: 0,
    alignment: 'left',
  },
  general: {
    leftIn: 1.5,
    rightIn: 1,
    topSpacing: 0,
    bottomSpacing: 0,
    alignment: 'left',
  },
  shot: {
    leftIn: 1.5,
    rightIn: 1,
    topSpacing: 1,
    bottomSpacing: 0,
    alignment: 'left',
  },
  character: {
    leftIn: 2.25,
    rightIn: 2.25,
    topSpacing: 1,
    bottomSpacing: 0,
    alignment: 'center',
  },
  dialogue: {
    leftIn: 3,
    rightIn: 2,
    topSpacing: 0,
    bottomSpacing: 0,
    alignment: 'left',
  },
  parenthetical: {
    leftIn: 3.5,
    rightIn: 2.5,
    topSpacing: 0,
    bottomSpacing: 0,
    alignment: 'left',
  },
  transition: {
    leftIn: 4,
    rightIn: 0,
    topSpacing: 1,
    bottomSpacing: 0,
    alignment: 'right',
  },
}

export function layoutFor(type: string): ElementLayout {
  return ELEMENT_LAYOUT[type] ?? ELEMENT_LAYOUT.action
}

export function charsPerLine(layout: ElementLayout): number {
  const widthPt = (PAGE.widthIn - layout.leftIn - layout.rightIn) * 72
  return Math.max(1, Math.floor(widthPt / PAGE.charAdvancePt))
}

export interface WrappedLine {
  text: string
  /** Character offset of the line within the (whitespace-normalized) text. */
  start: number
  end: number
}

/** Greedy monospace wrap. Long words hard-break; offsets stay contiguous. */
export function wrapText(text: string, maxChars: number): WrappedLine[] {
  const normalized = text.split(/\s+/).filter(Boolean).join(' ')
  if (normalized.length === 0) return [{ text: '', start: 0, end: 0 }]

  const lines: WrappedLine[] = []
  let rest = normalized
  let offset = 0
  while (rest.length > 0) {
    let slice = rest
    if (rest.length > maxChars) {
      slice = rest.slice(0, maxChars)
      const wordBoundary = slice.lastIndexOf(' ')
      if (wordBoundary > 0) slice = slice.slice(0, wordBoundary)
    }
    lines.push({ text: slice, start: offset, end: offset + slice.length })
    offset += slice.length
    rest = rest.slice(slice.length)
    if (rest.startsWith(' ')) {
      rest = rest.slice(1)
      offset += 1
    }
  }
  return lines
}
