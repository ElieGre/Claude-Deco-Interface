import { useSession } from '../store/agents'
import '../styles/commands.css'
import { MarkdownText } from './ChatItemView'
import { Icon, Marquee } from './Icon'

/** /btw answers: a side channel above the composer that never enters the transcript. */
export function SideQuestions() {
  const questions = useSession((s) => s.sideQuestions)
  const dismiss = useSession((s) => s.dismissSide)
  if (!questions.length) return null
  return (
    <div className="btw-stack">
      {questions.map((q) => (
        <section key={q.id} className="btw-card" aria-live="polite">
          <header className="btw-head">
            <span className="btw-tag">btw</span>
            <span className="btw-question">{q.question}</span>
            <button className="icon-btn" onClick={() => dismiss(q.id)} title="Dismiss (Esc)">
              <Icon name="close" size={12} />
            </button>
          </header>
          {q.pending ? (
            <div className="btw-pending">
              <Marquee /> Answering from the conversation so far…
            </div>
          ) : q.error ? (
            <div className="notice notice-error">{q.error}</div>
          ) : (
            <div className="btw-answer">
              <MarkdownText text={q.answer ?? ''} />
            </div>
          )}
          <footer className="btw-foot">Side answer · not added to the conversation</footer>
        </section>
      ))}
    </div>
  )
}
