// Agent tabs: each is its own Claude Code session (its own CLI process), like terminal tabs.
// Background agents keep running; the UI shows whichever agent is active.
import { create, useStore } from 'zustand'
import type { ClaudeEvent, SDKSessionInfo } from '../../../shared/types'
import { useApp } from './app'
import { createSessionStore, type SessionState, type SessionStatus, type SessionStore } from './session'
import { useUi } from './ui'
import { useViewer } from './viewer'

/** What the tab strip and history need to know about every agent, kept in sync with its store. */
export interface AgentMeta {
  sessionId: string | null
  status: SessionStatus
  waiting: boolean
  firstPrompt: string | null
}

export interface Agent {
  id: string
  store: SessionStore
  /** Name given by the user (tab rename or /rename); otherwise the chat's title is used */
  title: string | null
}

interface AgentsState {
  agents: Agent[]
  activeId: string | null
  meta: Record<string, AgentMeta>

  add(opts?: { resume?: string; activate?: boolean }): Promise<Agent>
  close(id: string): Promise<void>
  closeAll(): Promise<void>
  activate(id: string): void
  cycle(delta: number): void
  /** Local tab name only (null restores the automatic title) */
  setTitle(id: string, title: string | null): void
  /** Tab name + the chat's saved title, so history shows it too */
  rename(id: string, title: string): Promise<void>
}

let seq = 0
const unsubscribers = new Map<string, () => void>()

function metaOf(s: SessionState): AgentMeta {
  const first = s.items.find((i) => i.kind === 'user')
  return {
    sessionId: s.sessionId,
    status: s.status,
    waiting: s.permissions.length > 0,
    firstPrompt: first?.kind === 'user' ? first.text : null,
  }
}

const sameMeta = (a: AgentMeta | undefined, b: AgentMeta) =>
  !!a && a.sessionId === b.sessionId && a.status === b.status && a.waiting === b.waiting && a.firstPrompt === b.firstPrompt

export const useAgents = create<AgentsState>()((set, get) => ({
  agents: [],
  activeId: null,
  meta: {},

  async add({ resume, activate = true } = {}) {
    const agent: Agent = { id: `agent-${++seq}`, store: createSessionStore(), title: null }
    unsubscribers.set(
      agent.id,
      agent.store.subscribe((s) => {
        const m = metaOf(s)
        if (!sameMeta(get().meta[agent.id], m)) set((st) => ({ meta: { ...st.meta, [agent.id]: m } }))
      }),
    )
    set((s) => ({
      agents: [...s.agents, agent],
      activeId: activate || !s.activeId ? agent.id : s.activeId,
      meta: { ...s.meta, [agent.id]: metaOf(agent.store.getState()) },
    }))
    if (activate) useViewer.getState().show(null)
    await agent.store.getState().start(resume ? { resume } : {})
    return agent
  },

  async close(id) {
    const { agents, activeId } = get()
    const i = agents.findIndex((a) => a.id === id)
    if (i === -1) return
    unsubscribers.get(id)?.()
    unsubscribers.delete(id)
    void agents[i].store.getState().stop()
    const rest = agents.filter((a) => a.id !== id)
    const meta = { ...get().meta }
    delete meta[id]
    set({ agents: rest, meta, activeId: activeId === id ? (rest[Math.min(i, rest.length - 1)]?.id ?? null) : activeId })
    if (!rest.length) await get().add() // like a terminal window, there's always one tab
  },

  async closeAll() {
    for (const a of get().agents) {
      unsubscribers.get(a.id)?.()
      unsubscribers.delete(a.id)
      await a.store.getState().stop()
    }
    set({ agents: [], activeId: null, meta: {} })
  },

  activate(id) {
    if (get().agents.some((a) => a.id === id)) set({ activeId: id })
    useViewer.getState().show(null)
  },

  cycle(delta) {
    const { agents, activeId } = get()
    if (agents.length < 2) return
    const i = agents.findIndex((a) => a.id === activeId)
    get().activate(agents[(i + delta + agents.length) % agents.length].id)
  },

  setTitle(id, title) {
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, title } : a)) }))
  },

  async rename(id, title) {
    get().setTitle(id, title)
    const agent = get().agents.find((a) => a.id === id)
    const cwd = useApp.getState().cwd
    const { sessionId, items } = agent?.store.getState() ?? {}
    // A chat only exists on disk after its first message.
    if (cwd && sessionId && items?.some((i) => i.kind === 'user')) {
      await window.api.history.rename(sessionId, title, cwd)
      void useApp.getState().refreshHistory()
    }
  },
}))

// ---------- The active agent, for components written against a single session ----------

const placeholder = createSessionStore()

const activeOf = (s: AgentsState) => s.agents.find((a) => a.id === s.activeId)?.store ?? placeholder

/** Select from the active agent's session: `useSession((s) => s.items)`, `useSession.getState().send(…)`. */
export const useSession = Object.assign(
  function useSession<T>(selector: (s: SessionState) => T): T {
    return useStore(useAgents(activeOf), selector)
  },
  { getState: () => activeOf(useAgents.getState()).getState() },
)

// ---------- Titles and event routing ----------

export function agentTitle(agent: Agent, meta: AgentMeta | undefined, sessions: SDKSessionInfo[]): string {
  if (agent.title) return agent.title
  const saved = meta?.sessionId ? sessions.find((s) => s.sessionId === meta.sessionId) : undefined
  const title = saved?.customTitle || saved?.summary || meta?.firstPrompt
  if (!title) return 'New agent'
  return title.length > 40 ? `${title.slice(0, 40)}…` : title
}

/** Deliver a Claude event to the agent that owns it, and flag background agents that need attention. */
export function routeClaudeEvent(e: ClaudeEvent): void {
  const { agents, activeId, meta } = useAgents.getState()
  const agent = agents.find((a) => a.store.getState().key === e.key)
  if (!agent) return
  agent.store.getState().handleEvent(e)
  if (agent.id === activeId && useViewer.getState().active === null) return
  const name = agentTitle(agent, meta[agent.id], useApp.getState().sessions)
  if (e.type === 'permission') useUi.getState().toast(`${name} is waiting for your answer`, 'warn')
  else if (e.type === 'message' && e.message.type === 'result') useUi.getState().toast(`${name} finished`)
}
