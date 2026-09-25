import { memo, useMemo, useState } from 'react'
import { addToContext } from '../actions'
import { basename } from '../lib/format'
import { HIGHLIGHT_LIMIT, langForFile } from '../lib/highlight'
import { revealLabel } from '../lib/paths'
import { useApp } from '../store/app'
import { useUi } from '../store/ui'
import { useViewer } from '../store/viewer'
import { TokenLine, useTokens } from './Code'
import { Icon } from './Icon'

/** Rendering tens of thousands of rows as DOM is the real cost, so very long files show their head. */
const RENDER_LINES = 20_000

const formatSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`)

function relPath(path: string, root: string | null): string {
  const p = path.replace(/\\/g, '/')
  const r = root?.replace(/\\/g, '/').replace(/\/+$/, '')
  return r && p.toLowerCase().startsWith(`${r.toLowerCase()}/`) ? p.slice(r.length + 1) : p
}

export function FileViewer({ path }: { path: string }) {
  const content = useViewer((s) => s.contents[path])
  const root = useApp((s) => s.cwd)
  const rel = relPath(path, root)
  const name = basename(path)
  const lang = langForFile(name)
  const { toast } = useUi.getState()
  const run = (p: Promise<unknown>) => p.catch((e) => toast(String(e instanceof Error ? e.message : e), 'warn'))

  const crumbs = rel.split('/')
  return (
    <section className="viewer" aria-label={`File ${rel}`}>
      <header className="viewer-head">
        <nav className="viewer-crumbs" title={path}>
          {crumbs.map((c, i) => (
            <span key={i} className={i === crumbs.length - 1 ? 'crumb crumb-file' : 'crumb'}>
              {c}
            </span>
          ))}
        </nav>
        {content?.kind === 'text' && (
          <span className="viewer-facts">
            <span>{lang ?? 'plain text'}</span>
            <span>{content.text.split('\n').length.toLocaleString()} lines</span>
            <span>{formatSize(content.size)}</span>
          </span>
        )}
        <span className="viewer-actions">
          <button
            className="btn btn-small"
            onClick={() => addToContext({ name, path, rel, dir: false, ignored: false })}
            title="Attach this file to your next message"
          >
            <Icon name="attach" size={13} /> Attach
          </button>
          <button className="icon-btn" onClick={() => void run(window.api.shell.open(path))} title="Open in default app">
            <Icon name="external" />
          </button>
          <button className="icon-btn" onClick={() => void run(window.api.shell.reveal(path))} title={revealLabel}>
            <Icon name="folder" />
          </button>
        </span>
      </header>
      {!content && <div className="viewer-state">Reading {name}…</div>}
      {content?.kind === 'error' && <div className="viewer-state is-error">Couldn't read this file: {content.message}</div>}
      {content?.kind === 'binary' && (
        <div className="viewer-state">
          {name} is a binary file ({formatSize(content.size)}). Open it in its default app instead.
        </div>
      )}
      {content?.kind === 'too-large' && (
        <div className="viewer-state">
          {name} is {formatSize(content.size)}, over the {formatSize(content.limit)} viewer limit. Open it in its default app instead.
        </div>
      )}
      {content?.kind === 'text' && <CodeView key={path} text={content.text} lang={lang} />}
    </section>
  )
}

const CodeView = memo(function CodeView({ text, lang }: { text: string; lang: string | null }) {
  const norm = useMemo(() => text.replace(/\r\n?/g, '\n'), [text])
  const lines = useMemo(() => norm.split('\n'), [norm])
  const tooLong = lines.length > HIGHLIGHT_LIMIT.lines
  const tokens = useTokens(norm, tooLong ? null : lang)
  const [active, setActive] = useState<number | null>(null)
  const shown = Math.min(lines.length, RENDER_LINES)
  const gutter = `${String(shown).length + 1}ch`

  return (
    <div className="viewer-scroll">
      {tooLong && lang && (
        <div className="viewer-note">
          Long file: highlighting is off above {HIGHLIGHT_LIMIT.lines.toLocaleString()} lines.
          {lines.length > RENDER_LINES && ` Showing the first ${RENDER_LINES.toLocaleString()} of ${lines.length.toLocaleString()}.`}
        </div>
      )}
      <pre className="viewer-code" style={{ ['--gutter' as string]: gutter }}>
        {lines.slice(0, shown).map((line, i) => (
          <div
            key={i}
            className={`vline${active === i ? ' is-active' : ''}`}
            onMouseDown={(e) => e.detail === 1 && setActive(i)}
          >
            <span className="vline-no">{i + 1}</span>
            <span className="vline-text">{tokens?.[i] ? <TokenLine tokens={tokens[i]} /> : line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
})
