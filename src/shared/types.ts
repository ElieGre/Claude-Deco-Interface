// Types shared by the main process, preload bridge and renderer.
// SDK types are imported type-only, so the renderer never bundles the SDK itself.
import type {
  AccountInfo,
  AgentInfo,
  EffortLevel,
  ModelInfo,
  ModelUsage,
  PermissionMode,
  SDKControlGetContextUsageResponse,
  SDKMessage,
  SDKSessionInfo,
  SessionMessage,
  SlashCommand,
} from '@anthropic-ai/claude-agent-sdk'

export type {
  AccountInfo,
  AgentInfo,
  EffortLevel,
  ModelInfo,
  ModelUsage,
  PermissionMode,
  SDKControlGetContextUsageResponse as ContextUsage,
  SDKMessage,
  SDKSessionInfo,
  SessionMessage,
  SlashCommand,
}

// ---------- App config (persisted in Electron userData) ----------

export interface LayoutConfig {
  leftWidth: number
  rightWidth: number
  leftOpen: boolean
  rightOpen: boolean
  leftTab: 'chats' | 'files'
}

export interface AppConfig {
  cwd: string | null
  recentProjects: string[]
  layout: LayoutConfig
  /** Warn before an action replaces the current chat with a new one (e.g. changing the working folder). */
  confirmNewChat: boolean
}

// ---------- Claude sessions ----------

export interface StartSessionOptions {
  /** Renderer-chosen id for this live session; every event carries it back. */
  key: string
  cwd: string
  resume?: string
  sessionId?: string
  model?: string
  effort?: EffortLevel
  permissionMode?: PermissionMode
}

export interface SessionMeta {
  commands: SlashCommand[]
  models: ModelInfo[]
  agents: AgentInfo[]
  account: AccountInfo
  outputStyle: string
}

export interface PermissionRequest {
  id: string
  toolName: string
  input: Record<string, unknown>
  toolUseId: string
  agentId?: string
  title?: string
  displayName?: string
  description?: string
  decisionReason?: string
  blockedPath?: string
  canAlwaysAllow: boolean
  defaultToNo: boolean
}

export type PermissionDecision =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown>; always?: boolean }
  | { behavior: 'deny'; message?: string; interrupt?: boolean }

export type ClaudeEventBody =
  | { type: 'message'; message: SDKMessage }
  | { type: 'meta'; meta: SessionMeta }
  | { type: 'permission'; request: PermissionRequest }
  | { type: 'permission-cancel'; id: string }
  | { type: 'error'; error: string }
  | { type: 'closed' }

export type ClaudeEvent = ClaudeEventBody & { key: string }

// ---------- Git ----------

export interface GitRef {
  name: string
  type: 'head' | 'branch' | 'remote' | 'tag'
}

export interface GitCommit {
  hash: string
  parents: string[]
  refs: GitRef[]
  subject: string
  author: string
  /** Unix seconds */
  time: number
}

export interface GitFileChange {
  path: string
  /** Porcelain XY codes: index and worktree status */
  index: string
  worktree: string
  additions: number | null
  deletions: number | null
}

export interface GitStatus {
  root: string
  branch: string | null
  detached: boolean
  upstream: string | null
  ahead: number
  behind: number
  files: GitFileChange[]
}

// ---------- Project files ----------

export interface FileEntry {
  name: string
  /** Absolute path, native separators */
  path: string
  /** Relative to the project root, forward slashes — the form used for @mentions */
  rel: string
  dir: boolean
  /** Matched by .gitignore (shown dimmed, like VS Code) */
  ignored: boolean
}

/** A file opened in the read-only viewer. */
export type FileContent =
  | { kind: 'text'; text: string; size: number }
  | { kind: 'binary'; size: number }
  | { kind: 'too-large'; size: number; limit: number }

export interface FsChange {
  /** Directories whose direct children changed */
  dirs: string[]
  /** HEAD or refs changed (checkout, commit, branch…) */
  git: boolean
}

// ---------- Bridge API exposed on window.api ----------

export interface Api {
  platform: string
  config: {
    get(): Promise<AppConfig>
    set(patch: Partial<AppConfig>): Promise<AppConfig>
    pickFolder(): Promise<string | null>
  }
  claude: {
    start(opts: StartSessionOptions): Promise<void>
    send(key: string, text: string): Promise<void>
    interrupt(key: string): Promise<void>
    setModel(key: string, model?: string): Promise<void>
    setPermissionMode(key: string, mode: PermissionMode): Promise<void>
    setEffort(key: string, effort: EffortLevel | null): Promise<void>
    contextUsage(key: string): Promise<SDKControlGetContextUsageResponse>
    respondPermission(key: string, id: string, decision: PermissionDecision): Promise<void>
    stop(key: string): Promise<void>
    onEvent(cb: (event: ClaudeEvent) => void): () => void
  }
  history: {
    list(cwd: string): Promise<SDKSessionInfo[]>
    messages(sessionId: string, cwd: string): Promise<SessionMessage[]>
    rename(sessionId: string, title: string, cwd: string): Promise<void>
    remove(sessionId: string, cwd: string): Promise<void>
  }
  git: {
    status(cwd: string): Promise<GitStatus | null>
    graph(cwd: string, limit?: number): Promise<GitCommit[]>
  }
  files: {
    list(dir: string, root: string): Promise<FileEntry[]>
    read(path: string): Promise<FileContent>
    watch(root: string): Promise<void>
    onChanged(cb: (change: FsChange) => void): () => void
  }
  shell: {
    reveal(path: string): Promise<void>
    open(path: string): Promise<void>
    copy(text: string): Promise<void>
  }
}
