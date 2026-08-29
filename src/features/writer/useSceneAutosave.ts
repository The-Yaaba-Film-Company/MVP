import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutableRefObject } from 'react'
import { api } from '#/api/client'
import { isApiError } from '#/api/errors'
import { sceneKeys } from './queries'
import type { Scene, TiptapNode } from '#/api/types'

export const AUTOSAVE_DEBOUNCE_MS = 800

/**
 * Test seam: collapse the autosave debounce so tests observe the PATCH
 * without fake timers. Reset to AUTOSAVE_DEBOUNCE_MS via setAutosaveDebounceMs.
 */
export let autosaveDebounceMs = AUTOSAVE_DEBOUNCE_MS
export function setAutosaveDebounceMs(ms: number): void {
  autosaveDebounceMs = ms
}

export interface SceneAutosave {
  editorRef: MutableRefObject<Editor | null>
  schedule: () => void
  flush: () => void
  saving: boolean
  error: boolean
  conflict: boolean
}

/**
 * Debounced one-scene autosave (SPEC.md §8): PATCH ≤1 per debounce window,
 * optimistic cache patch on success, reconcile on failure. On a 409 conflict
 * the local edits are discarded and the server scene is reloaded.
 */
export function useSceneAutosave(
  scene: Scene,
  screenplayId: string,
): SceneAutosave {
  const queryClient = useQueryClient()
  const editorRef = useRef<Editor | null>(null)
  const lastSavedRef = useRef<TiptapNode>(scene.content)
  const pendingRef = useRef<TiptapNode | null>(null)
  const inFlightRef = useRef(false)
  const failedRef = useRef<TiptapNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flags, setFlags] = useState({
    saving: false,
    error: false,
    conflict: false,
  })

  const mutation = useMutation({
    mutationFn: (content: TiptapNode) =>
      api.scenes.update(scene.id, { content }),
    onSuccess: (saved) => {
      inFlightRef.current = false
      lastSavedRef.current = saved.content
      setFlags({ saving: false, error: false, conflict: false })
      queryClient.setQueryData<{ items: Scene[] }>(
        sceneKeys.list(screenplayId),
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((s) => (s.id === saved.id ? saved : s)),
              }
            : old,
      )
      if (pendingRef.current) setTimeout(() => flushRef.current(), 0)
    },
    onError: (err) => {
      inFlightRef.current = false
      if (isApiError(err) && err.status === 409) {
        setFlags({ saving: false, error: true, conflict: true })
        void recoverFromConflictRef.current()
      } else {
        const editor = editorRef.current
        const failed = failedRef.current
        const stillCurrent =
          pendingRef.current === null &&
          !!failed &&
          !!editor &&
          JSON.stringify(editor.getJSON()) === JSON.stringify(failed)
        if (stillCurrent)
          editor.commands.setContent(lastSavedRef.current, {
            emitUpdate: false,
          })
        pendingRef.current = null
        setFlags({ saving: false, error: true, conflict: false })
      }
    },
  })

  const recoverFromConflict = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    const fresh = await api.scenes.get(scene.id)
    lastSavedRef.current = fresh.content
    pendingRef.current = null
    editor.commands.setContent(fresh.content, { emitUpdate: false })
    queryClient.setQueryData<{ items: Scene[] }>(
      sceneKeys.list(screenplayId),
      (old) =>
        old
          ? {
              ...old,
              items: old.items.map((s) => (s.id === fresh.id ? fresh : s)),
            }
          : old,
    )
  }, [queryClient, scene.id, screenplayId])

  const recoverFromConflictRef = useRef(recoverFromConflict)
  recoverFromConflictRef.current = recoverFromConflict

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const editor = editorRef.current
    const doc = pendingRef.current
    if (!editor || !doc || inFlightRef.current) return
    pendingRef.current = null
    failedRef.current = doc
    inFlightRef.current = true
    setFlags((f) => ({ ...f, saving: true }))
    mutation.mutate(doc)
  }, [mutation])

  const flushRef = useRef(flush)
  flushRef.current = flush

  const schedule = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    pendingRef.current = editor.getJSON()
    setFlags((f) =>
      f.error || f.conflict ? { ...f, error: false, conflict: false } : f,
    )
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => flushRef.current(), autosaveDebounceMs)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { editorRef, schedule, flush, ...flags }
}
