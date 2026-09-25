// Claude Code's own settings (the terminal's /config), made editable from the app.
// SDK sessions support `/config key=value` but not the interactive screen, so this module
// reads current values itself and writes through the CLI, keeping its validation and storage rules.
import { query, resolveSettings, type Query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { CliSetting } from '../shared/types'
import { InputQueue } from './claude'

// Loosely typed: both sources are the CLI's own files and their shapes change between versions.
type Json = Record<string, any>

/**
 * Label and current-value lookup per /config key, taken from the CLI's /config screen (Claude Code 2.1.280).
 * `g` is the global config (~/.claude.json), `s` the merged settings.json layers.
 * Keys the CLI adds later still show up (from its usage list), just without a known current value.
 */
const KEYS: Record<string, { label: string; read: (g: Json, s: Json) => unknown }> = {
  autoCompact: { label: 'Auto-compact', read: (g) => g.autoCompactEnabled ?? true },
  autoConnectIde: { label: 'Auto-connect to IDE', read: (g) => g.autoConnectIde ?? false },
  autoScroll: { label: 'Auto-scroll', read: (g) => g.autoScrollEnabled ?? true },
  checkpoints: { label: 'Rewind code (checkpoints)', read: (g) => g.fileCheckpointingEnabled ?? true },
  chrome: { label: 'Claude in Chrome enabled by default', read: (g) => g.claudeInChromeDefaultEnabled ?? false },
  copyFullResponse: { label: 'Skip the /copy picker', read: (g) => g.copyFullResponse ?? false },
  copyOnSelect: { label: 'Copy on select', read: (g) => g.copyOnSelect ?? true },
  defaultToAgentsView: { label: 'Open agents view by default', read: (g) => g.defaultToAgentsView ?? false },
  editor: { label: 'Editor mode', read: (g, s) => ((g.editorMode ?? s.editorMode) === 'vim' ? 'vim' : 'normal') },
  externalEditorContext: { label: 'Show last response in external editor', read: (g) => g.externalEditorContext ?? false },
  gitignore: { label: 'Respect .gitignore in file picker', read: (g) => g.respectGitignore ?? true },
  language: { label: 'Language', read: (_g, s) => s.language ?? '' },
  leftArrowOpensAgents: { label: 'Left arrow opens agents', read: (g) => g.leftArrowOpensAgents ?? true },
  model: { label: 'Model', read: (_g, s) => s.model ?? 'default' },
  notifChannel: { label: 'Notifications', read: (g) => g.preferredNotifChannel ?? 'auto' },
  outputStyle: { label: 'Output style', read: (_g, s) => s.outputStyle ?? 'default' },
  permissionMode: { label: 'Default permission mode', read: (_g, s) => s.permissions?.defaultMode ?? 'default' },
  prStatus: { label: 'Show PR status footer', read: (g) => g.prStatusFooterEnabled ?? true },
  progressBar: { label: 'Terminal progress bar', read: (g) => g.terminalProgressBarEnabled ?? true },
  recap: { label: 'Session recap', read: () => undefined },
  reduceMotion: { label: 'Reduce motion', read: (_g, s) => s.prefersReducedMotion ?? false },
  switchModelsOnFlag: { label: 'When a model is flagged', read: () => undefined },
  theme: { label: 'Terminal theme', read: (g, s) => s.theme ?? g.theme ?? 'dark' },
  thinking: { label: 'Thinking mode', read: (_g, s) => s.alwaysThinkingEnabled ?? true },
  timeFormat: { label: 'Time format', read: (_g, s) => s.timeFormat ?? 'auto' },
  tips: { label: 'Show tips', read: (_g, s) => s.spinnerTipsEnabled ?? true },
  turnDuration: { label: 'Show turn duration', read: (g) => g.showTurnDuration ?? true },
  useAutoModeDuringPlan: { label: 'Use auto mode during plan', read: (_g, s) => s.useAutoModeDuringPlan ?? true },
  verbose: { label: 'Verbose output', read: (g) => g.verbose ?? false },
  workflowKeywordTriggerEnabled: { label: 'Ultracode keyword trigger', read: (_g, s) => s.workflowKeywordTriggerEnabled ?? true },
  workflowSizeGuideline: { label: 'Dynamic workflow size', read: (_g, s) => s.workflowSizeGuideline },
  workflows: { label: 'Dynamic workflows', read: (_g, s) => (s.disableWorkflows === true ? false : s.enableWorkflows) },
  worktreeBaseRef: { label: 'Worktree base ref', read: (_g, s) => s.worktree?.baseRef ?? 'fresh' },
}

const globalConfigPath = () => join(process.env.CLAUDE_CONFIG_DIR ?? homedir(), '.claude.json')

async function readGlobalConfig(): Promise<Json> {
  try {
    return JSON.parse(await readFile(globalConfigPath(), 'utf8')) as Json
  } catch {
    return {}
  }
}

/**
 * One headless Claude Code process that runs /config commands, so settings changes don't show up
 * in any chat. Kept alive briefly because spawning costs a few seconds.
 */
class ConfigRunner {
  private q: Query | null = null
  private input: InputQueue<SDKUserMessage> | null = null
  private cwd: string | null = null
  private waiters: { resolve: (text: string) => void; reject: (err: Error) => void }[] = []
  private chain: Promise<unknown> = Promise.resolve()
  private idle: NodeJS.Timeout | null = null
  private usage: string | null = null

  /** Runs one slash command and returns its text output. Commands are serialized. */
  run(cwd: string, command: string): Promise<string> {
    const next = this.chain.then(() => this.exec(cwd, command))
    this.chain = next.catch(() => undefined)
    return next
  }

  /** The CLI's `/config` usage text: every settable key and its allowed values. */
  async usageText(cwd: string): Promise<string> {
    this.usage ??= await this.run(cwd, '/config')
    return this.usage
  }

  private exec(cwd: string, command: string): Promise<string> {
    if (!this.q || this.cwd !== cwd) this.start(cwd)
    if (this.idle) clearTimeout(this.idle)
    this.idle = setTimeout(() => this.close(), 90_000)
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject })
      this.input!.push({ type: 'user', message: { role: 'user', content: command }, parent_tool_use_id: null })
    })
  }

  private start(cwd: string): void {
    this.close()
    this.cwd = cwd
    this.input = new InputQueue<SDKUserMessage>()
    const q = query({ prompt: this.input, options: { cwd, persistSession: false, settingSources: ['user', 'project', 'local'] } })
    this.q = q
    void (async () => {
      try {
        for await (const m of q) {
          if (m.type === 'result') this.waiters.shift()?.resolve(m.subtype === 'success' ? m.result : m.errors.join('\n'))
        }
      } catch (err) {
        for (const w of this.waiters.splice(0)) w.reject(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (this.q === q) this.q = null
      }
    })()
  }

  close(): void {
    if (this.idle) clearTimeout(this.idle)
    this.idle = null
    this.input?.close()
    this.q?.close()
    this.q = null
    this.input = null
    for (const w of this.waiters.splice(0)) w.reject(new Error('Settings helper closed'))
  }
}

