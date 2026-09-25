// The live Claude session: chat items, permission prompts, model/effort/mode, token usage.
import { create } from 'zustand'
import type {
  ClaudeEvent,
  EffortLevel,
  ModelUsage,
  PermissionDecision,
  PermissionMode,
  PermissionRequest,
  SDKMessage,
  SessionMeta,
} from '../../../shared/types'
import { finalizeDrafts, itemsFromTranscript, notice, reduceMessage, uid, type ChatItem, type NoticeTone } from '../lib/chat'
import { mention } from '../lib/paths'
import { useApp } from './app'

export type SessionStatus = 'starting' | 'idle' | 'running' | 'compacting' | 'closed'

export const PERMISSION_MODES: PermissionMode[] = ['default', 'acceptEdits', 'plan', 'bypassPermissions']
export const EFFORT_LEVELS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max']

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  costUsd: number
  contextWindow: number | null
}

export interface ContextInfo {
  used: number
  max: number
}

interface Prefs {
  model?: string
  effort?: EffortLevel
  permissionMode?: PermissionMode
}

interface SessionState {
  key: string | null
  sessionId: string | null
  status: SessionStatus
  items: ChatItem[]
  permissions: PermissionRequest[]
  /** Project-relative paths attached to the next message as @mentions */
  attachments: string[]

  model: string | null
  effort: EffortLevel | null
  permissionMode: PermissionMode
  cliVersion: string | null
  tools: string[]
  mcpServers: { name: string; status: string }[]
  meta: SessionMeta | null
  usage: Usage
  context: ContextInfo | null
  turns: number
  lastTurnMs: number | null
  /** Choices made in the UI; applied to the live session and to new ones. */
  prefs: Prefs

  start(opts?: { resume?: string }): Promise<void>
  stop(): Promise<void>
  send(text: string): Promise<void>
  interrupt(): Promise<void>
  attach(rel: string): void
  detach(rel: string): void
  setModel(model: string): Promise<void>
  setEffort(effort: EffortLevel): Promise<void>
  setPermissionMode(mode: PermissionMode): Promise<void>
  cyclePermissionMode(): void
  respondPermission(id: string, decision: PermissionDecision): Promise<void>
  addNotice(text: string, tone?: NoticeTone): void
  handleEvent(event: ClaudeEvent): void
}

const EMPTY_USAGE: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, contextWindow: null }

const fresh = () => ({
  sessionId: null,
  items: [] as ChatItem[],
  permissions: [] as PermissionRequest[],
  attachments: [] as string[],
  tools: [] as string[],
  mcpServers: [],
  usage: EMPTY_USAGE,
  context: null,
  turns: 0,
  lastTurnMs: null,
})

