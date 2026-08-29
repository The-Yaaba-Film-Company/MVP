import { create } from 'zustand'

// UI-only state (active scene, …) lives in a store, never in TanStack Query
// (SPEC.md §8). Server state belongs to Query.
interface WriterState {
  activeSceneId: string | null
  setActiveSceneId: (id: string) => void
}

export const useWriterStore = create<WriterState>((set) => ({
  activeSceneId: null,
  setActiveSceneId: (id) => set({ activeSceneId: id }),
}))
