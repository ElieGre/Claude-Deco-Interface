import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import type { FileEntry, SlashCommand } from '../../../shared/types'
import { addToContext, LOCAL_COMMANDS, submit } from '../actions'
import { useSession } from '../store/session'
import { DRAG_TYPE } from './FilesPanel'
import { Icon } from './Icon'

export function Composer() {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState(0)
  const status = useSession((s) => s.status)
  const cliCommands = useSession((s) => s.meta?.commands)
  const hasPermissionPrompt = useSession((s) => s.permissions.length > 0)
  const attachments = useSession((s) => s.attachments)
  const [dropping, setDropping] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const sent = useRef<string[]>([])
  const historyIdx = useRef(-1)

  const running = status === 'running' || status === 'compacting'

  const commands = useMemo(() => {
    const localNames = new Set(LOCAL_COMMANDS.map((c) => c.name))
    return [...LOCAL_COMMANDS, ...(cliCommands ?? []).filter((c) => !localNames.has(c.name))]
  }, [cliCommands])

  const slashQuery = /^\/(\S*)$/.exec(text)?.[1]
  const matches = useMemo(() => {
    if (slashQuery === undefined) return []
    const q = slashQuery.toLowerCase()
    const hit = (c: SlashCommand) => c.name.toLowerCase().startsWith(q) || c.aliases?.some((a) => a.startsWith(q))
    return commands.filter(hit).slice(0, 14)
  }, [commands, slashQuery])

  useEffect(() => setSelected(0), [slashQuery])
  useEffect(() => {
    if (!hasPermissionPrompt) ta.current?.focus()
  }, [hasPermissionPrompt])

  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`
  }, [text])

  const send = (value: string) => {
    if (!value.trim() && !useSession.getState().attachments.length) return
    if (value.trim()) sent.current.unshift(value)
    historyIdx.current = -1
    setText('')
    void submit(value)
  }

  const pick = (c: SlashCommand, run: boolean) => {
    if (run && !c.argumentHint) send(`/${c.name}`)
    else setText(`/${c.name} `)
    ta.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (matches.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const d = e.key === 'ArrowDown' ? 1 : -1
        setSelected((i) => (i + d + matches.length) % matches.length)
        return
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        return pick(matches[selected], false)
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        return pick(matches[selected], true)
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      return send(text)
    }
    if (e.key === 'Escape') {
      if (running) void useSession.getState().interrupt()
      else setText('')
      return
    }
    // ↑ / ↓ recall previous prompts when the caret is at the edge, like the terminal.
    const el = e.currentTarget
    if (e.key === 'ArrowUp' && el.selectionStart === 0 && sent.current.length) {
      e.preventDefault()
      historyIdx.current = Math.min(historyIdx.current + 1, sent.current.length - 1)
      setText(sent.current[historyIdx.current])
    } else if (e.key === 'ArrowDown' && historyIdx.current >= 0 && el.selectionEnd === el.value.length) {
      e.preventDefault()
      historyIdx.current -= 1
      setText(historyIdx.current >= 0 ? sent.current[historyIdx.current] : '')
    }
  }

  // Files dragged from the Files tab are attached like "Add to chat context".
  const acceptsDrop = (e: DragEvent) => e.dataTransfer.types.includes(DRAG_TYPE)
  const onDragOver = (e: DragEvent) => {
    if (!acceptsDrop(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropping(true)
  }
  const onDrop = (e: DragEvent) => {
    setDropping(false)
    if (!acceptsDrop(e)) return
    e.preventDefault()
    addToContext(JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as FileEntry)
  }

  return (
    <div
      className={`composer${dropping ? ' is-dropping' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {matches.length > 0 && (
        <div className="slash-menu">
          {matches.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className={`slash-item${i === selected ? ' is-active' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c, true)
              }}
            >
              <span className="slash-name">/{c.name}</span>
              {c.argumentHint && <span className="slash-hint">{c.argumentHint}</span>}
              <span className="slash-desc">{c.description}</span>
            </div>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="composer-attachments" title="Sent as @mentions with your next message — Claude gets the file contents">
          <span className="attach-label">Attached</span>
          {attachments.map((rel) => (
            <span key={rel} className="attach-chip">
              <span className="attach-name">{rel}</span>
              <button className="attach-remove" onClick={() => useSession.getState().detach(rel)} title="Remove">
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="composer-box">
        <textarea
          ref={ta}
          value={text}
          rows={1}
          autoFocus
          disabled={hasPermissionPrompt}
          placeholder={
            running ? 'Claude is working — messages you send are queued (Esc to interrupt)' : 'Message Claude — / for commands'
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {running ? (
          <button className="btn btn-stop" onClick={() => void useSession.getState().interrupt()} title="Interrupt (Esc)">
            Stop
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => send(text)} disabled={!text.trim() && !attachments.length}>
            Send
          </button>
        )}
      </div>
    </div>
  )
}