export const useSession = create<SessionState>()((set, get) => {
  /** Run a control request against the live session, reporting failures in the chat. */
  const control = async (fn: (key: string) => Promise<void>) => {
    const { key, status } = get()
    if (!key || status === 'closed') return
    try {
      await fn(key)
    } catch (err) {
      get().addNotice(String(err instanceof Error ? err.message : err), 'error')
    }
  }

  /** Set by interrupt(); the turn's result then renders as "Interrupted" instead of CLI error diagnostics. */
  let interrupting = false

  const applyMessage = (m: SDKMessage) => {
    const s = get()
    const patch: Partial<SessionState> = { items: reduceMessage(s.items, m) }
    if (m.type === 'result' && interrupting) {
      interrupting = false
      patch.items = [...finalizeDrafts(s.items), notice('Interrupted')]
    }

    if (m.type === 'system' && m.subtype === 'init') {
      Object.assign(patch, {
        sessionId: m.session_id,
        model: m.model,
        permissionMode: m.permissionMode,
        effort: m.effort ?? s.prefs.effort ?? null,
        cliVersion: m.claude_code_version,
        tools: m.tools,
        mcpServers: m.mcp_servers,
      })
    } else if (m.type === 'system' && m.subtype === 'status') {
      if (m.status === 'compacting') patch.status = 'compacting'
      else if (s.status === 'compacting') patch.status = 'running'
      if (m.permissionMode) patch.permissionMode = m.permissionMode
    } else if (m.type === 'assistant' && !m.parent_tool_use_id) {
      if (s.status !== 'compacting') patch.status = 'running'
      const cu = m.context_usage
      const u = m.message.usage
      if (cu) patch.context = { used: cu.total_tokens, max: cu.raw_max_tokens }
      else if (u)
        patch.context = {
          used: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + u.output_tokens,
          max: s.usage.contextWindow ?? s.context?.max ?? 200_000,
        }
    } else if (m.type === 'result') {
      patch.status = 'idle'
      patch.usage = usageFrom(m.modelUsage)
      patch.turns = s.turns + 1
      patch.lastTurnMs = m.duration_ms
      if (s.context && patch.usage.contextWindow) patch.context = { ...s.context, max: patch.usage.contextWindow }
      void useApp.getState().refreshHistory()
      void useApp.getState().refreshGit()
    }
    set(patch)
  }

  return {
    key: null,
    status: 'closed',
    model: null,
    effort: null,
    permissionMode: 'default',
    cliVersion: null,
    meta: null,
    prefs: {},
    ...fresh(),

    async start({ resume } = {}) {
      const cwd = useApp.getState().cwd
      if (!cwd) return
      await get().stop()
      interrupting = false
      const key = crypto.randomUUID()
      const sessionId = resume ?? crypto.randomUUID()
      // Model/effort are re-reported by the CLI on the first turn; until then show the UI choice (or settings default).
      const { prefs } = get()
      set({ ...fresh(), key, sessionId, status: 'starting', model: prefs.model ?? null, effort: prefs.effort ?? null })

      if (resume) {
        try {
          const transcript = await window.api.history.messages(resume, cwd)
          if (get().key === key) set({ items: itemsFromTranscript(transcript) })
        } catch (err) {
          get().addNotice(`Could not load transcript: ${err}`, 'error')
        }
      }

      try {
        await window.api.claude.start({ key, cwd, resume, sessionId: resume ? undefined : sessionId, ...get().prefs })
      } catch (err) {
        if (get().key === key) set({ status: 'closed' })
        get().addNotice(`Failed to start Claude: ${err}`, 'error')
      }
    },

    async stop() {
      const { key } = get()
      if (!key) return
      set({ key: null, status: 'closed' })
      await window.api.claude.stop(key)
    },

    async send(text) {
      const s = get()
      const files = s.attachments // read before a restart below resets session state
      if (!s.key || s.status === 'closed') {
        // Process ended (crash, /exit…): transparently resume the same conversation.
        const hasHistory = s.items.some((i) => i.kind === 'user')
        await get().start(hasHistory && s.sessionId ? { resume: s.sessionId } : {})
      }
      const { key } = get()
      if (!key) return
      // Attachments ride along as @mentions, which the CLI expands into file contents, same as typing them.
      const prompt = files.length ? `${text}\n\n${files.map(mention).join(' ')}`.trim() : text
      set((st) => ({
        items: [...st.items, { kind: 'user', id: uid('u'), text, files: files.length ? files : undefined }],
        attachments: [],
        status: 'running',
      }))
      try {
        await window.api.claude.send(key, prompt)
      } catch (err) {
        get().addNotice(`Send failed: ${err}`, 'error')
        set({ status: 'idle' })
      }
    },

    async interrupt() {
      interrupting = true
      await control((key) => window.api.claude.interrupt(key))
    },

    attach(rel) {
      set((s) => (s.attachments.includes(rel) ? s : { attachments: [...s.attachments, rel] }))
    },

    detach(rel) {
      set((s) => ({ attachments: s.attachments.filter((a) => a !== rel) }))
    },

    async setModel(model) {
      set((s) => ({ prefs: { ...s.prefs, model }, model }))
      await control((key) => window.api.claude.setModel(key, model))
    },

    async setEffort(effort) {
      set((s) => ({ prefs: { ...s.prefs, effort }, effort }))
      await control((key) => window.api.claude.setEffort(key, effort))
    },

    async setPermissionMode(mode) {
      set((s) => ({ prefs: { ...s.prefs, permissionMode: mode }, permissionMode: mode }))
      await control((key) => window.api.claude.setPermissionMode(key, mode))
    },

    cyclePermissionMode() {
      const i = PERMISSION_MODES.indexOf(get().permissionMode)
      void get().setPermissionMode(PERMISSION_MODES[(i + 1) % PERMISSION_MODES.length])
    },

    async respondPermission(id, decision) {
      set((s) => ({ permissions: s.permissions.filter((p) => p.id !== id) }))
      const { key } = get()
      if (key) await window.api.claude.respondPermission(key, id, decision)
    },

    addNotice(text, tone = 'info') {
      set((s) => ({ items: [...s.items, notice(text, tone)] }))
    },

    handleEvent(e) {
      if (e.key !== get().key) return // stale event from a session we already left
      switch (e.type) {
        case 'message':
          applyMessage(e.message)
          break
        case 'meta':
          set((s) => ({ meta: e.meta, status: s.status === 'starting' ? 'idle' : s.status }))
          break
        case 'permission':
          set((s) => ({ permissions: [...s.permissions, e.request] }))
          break
        case 'permission-cancel':
          set((s) => ({ permissions: s.permissions.filter((p) => p.id !== e.id) }))
          break
        case 'error':
          get().addNotice(e.error, 'error')
          break
        case 'closed':
          interrupting = false
          set((s) => ({ status: 'closed', permissions: [], items: finalizeDrafts(s.items) }))
          break
      }
    },
  }
})

function usageFrom(modelUsage: Record<string, ModelUsage>): Usage {
  const u = { ...EMPTY_USAGE }
  for (const m of Object.values(modelUsage)) {
    u.input += m.inputTokens
    u.output += m.outputTokens
    u.cacheRead += m.cacheReadInputTokens
    u.cacheWrite += m.cacheCreationInputTokens
    u.costUsd += m.costUSD
    u.contextWindow = Math.max(u.contextWindow ?? 0, m.contextWindow) || null
  }
  return u
}
