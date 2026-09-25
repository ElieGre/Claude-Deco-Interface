// Lazily-loaded project file tree.
import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'
import { normPath } from '../lib/paths'

interface FilesState {
  root: string | null
  /** Loaded directory listings, keyed by absolute path */
  children: Record<string, FileEntry[]>
  expanded: Record<string, boolean>
  selected: string | null
  error: string | null

  setRoot(root: string): void
  load(dir: string): Promise<void>
  toggle(dir: string): void
  collapseAll(): void
  select(path: string | null): void
  /** Re-list loaded directories (all, or just those given). */
  reload(dirs?: string[]): Promise<void>
}

export const useFiles = create<FilesState>()((set, get) => ({
  root: null,
  children: {},
  expanded: {},
  selected: null,
  error: null,

  setRoot(root) {
    if (get().root === root) return
    set({ root, children: {}, expanded: {}, selected: null, error: null })
    void window.api.files.watch(root)
  },

  async load(dir) {
    const { root } = get()
    if (!root) return
    try {
      const entries = await window.api.files.list(dir, root)
      if (get().root === root) set((s) => ({ children: { ...s.children, [dir]: entries }, error: null }))
    } catch (err) {
      if (get().root !== root) return
      if (dir === root) set({ error: String(err instanceof Error ? err.message : err) })
      else
        set((s) => {
          // Folder was deleted or became unreadable: drop it from the cache.
          const children = { ...s.children }
          delete children[dir]
          return { children }
        })
    }
  },

  toggle(dir) {
    const open = !get().expanded[dir]
    set((s) => ({ expanded: { ...s.expanded, [dir]: open } }))
    if (open && !get().children[dir]) void get().load(dir)
  },

  collapseAll() {
    set({ expanded: {} })
  },

  select(path) {
    set({ selected: path })
  },

  async reload(dirs) {
    const loaded = Object.keys(get().children)
    const wanted = dirs && new Set(dirs.map(normPath))
    await Promise.all(loaded.filter((d) => !wanted || wanted.has(normPath(d))).map((d) => get().load(d)))
  },
}))
