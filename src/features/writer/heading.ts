import type { IntExt, TiptapNode } from '#/api/types'

const INT_EXT_LABEL: Record<IntExt, string> = {
  INT: 'INT.',
  EXT: 'EXT.',
  INT_EXT: 'INT./EXT.',
}

/**
 * Display text for a scene heading, e.g. `INT. POLICE STATION - NIGHT`.
 * Falls back to the scene row's summary fields when the content block attrs
 * are absent.
 */
export function headingText(
  intExt: IntExt | null | undefined,
  location: string | null | undefined,
  timeOfDay: string | null | undefined,
  modifier?: string | null,
): string {
  const base = [intExt ? INT_EXT_LABEL[intExt] : '', location?.trim()]
    .filter(Boolean)
    .join(' ')
  const tail = [timeOfDay?.trim(), modifier?.trim()].filter(Boolean).join(' - ')
  const full = [base, tail].filter(Boolean).join(' - ')
  return full || 'Untitled scene'
}

interface HeadingAttrs {
  intExt?: IntExt
  location?: string
  timeOfDay?: string
  modifier?: string | null
}

/** Extract the sceneHeading block's attrs from a scene Tiptap fragment. */
export function headingAttrsFromContent(content: TiptapNode): HeadingAttrs {
  const heading = content.content?.find((n) => n.type === 'sceneHeading')
  return heading?.attrs ?? {}
}

/** Display label for a scene fragment, e.g. `INT. POLICE STATION - NIGHT`. */
export function headingFromContent(content: TiptapNode): string {
  const a = headingAttrsFromContent(content)
  return headingText(a.intExt, a.location, a.timeOfDay, a.modifier)
}
