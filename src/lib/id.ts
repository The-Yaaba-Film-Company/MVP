let seq = 0

/** Stable per-session unique id (ProseMirror node `id` attrs). */
export function nodeId(prefix = 'n'): string {
  seq += 1
  return `${prefix}-${seq}`
}
