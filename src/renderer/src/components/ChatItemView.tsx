import { isValidElement, memo, useState, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatItem, ToolItem } from '../lib/chat'
import { toolSummary } from '../lib/format'
import { CodeBlock } from './Code'
import { Icon } from './Icon'

const MD_COMPONENTS: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  // Fenced blocks arrive as <pre><code class="language-x">; swap the pair for a highlighted CodeBlock.
  pre: ({ node: _node, children }) => {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>
    const label = /language-(\S+)/.exec(children.props.className ?? '')?.[1]
    return <CodeBlock code={String(children.props.children ?? '').replace(/\n$/, '')} label={label} />
  },
}

export const MarkdownText = memo(function MarkdownText({ text }: { text: string }) {
  return (
    <div className="markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {text}
      </Markdown>
    </div>
  )
})

interface Props {
  item: ChatItem
  /** Items produced by subagents, grouped under the tool call that spawned them. */
  nested: Map<string, ChatItem[]>
}

export const ChatItemView = memo(function ChatItemView({ item, nested }: Props) {
  switch (item.kind) {
    case 'user':
      return (
        <div className="msg msg-user">
          <div className="msg-label">You</div>
          {item.files && (
            <div className="msg-files">
              {item.files.map((f) => (
                <span key={f} className="attach-chip" title="Attached to this message">
                  @{f}
                </span>
              ))}
            </div>
          )}
          {item.text && <div className="msg-user-body">{item.text}</div>}
        </div>
      )
    case 'text':
      return (
        <div className={`msg msg-assistant${item.streaming ? ' is-streaming' : ''}`}>
          <MarkdownText text={item.text} />
        </div>
      )
    case 'thinking':
      return (
        <details className="msg-thinking">
          <summary>
            <Icon name="chevronRight" size={11} className="section-chevron" />
            {item.streaming ? 'Thinking…' : 'Thought process'}
          </summary>
          <div className="msg-thinking-body">{item.text}</div>
        </details>
      )
    case 'tool':
      return <ToolCard item={item} nested={nested} />
    case 'notice':
      return <div className={`notice notice-${item.tone}`}>{item.text}</div>
  }
})

function ToolCard({ item, nested }: { item: ToolItem; nested: Map<string, ChatItem[]> }) {
  const [open, setOpen] = useState(false)
  const children = nested.get(item.id) ?? []
  const state = item.result === undefined ? 'running' : item.isError ? 'error' : 'done'
  const steps = children.filter((c) => c.kind === 'tool').length

  return (
    <div className={`tool tool-${state}`}>
      <button className="tool-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="tool-dot" title={state} />
        <span className="tool-name">{item.name}</span>
        <span className="tool-summary">{toolSummary(item.name, item.input)}</span>
        {steps > 0 && <span className="tool-steps">{steps} steps</span>}
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} className="tool-chevron" />
      </button>
      {open && (
        <div className="tool-body">
          <ToolInput name={item.name} input={item.input} />
          {children.length > 0 && (
            <div className="tool-nested">
              {children.map((c) => (
                <ChatItemView key={c.id} item={c} nested={nested} />
              ))}
            </div>
          )}
          {item.result !== undefined && <pre className="tool-result">{clip(item.result)}</pre>}
        </div>
      )}
    </div>
  )
}

export function ToolInput({ name, input }: { name: string; input: Record<string, unknown> }) {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '')
  if (name === 'Bash' || name === 'PowerShell') return <pre className="tool-input">$ {str('command')}</pre>
  if (name === 'Edit')
    return (
      <div className="tool-input">
        <div className="tool-path">{str('file_path')}</div>
        <DiffBlock oldText={str('old_string')} newText={str('new_string')} />
      </div>
    )
  if (name === 'Write')
    return (
      <div className="tool-input">
        <div className="tool-path">{str('file_path')}</div>
        <pre>{clip(str('content'), 4000)}</pre>
      </div>
    )
  if (name === 'TodoWrite' && Array.isArray(input.todos))
    return (
      <ul className="todo-list">
        {(input.todos as { content: string; status: string }[]).map((t, i) => (
          <li key={i} className={`todo todo-${t.status}`}>
            <span className="todo-mark" aria-label={t.status.replace('_', ' ')} />
            {t.content}
          </li>
        ))}
      </ul>
    )
  return <pre className="tool-input">{JSON.stringify(input, null, 2)}</pre>
}

function DiffBlock({ oldText, newText }: { oldText: string; newText: string }) {
  return (
    <pre className="diff">
      {oldText.split('\n').map((l, i) => (
        <div key={`o${i}`} className="diff-del">- {l}</div>
      ))}
      {newText.split('\n').map((l, i) => (
        <div key={`n${i}`} className="diff-add">+ {l}</div>
      ))}
    </pre>
  )
}

const clip = (s: string, max = 20_000) => (s.length > max ? `${s.slice(0, max)}\n… (${s.length - max} more chars)` : s)
