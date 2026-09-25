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

export type ThemeName = 'dark' | 'light'

export interface AppConfig {
  cwd: string | null
  recentProjects: string[]
  theme: ThemeName
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

// ---------- Interactive CLI commands ----------

/**
 * Read-only views behind the CLI's interactive commands (/status, /hooks, /memory, /skills, /permissions, /plan).
 * They come from control requests the SDK implements but doesn't publish types for, so the shapes are
 * typed loosely here and in the renderer (observed on Claude Code 2.1.280).
 */
export type InfoKind = 'status' | 'hooks' | 'memory' | 'skills' | 'permissions' | 'plan'

/** Answer to a /btw side question; it never enters the main conversation. */
export interface SideAnswer {
  response: string
  synthetic: boolean
}

export interface ExportedConversation {
  text: string
  default_filename: string
}

/** One Claude Code setting from the terminal's /config, as the app's settings panel shows it. */
export interface CliSetting {
  key: string
  label: string
  kind: 'boolean' | 'enum' | 'text'
  options: string[]
  /** Current value; null when the app can't read it (it can still be set) */
  value: string | null
}

// ---------- Bridge API exposed on window.api ----------

export interface Api {
  platform: string
  /** Our own title bar drives the frameless window. */
  window: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<void>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
    onMaximizedChange(cb: (maximized: boolean) => void): () => void
  }
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
    sideQuestion(key: string, question: string): Promise<SideAnswer | null>
    info(key: string, kind: InfoKind): Promise<unknown>
    exportConversation(key: string): Promise<ExportedConversation>
    /** Replaces the session's extra working directories (what /add-dir accumulates) */
    setAdditionalDirectories(key: string, dirs: string[]): Promise<void>
    stop(key: string): Promise<void>
    onEvent(cb: (event: ClaudeEvent) => void): () => void
  }
  history: {
    list(cwd: string): Promise<SDKSessionInfo[]>
    messages(sessionId: string, cwd: string): Promise<SessionMessage[]>
    rename(sessionId: string, title: string, cwd: string): Promise<void>
    remove(sessionId: string, cwd: string): Promise<void>
    /** Copy a saved chat into a new session; returns the new session id */
    fork(sessionId: string, cwd: string): Promise<string>
  }
  git: {
    status(cwd: string): Promise<GitStatus | null>
    graph(cwd: string, limit?: number): Promise<GitCommit[]>
  }
  cliConfig: {
    list(cwd: string): Promise<CliSetting[]>
    /** Runs `/config key=value` in a background CLI; returns its confirmation text */
    set(cwd: string, key: string, value: string): Promise<string>
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
    /** Save-as dialog, then write the text; returns the chosen path or null if cancelled */
    saveText(defaultName: string, text: string): Promise<string | null>
  }
}
