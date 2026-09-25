import { useState, type KeyboardEvent } from 'react'
import type { PermissionRequest } from '../../../shared/types'
import { useSession } from '../store/agents'
import type { SessionState } from '../store/session'
import { MarkdownText, ToolInput } from './ChatItemView'

export function PermissionPrompt() {
  const req = useSession((s) => s.permissions[0])
  if (!req) return null
  // key={req.id} resets local state between consecutive prompts
  if (req.toolName === 'AskUserQuestion') return <AskQuestion key={req.id} req={req} />
  if (req.toolName === 'ExitPlanMode') return <PlanApproval key={req.id} req={req} />
  return <ToolApproval key={req.id} req={req} />
}

// Resolved at call time: the prompt always belongs to the agent on screen.
const respond: SessionState['respondPermission'] = (id, decision) => useSession.getState().respondPermission(id, decision)

function ToolApproval({ req }: { req: PermissionRequest }) {
  const [feedback, setFeedback] = useState('')
  const deny = () => respond(req.id, { behavior: 'deny', message: feedback || undefined })
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') deny()
  }
  return (
    <div className="prompt" onKeyDown={onKeyDown}>
      <div className="prompt-title">{req.title ?? `Allow ${req.displayName ?? req.toolName}?`}</div>
      {(req.description || req.decisionReason) && <div className="prompt-sub">{req.description ?? req.decisionReason}</div>}
      {req.blockedPath && <div className="prompt-sub">Path: {req.blockedPath}</div>}
      <div className="prompt-preview">
        <ToolInput name={req.toolName} input={req.input} />
      </div>
      <input
        className="prompt-feedback"
        placeholder="Optional: tell Claude what to do instead (sent with Deny)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && feedback && deny()}
      />
      <div className="prompt-actions">
        <button className="btn btn-primary" autoFocus={!req.defaultToNo} onClick={() => respond(req.id, { behavior: 'allow' })}>
          Allow once
        </button>
        {req.canAlwaysAllow && (
          <button className="btn" onClick={() => respond(req.id, { behavior: 'allow', always: true })}>
            Always allow
          </button>
        )}
        <button className="btn btn-danger" autoFocus={req.defaultToNo} onClick={deny}>
          Deny <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  )
}

interface Question {
  question: string
  header: string
  multiSelect?: boolean
  options: { label: string; description: string }[]
}

function AskQuestion({ req }: { req: PermissionRequest }) {
  const questions = (req.input.questions as Question[] | undefined) ?? []
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})

  const toggle = (q: Question, label: string) =>
    setPicked((p) => {
      const cur = p[q.question] ?? []
      const next = q.multiSelect ? (cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]) : [label]
      return { ...p, [q.question]: next }
    })

  const answers = Object.fromEntries(
    questions.map((q) => [q.question, [...(picked[q.question] ?? []), other[q.question]].filter(Boolean).join(', ')]),
  )
  const complete = questions.every((q) => answers[q.question])

  return (
    <div className="prompt">
      {questions.map((q) => (
        <div key={q.question} className="question">
          <div className="question-head">
            <span className="chip">{q.header}</span> {q.question}
          </div>
          <div className="question-options">
            {q.options.map((o) => (
              <button
                key={o.label}
                className={`option${picked[q.question]?.includes(o.label) ? ' is-picked' : ''}`}
                onClick={() => toggle(q, o.label)}
              >
                <span className="option-label">{o.label}</span>
                <span className="option-desc">{o.description}</span>
              </button>
            ))}
          </div>
          <input
            className="prompt-feedback"
            placeholder="Other…"
            value={other[q.question] ?? ''}
            onChange={(e) => setOther((o) => ({ ...o, [q.question]: e.target.value }))}
          />
        </div>
      ))}
      <div className="prompt-actions">
        <button
          className="btn btn-primary"
          disabled={!complete}
          onClick={() => respond(req.id, { behavior: 'allow', updatedInput: { ...req.input, answers } })}
        >
          Submit answers
        </button>
        <button className="btn" onClick={() => respond(req.id, { behavior: 'deny', message: 'User declined to answer.' })}>
          Skip
        </button>
      </div>
    </div>
  )
}

function PlanApproval({ req }: { req: PermissionRequest }) {
  const [feedback, setFeedback] = useState('')
  const approve = (mode: 'acceptEdits' | 'default') => {
    void respond(req.id, { behavior: 'allow' })
    void useSession.getState().setPermissionMode(mode)
  }
  return (
    <div className="prompt prompt-plan">
      <div className="prompt-title">Ready to code? Here is Claude's plan:</div>
      <div className="prompt-preview plan-body">
        <MarkdownText text={String(req.input.plan ?? '')} />
      </div>
      <input
        className="prompt-feedback"
        placeholder="Feedback for Claude (sent with Keep planning)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <div className="prompt-actions">
        <button className="btn btn-primary" autoFocus onClick={() => approve('acceptEdits')}>
          Approve · auto-accept edits
        </button>
        <button className="btn" onClick={() => approve('default')}>
          Approve · review each edit
        </button>
        <button
          className="btn btn-danger"
          onClick={() => respond(req.id, { behavior: 'deny', message: feedback || 'Keep planning.' })}
        >
          Keep planning
        </button>
      </div>
    </div>
  )
}
