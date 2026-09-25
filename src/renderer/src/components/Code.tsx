import { memo, useEffect, useState, type CSSProperties } from 'react'
import { langForFence, tokenize, type ThemedToken } from '../lib/highlight'
import { Icon } from './Icon'

/** Token lines for `code`; null until highlighted (or when it can't be), so callers render plain text first. */
export function useTokens(code: string, lang: string | null): ThemedToken[][] | null {
  const [tokens, setTokens] = useState<{ code: string; lines: ThemedToken[][] } | null>(null)
  useEffect(() => {
    let live = true
    tokenize(code, lang).then(
      (lines) => live && setTokens(lines ? { code, lines } : null),
      () => live && setTokens(null),
    )
    return () => {
      live = false
    }
  }, [code, lang])
  // Stale tokens from the previous input would show the wrong text; plain text is the honest fallback.
  return tokens?.code === code ? tokens.lines : null
}

// Bits 1/2/4 of shiki's fontStyle are italic/bold/underline.
function tokenStyle(t: ThemedToken): CSSProperties | undefined {
  if (!t.color && !t.fontStyle) return undefined
  const fs = t.fontStyle ?? 0
  return {
    color: t.color,
    fontStyle: fs & 1 ? 'italic' : undefined,
    fontWeight: fs & 2 ? 600 : undefined,
    textDecoration: fs & 4 ? 'underline' : undefined,
  }
}

export function TokenLine({ tokens }: { tokens: ThemedToken[] }) {
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={tokenStyle(t)}>
          {t.content}
        </span>
      ))}
    </>
  )
}

/** Fenced code block inside chat markdown: language label, copy button, highlighted body. */
export const CodeBlock = memo(function CodeBlock({ code, label }: { code: string; label?: string }) {
  const lang = langForFence(label)
  const tokens = useTokens(code, lang)
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void window.api.shell.copy(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span className="codeblock-lang">{label || 'text'}</span>
        <button className="codeblock-copy" onClick={copy} title="Copy code">
          <Icon name={copied ? 'check' : 'copy'} size={13} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>
          {tokens
            ? tokens.map((line, i) => (
                <span key={i} className="code-line">
                  <TokenLine tokens={line} />
                  {'\n'}
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  )
})
