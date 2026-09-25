// Syntax highlighting with shiki. The theme is shiki's CSS-variables theme, so every token color is a
// `--syn-*` custom property defined in styles/base.css: retune the palette there, not here.
// Grammars load on demand (one chunk per language) and the JS regex engine avoids needing wasm.
// The highlighter core and regex engine are imported on first use, keeping them out of the startup bundle.
import type { HighlighterCore, ThemedToken } from 'shiki/core'
import { bundledLanguages } from 'shiki/langs'

/** Past this size, files render as plain text: tokenizing is synchronous and would stall the UI. */
export const HIGHLIGHT_LIMIT = { chars: 400_000, lines: 8_000 }

const EXT_LANG: Record<string, string> = {
  mjs: 'js',
  cjs: 'js',
  mts: 'ts',
  cts: 'ts',
  h: 'c',
  hpp: 'cpp',
  cc: 'cpp',
  ps1: 'powershell',
  psm1: 'powershell',
  cmd: 'bat',
  vbs: 'vb',
  yml: 'yaml',
  htm: 'html',
  svg: 'xml',
  gitignore: 'shellscript',
  env: 'dotenv',
}

const FILE_LANG: Record<string, string> = {
  dockerfile: 'docker',
  makefile: 'make',
  '.gitignore': 'shellscript',
  '.npmrc': 'ini',
  '.editorconfig': 'ini',
}

const isBundled = (lang: string): boolean => lang in bundledLanguages

/** Shiki language id for a file name, or null for plain text. */
export function langForFile(name: string): string | null {
  const lower = name.toLowerCase()
  if (FILE_LANG[lower]) return FILE_LANG[lower]
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : ''
  const lang = EXT_LANG[ext] ?? ext
  return lang && isBundled(lang) ? lang : null
}

/** Normalizes a markdown fence label (```tsx, ```sh …) to a bundled language id, or null. */
export function langForFence(label: string | undefined): string | null {
  if (!label) return null
  const lang = label.toLowerCase()
  return isBundled(lang) ? lang : (EXT_LANG[lang] ?? null)
}

let highlighter: Promise<HighlighterCore> | null = null
const getHighlighter = () =>
  (highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    ([{ createCssVariablesTheme, createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [createCssVariablesTheme({ name: 'neo-deco', variablePrefix: '--syn-', fontStyle: true })],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      }),
  ))

/** Token lines for `code`, or null when the language is unknown or the input is too big to highlight. */
export async function tokenize(code: string, lang: string | null): Promise<ThemedToken[][] | null> {
  if (!lang || !isBundled(lang) || code.length > HIGHLIGHT_LIMIT.chars) return null
  const hl = await getHighlighter()
  if (!hl.getLoadedLanguages().includes(lang)) await hl.loadLanguage(bundledLanguages[lang as keyof typeof bundledLanguages])
  return hl.codeToTokens(code, { lang, theme: 'neo-deco' }).tokens
}

export type { ThemedToken }
