import {
  query,
  type CanUseTool,
  type PermissionResult,
  type PermissionUpdate,
  type Query,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'
import { randomUUID } from 'node:crypto'
import type { WebContents } from 'electron'
import type {
  ClaudeEventBody,
  EffortLevel,
  PermissionDecision,
  PermissionMode,
  StartSessionOptions,
} from '../shared/types'

/** Push-based async iterable feeding user messages into the SDK's streaming input mode. */
class InputQueue<T> implements AsyncIterable<T> {
  private items: T[] = []
  private waiters: ((r: IteratorResult<T>) => void)[] = []
  private done = false

  push(item: T): void {
    if (this.done) return
    const waiter = this.waiters.shift()
    if (waiter) waiter({ value: item, done: false })
    else this.items.push(item)
  }

  close(): void {
    this.done = true
    for (const w of this.waiters.splice(0)) w({ value: undefined, done: true })
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        if (this.items.length) return Promise.resolve({ value: this.items.shift()!, done: false })
        if (this.done) return Promise.resolve({ value: undefined, done: true })
        return new Promise((resolve) => this.waiters.push(resolve))
      },
    }
  }
}

interface PendingPermission {
  input: Record<string, unknown>
  suggestions?: PermissionUpdate[]
  resolve: (result: PermissionResult) => void
}

/**
 * One live Claude Code process (the same CLI you run in the terminal), driven through
 * the Agent SDK in streaming-input mode so we can send many turns and use control
 * requests (model / effort / permission mode / interrupt) mid-session.
 */
export class ClaudeSession {
  readonly key: string
  private readonly wc: WebContents
  private readonly onClose: () => void
  private readonly input = new InputQueue<SDKUserMessage>()
  private readonly pending = new Map<string, PendingPermission>()
  private readonly q: Query
  private closed = false

  constructor(wc: WebContents, opts: StartSessionOptions, onClose: () => void) {
    this.key = opts.key
    this.wc = wc
    this.onClose = onClose
    this.q = query({
      prompt: this.input,
      options: {
        cwd: opts.cwd,
        resume: opts.resume,
        sessionId: opts.resume ? undefined : opts.sessionId,
        // Leave model / effort / mode undefined unless chosen in the UI so the
        // user's ~/.claude/settings.json defaults apply, exactly like the CLI.
        model: opts.model,
        effort: opts.effort,
        permissionMode: opts.permissionMode,
        allowDangerouslySkipPermissions: true,
        includePartialMessages: true,
        settingSources: ['user', 'project', 'local'],
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        canUseTool: (toolName, input, o) => this.askPermission(toolName, input, o),
        stderr: (data) => console.error('[claude]', data.trimEnd()),
      },
    })
    void this.pump()
    void this.loadMeta()
  }

  private emit(body: ClaudeEventBody): void {
    if (!this.wc.isDestroyed()) this.wc.send('claude:event', { key: this.key, ...body })
  }

  private async pump(): Promise<void> {
    try {
      for await (const message of this.q) this.emit({ type: 'message', message })
    } catch (err) {
      if (!this.closed) this.emit({ type: 'error', error: errorText(err) })
    } finally {
      this.shutdown()
      this.emit({ type: 'closed' })
    }
  }

  private async loadMeta(): Promise<void> {
    try {
      const init = await this.q.initializationResult()
      this.emit({
        type: 'meta',
        meta: {
          commands: init.commands,
          models: init.models,
          agents: init.agents,
          account: init.account,
          outputStyle: init.output_style,
        },
      })
    } catch (err) {
      if (!this.closed) this.emit({ type: 'error', error: `Failed to initialize: ${errorText(err)}` })
    }
  }

  private askPermission: CanUseTool = (toolName, input, opts) =>
    new Promise<PermissionResult>((resolve) => {
      const id = randomUUID()
      this.pending.set(id, { input, suggestions: opts.suggestions, resolve })
      opts.signal.addEventListener(
        'abort',
        () => {
          if (!this.pending.delete(id)) return
          this.emit({ type: 'permission-cancel', id })
          resolve({ behavior: 'deny', message: 'Permission request was cancelled.' })
        },
        { once: true },
      )
      this.emit({
        type: 'permission',
        request: {
          id,
          toolName,
          input,
          toolUseId: opts.toolUseID,
          agentId: opts.agentID,
          title: opts.title,
          displayName: opts.displayName,
          description: opts.description,
          decisionReason: opts.decisionReason,
          blockedPath: opts.blockedPath,
          canAlwaysAllow: !!opts.suggestions?.length && !opts.suppressAlwaysAllowRule,
          defaultToNo: !!opts.defaultToNo,
        },
      })
    })

  respondPermission(id: string, decision: PermissionDecision): void {
    const p = this.pending.get(id)
    if (!p) return
    this.pending.delete(id)
    p.resolve(
      decision.behavior === 'allow'
        ? {
            behavior: 'allow',
            updatedInput: decision.updatedInput ?? p.input,
            updatedPermissions: decision.always ? p.suggestions : undefined,
          }
        : {
            behavior: 'deny',
            message: decision.message || 'The user denied this action.',
            interrupt: decision.interrupt,
          },
    )
  }

  send(text: string): void {
    this.input.push({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
    })
  }

  async interrupt(): Promise<void> {
    await this.q.interrupt()
  }

  setModel(model?: string): Promise<void> {
    return this.q.setModel(model)
  }

  setPermissionMode(mode: PermissionMode): Promise<void> {
    return this.q.setPermissionMode(mode)
  }

  setEffort(effort: EffortLevel | null): Promise<void> {
    return this.q.applyFlagSettings({ effortLevel: effort })
  }

  contextUsage() {
    return this.q.getContextUsage({ detail: 'full' })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.shutdown()
    this.q.close()
  }

  private shutdown(): void {
    this.input.close()
    for (const [id, p] of this.pending) {
      this.pending.delete(id)
      p.resolve({ behavior: 'deny', message: 'Session closed.' })
    }
    this.onClose()
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
