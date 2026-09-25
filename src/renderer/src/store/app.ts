// App-level state: project folder, layout, chat history list, git data.
import { create } from 'zustand'
import type { GitCommit, GitStatus, LayoutConfig, SDKSessionInfo } from '../../../shared/types'

interface AppState {
  cwd: string | null
  recentProjects: string[]
  layout: LayoutConfig
  confirmNewChat: boolean
  sessions: SDKSessionInfo[]
  gitStatus: GitStatus | null
  commits: GitCommit[]

  load(): Promise<void>
  setCwd(cwd: string): Promise<void>
  setLayout(patch: Partial<LayoutConfig>, persist?: boolean): void
  setConfirmNewChat(value: boolean): void
  refreshHistory(): Promise<void>
  refreshGit(): Promise<void>
  /** Debounced refreshGit for bursts of file-system changes */
  refreshGitSoon(): void
}

let gitTimer: ReturnType<typeof setTimeout> | null = null

export const useApp = create<AppState>()((set, get) => ({
  cwd: null,
  recentProjects: [],
  layout: { leftWidth: 260, rightWidth: 480, leftOpen: true, rightOpen: true, leftTab: 'chats' },
  confirmNewChat: true,
  sessions: [],
  gitStatus: null,
  commits: [],

  async load() {
    const cfg = await window.api.config.get()
    set({
      cwd: cfg.cwd,
      recentProjects: cfg.recentProjects,
      layout: cfg.layout,
      confirmNewChat: cfg.confirmNewChat,
    })
    await Promise.all([get().refreshHistory(), get().refreshGit()])
  },

  async setCwd(cwd) {
    const cfg = await window.api.config.set({ cwd })
    set({ cwd, recentProjects: cfg.recentProjects, sessions: [], gitStatus: null, commits: [] })
    await Promise.all([get().refreshHistory(), get().refreshGit()])
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
      if (get().cwd === cwd) set({ sessions })
    } catch (err) {
      console.error('history', err)
    }
  },

  async refreshGit() {
    const { cwd } = get()
    if (!cwd) return
    const [gitStatus, commits] = await Promise.all([window.api.git.status(cwd), window.api.git.graph(cwd)])
    if (get().cwd === cwd) set({ gitStatus, commits })
  },

  refreshGitSoon() {
    if (gitTimer) clearTimeout(gitTimer)
    gitTimer = setTimeout(() => {
      gitTimer = null
      void get().refreshGit()
    }, 800)
  },
}))