export const configRunner = new ConfigRunner()

function asString(v: unknown): string | null {
  if (v === undefined || v === null) return null
  return typeof v === 'string' ? v : String(v)
}

export async function listSettings(cwd: string): Promise<CliSetting[]> {
  const [usage, global, resolved] = await Promise.all([
    configRunner.usageText(cwd),
    readGlobalConfig(),
    resolveSettings({ cwd }).catch(() => ({ effective: {} })),
  ])
  const settings = resolved.effective as Json
  const out: CliSetting[] = []
  for (const line of usage.split('\n')) {
    const m = /^\s+([A-Za-z]+)=(.+)$/.exec(line)
    if (!m) continue
    const [, key, spec] = m
    const options = spec.startsWith('<') ? [] : spec.split('|')
    const kind = options.length === 2 && options.includes('true') && options.includes('false') ? 'boolean' : options.length ? 'enum' : 'text'
    const meta = KEYS[key]
    out.push({ key, label: meta?.label ?? key, kind, options, value: meta ? asString(meta.read(global, settings)) : null })
  }
  return out
}

export function setSetting(cwd: string, key: string, value: string): Promise<string> {
  // Values like "Switch automatically" need quotes to stay one argument.
  const v = /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
  return configRunner.run(cwd, `/config ${key}=${v}`)
}
