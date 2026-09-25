// Read-only file viewer: the tabs open next to the agent chat in the center column.
import { create } from 'zustand'
import type { FileContent } from '../../../shared/types'
import { normPath, parentDir } from '../lib/paths'

export type ViewerContent = FileContent | { kind: 'error'; message: string }

interface ViewerState {
  /** Absolute paths of open files, in tab order */
  tabs: string[]
  /** Path of the file on screen, or null for the agent chat */
  active: string | null
  contents: Record<string, ViewerContent | undefined>

  open(path: string): void
  close(path: string): void
  show(path: string | null): void
  closeAll(): void
  /** Re-read open files that live in any of the given directories (all open files when omitted). */
  reload(dirs?: string[]): void
}

export const useViewer = create<ViewerState>()((set, get) => {
  const load = async (path: string) => {
    let content: ViewerContent
    try {
      content = await window.api.files.read(path)
    } catch (err) {
      content = { kind: 'error', message: String(err instanceof Error ? err.message : err) }
    }
    if (get().tabs.includes(path)) set((s) => ({ contents: { ...s.contents, [path]: content } }))
  }

  return {
    tabs: [],
    active: null,
    contents: {},

    open(path) {
      const { tabs } = get()
      if (!tabs.includes(path)) {
        set({ tabs: [...tabs, path] })
        void load(path)
      }
      set({ active: path })
    },

    close(path) {
      const { tabs, active, contents } = get()
      const i = tabs.indexOf(path)
      if (i === -1) return
      const next = tabs.filter((t) => t !== path)
      const rest = { ...contents }
      delete rest[path]
      set({
        tabs: next,
        contents: rest,
        active: active === path ? (next[Math.min(i, next.length - 1)] ?? null) : active,
      })
    },

    show(path) {
      set({ active: path })
    },

    closeAll() {
      set({ tabs: [], active: null, contents: {} })
    },

    reload(dirs) {
      const wanted = dirs && new Set(dirs.map(normPath))
      for (const path of get().tabs) {
        const dir = parentDir(path)
        if (!wanted || (dir && wanted.has(normPath(dir)))) void load(path)
      }
    },
  }
})
