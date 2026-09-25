// App-level state: project folder, layout, chat history list, git data.
import { create } from 'zustand'
import type { GitCommit, GitStatus, LayoutConfig, SDKSessionInfo, ThemeName } from '../../../shared/types'

interface AppState {
  cwd: string | null
  recentProjects: string[]
  theme: ThemeName
  layout: LayoutConfig
  confirmNewChat: boolean
  sessions: SDKSessionInfo[]
  gitStatus: GitStatus | null
  commits: GitCommit[]
  /** The first history / git read for the current folder has returned; until then panels show skeletons. */
  historyLoaded: boolean
  gitLoaded: boolean

  load(): Promise<void>
  setCwd(cwd: string): Promise<void>
  setTheme(theme: ThemeName): void
  setLayout(patch: Partial<LayoutConfig>, persist?: boolean): void
  setConfirmNewChat(value: boolean): void
  refreshHistory(): Promise<void>
  refreshGit(): Promise<void>
  /** Debounced refreshGit for bursts of file-system changes */
  refreshGitSoon(): void
}

let gitTimer: ReturnType<typeof setTimeout> | null = null

/** The saved layout rides in the load URL (like the theme) so the first render matches the boot skeleton. */
function bootLayout(): LayoutConfig {
  const fallback: LayoutConfig = { leftWidth: 260, rightWidth: 480, leftOpen: true, rightOpen: true, leftTab: 'chats' }
  try {
    const raw = new URLSearchParams(location.search).get('layout')
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<LayoutConfig>) } : fallback
  } catch {
    return fallback
  }
}

export const useApp = create<AppState>()((set, get) => ({
  cwd: null,
  recentProjects: [],
  theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  layout: bootLayout(),
  confirmNewChat: true,
  sessions: [],
  gitStatus: null,
  commits: [],
  historyLoaded: false,
  gitLoaded: false,

  async load() {
    const cfg = await window.api.config.get()
    document.documentElement.dataset.theme = cfg.theme
    set({
      theme: cfg.theme,
      cwd: cfg.cwd,
      recentProjects: cfg.recentProjects,
      layout: cfg.layout,
      confirmNewChat: cfg.confirmNewChat,
    })
    await Promise.all([get().refreshHistory(), get().refreshGit()])
  },

  async setCwd(cwd) {
    const cfg = await window.api.config.set({ cwd })
    set({ cwd, recentProjects: cfg.recentProjects, sessions: [], gitStatus: null, commits: [], historyLoaded: false, gitLoaded: false })
    await Promise.all([get().refreshHistory(), get().refreshGit()])
  },

  setTheme(theme) {
    document.documentElement.dataset.theme = theme
    set({ theme })
    void window.api.config.set({ theme })
  },

  setLayout(patch, persist = true) {
    const layout = { ...get().layout, ...patch }
    set({ layout })
    if (persist) void window.api.config.set({ layout })
  },

  setConfirmNewChat(value) {
    set({ confirmNewChat: value })
    void window.api.config.set({ confirmNewChat: value })
  },

  async refreshHistory() {
    const { cwd } = get()
    if (!cwd) return
    try {
      const sessions = await window.api.history.list(cwd)
      if (get().cwd === cwd) set({ sessions, historyLoaded: true })
    } catch (err) {
      console.error('history', err)
      if (get().cwd === cwd) set({ historyLoaded: true })
    }
  },

  async refreshGit() {
    const { cwd } = get()
    if (!cwd) return
    try {
      const [gitStatus, commits] = await Promise.all([window.api.git.status(cwd), window.api.git.graph(cwd)])
      if (get().cwd === cwd) set({ gitStatus, commits, gitLoaded: true })
    } catch (err) {
      console.error('git', err)
      if (get().cwd === cwd) set({ gitLoaded: true })
    }
  },

  refreshGitSoon() {
    if (gitTimer) clearTimeout(gitTimer)
    gitTimer = setTimeout(() => {
      gitTimer = null
      void get().refreshGit()
    }, 800)
  },
}))
