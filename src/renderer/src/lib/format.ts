export function formatTokens(n: number | null | undefined): string {
  if (n == null) return '–'
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

export function relativeTime(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`
  return new Date(ms).toLocaleDateString()
}

export function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/** One-line description of a tool call, like the CLI's `Tool(summary)` lines. */
export function toolSummary(name: string, input: Record<string, unknown>): string {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : undefined)
  let s: string | undefined
  switch (name) {
    case 'Bash':
    case 'PowerShell':
      s = str('command')
      break
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      s = str('file_path')
      break
    case 'NotebookEdit':
      s = str('notebook_path')
      break
    case 'Grep':
    case 'Glob':
      s = str('pattern')
      break
    case 'WebFetch':
      s = str('url')
      break
    case 'WebSearch':
      s = str('query')
      break
    case 'Task':
    case 'Agent':
      s = str('description')
      break
    case 'Skill':
      s = str('skill')
      break
    case 'TodoWrite':
      s = Array.isArray(input.todos) ? `${input.todos.length} todos` : undefined
      break
  }
  s ??= Object.values(input).find((v): v is string => typeof v === 'string')
  if (!s) return ''
  const line = s.split('\n')[0]
  return line.length > 140 ? `${line.slice(0, 140)}…` : line
}
