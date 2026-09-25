const CASE_INSENSITIVE = window.api.platform === 'win32' || window.api.platform === 'darwin'

/** Comparable form of a path: forward slashes, no trailing slash, case-folded where the OS is. */
export function normPath(p: string): string {
  const s = p.replace(/\\/g, '/').replace(/\/+$/, '')
  return CASE_INSENSITIVE ? s.toLowerCase() : s
}

export const isAbsolute = (p: string) => /^([a-zA-Z]:[\\/]|[\\/])/.test(p)

export const joinPath = (root: string, rel: string) => (isAbsolute(rel) ? rel : `${root.replace(/[\\/]+$/, '')}/${rel}`)

export function parentDir(p: string): string | null {
  const m = /^(.*)[\\/][^\\/]+[\\/]?$/.exec(p)
  if (!m) return null
  if (/^[a-zA-Z]:$/.test(m[1])) return `${m[1]}\\`
  return m[1] || '/'
}

/** `@path` mention the CLI expands into file contents; quoted when the path has spaces. */
export const mention = (rel: string) => (/\s/.test(rel) ? `@"${rel}"` : `@${rel}`)

export const revealLabel =
  window.api.platform === 'win32' ? 'Reveal in File Explorer' : window.api.platform === 'darwin' ? 'Reveal in Finder' : 'Show in file manager'
