// Turns the SDK message stream (and saved transcripts) into flat, render-ready chat items.
import type { SDKMessage, SessionMessage } from '../../../shared/types'

export type ChatItem =
  | { kind: 'user'; id: string; text: string; files?: string[] }
  | { kind: 'text'; id: string; text: string; parent: string | null; streaming?: boolean }
  | { kind: 'thinking'; id: string; text: string; parent: string | null; streaming?: boolean }
  | ToolItem
  | { kind: 'notice'; id: string; text: string; tone: NoticeTone }

export interface ToolItem {
  kind: 'tool'
  id: string
  name: string
  input: Record<string, unknown>
  parent: string | null
  result?: string
  isError?: boolean
}

export type NoticeTone = 'info' | 'error' | 'divider' | 'output'

// Content blocks from the Messages API; typed loosely since we only read a few fields.
type Block = { type: string; [k: string]: any }

let seq = 0
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`

export const notice = (text: string, tone: NoticeTone = 'info'): ChatItem => ({ kind: 'notice', id: uid('n'), text, tone })

export function reduceMessage(items: ChatItem[], msg: SDKMessage): ChatItem[] {
  switch (msg.type) {
    case 'stream_event':
      return applyStreamEvent(items, msg.event as Block, msg.parent_tool_use_id)
    case 'assistant':
      return applyAssistant(items, msg.message.content as Block[], msg.parent_tool_use_id, msg.uuid)
    case 'user': {
      const content = msg.message.content
      return Array.isArray(content) ? applyToolResults(items, content as Block[]) : items
    }
    case 'system':
      switch (msg.subtype) {
        case 'local_command_output':
          return [...items, notice(msg.content, 'output')]
        case 'compact_boundary':
          return [...items, notice(`Conversation compacted (${msg.compact_metadata.trigger})`, 'divider')]
        case 'api_retry':
          return [...items, notice(`API error (${msg.error}) — retry ${msg.attempt}/${msg.max_retries}`, 'error')]
        default:
          return items
      }
    case 'result': {
      const done = finalizeDrafts(items)
      if (msg.subtype !== 'success') return [...done, notice(msg.errors.join('\n') || msg.subtype, 'error')]
      if (msg.is_error) return [...done, notice(msg.result || 'Request failed', 'error')]
      return done
    }
    default:
      return items
  }
}

function applyStreamEvent(items: ChatItem[], ev: Block, parent: string | null): ChatItem[] {
  if (ev.type === 'content_block_start') {
    const t = ev.content_block?.type
    if (t === 'text' || t === 'thinking') return [...items, { kind: t, id: uid('draft'), text: '', parent, streaming: true }]
  } else if (ev.type === 'content_block_delta') {
    if (ev.delta?.type === 'text_delta') return appendDraft(items, 'text', parent, ev.delta.text)
    if (ev.delta?.type === 'thinking_delta') return appendDraft(items, 'thinking', parent, ev.delta.thinking)
  }
  return items
}

function appendDraft(items: ChatItem[], kind: 'text' | 'thinking', parent: string | null, chunk: string): ChatItem[] {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    if (it.kind === kind && it.streaming && it.parent === parent) {
      const next = items.slice()
      next[i] = { ...it, text: it.text + chunk }
      return next
    }
  }
  return items
}

/** Final assistant blocks replace their streaming drafts in place (oldest draft first). */
function applyAssistant(items: ChatItem[], blocks: Block[], parent: string | null, uuid: string): ChatItem[] {
  const next = items.slice()
  blocks.forEach((b, i) => {
    if (b.type === 'text' || b.type === 'thinking') {
      const kind = b.type as 'text' | 'thinking'
      const text: string = kind === 'text' ? b.text : b.thinking
      const draft = next.findIndex((it) => it.kind === kind && it.streaming && it.parent === parent)
      if (!text?.trim()) {
        if (draft >= 0) next.splice(draft, 1)
        return
      }
      const item: ChatItem = { kind, id: `${uuid}:${i}`, text, parent }
      if (draft >= 0) next[draft] = item
      else next.push(item)
    } else if (b.type === 'tool_use' || b.type === 'server_tool_use' || b.type === 'mcp_tool_use') {
      if (!next.some((it) => it.kind === 'tool' && it.id === b.id))
        next.push({ kind: 'tool', id: b.id, name: b.name, input: b.input ?? {}, parent })
    }
  })
  return next
}

function applyToolResults(items: ChatItem[], blocks: Block[]): ChatItem[] {
  const results = blocks.filter((b) => b.type === 'tool_result')
  if (!results.length) return items
  const next = items.slice()
  for (const r of results) {
    for (let i = next.length - 1; i >= 0; i--) {
      const it = next[i]
      if (it.kind === 'tool' && it.id === r.tool_use_id) {
        next[i] = { ...it, result: blockText(r.content), isError: !!r.is_error }
        break
      }
    }
  }
  return next
}

function blockText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content.map((p: Block) => (p.type === 'text' ? p.text : `[${p.type}]`)).join('\n')
  return ''
}

export function finalizeDrafts(items: ChatItem[]): ChatItem[] {
  if (!items.some((it) => 'streaming' in it && it.streaming)) return items
  return items
    .filter((it) => !('streaming' in it && it.streaming && !it.text.trim()))
    .map((it) => ('streaming' in it && it.streaming ? { ...it, streaming: false } : it))
}

// ---------- Saved transcripts (history) ----------

export function itemsFromTranscript(messages: SessionMessage[]): ChatItem[] {
  let items: ChatItem[] = []
  for (const m of messages) {
    const content = (m.message as { content?: unknown } | undefined)?.content
    if (m.type === 'assistant' && Array.isArray(content)) {
      items = applyAssistant(items, content, m.parent_tool_use_id, m.uuid)
    } else if (m.type === 'user') {
      if (typeof content === 'string') items = pushUserText(items, m.uuid, content)
      else if (Array.isArray(content)) {
        if (content.some((b: Block) => b.type === 'tool_result')) items = applyToolResults(items, content)
        else {
          const text = content
            .filter((b: Block) => b.type === 'text')
            .map((b: Block) => b.text)
            .join('\n')
          if (text) items = pushUserText(items, m.uuid, text)
        }
      }
    }
  }
  return items
}

function pushUserText(items: ChatItem[], id: string, raw: string): ChatItem[] {
  const cmd = /<command-name>([\s\S]*?)<\/command-name>/.exec(raw)
  if (cmd) {
    const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(raw)?.[1]?.trim()
    return [...items, { kind: 'user', id, text: args ? `${cmd[1]} ${args}` : cmd[1] }]
  }
  const stdout = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(raw)
  if (stdout) return stdout[1].trim() ? [...items, notice(stdout[1].trim(), 'output')] : items
  if (raw.startsWith('Caveat:') || raw.includes('<local-command-caveat>')) return items
  if (raw.startsWith('[Request interrupted')) return [...items, notice('Interrupted')]
  const text = raw.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
  return text ? [...items, { kind: 'user', id, text }] : items
}
