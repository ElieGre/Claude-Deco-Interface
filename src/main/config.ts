import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AppConfig, ThemeName } from '../shared/types'

/** Window background per theme (matches --bg-panel) so resizing and first paint never flash the other theme. */
export const WINDOW_BG: Record<ThemeName, string> = { dark: '#18221d', light: '#dad8c8' }

const DEFAULTS: AppConfig = {
  cwd: null,
  recentProjects: [],
  theme: 'dark',
  layout: { leftWidth: 260, rightWidth: 480, leftOpen: true, rightOpen: true, leftTab: 'chats' },
  confirmNewChat: true,
}

const configPath = () => join(app.getPath('userData'), 'config.json')
let cache: AppConfig | null = null

export function loadConfig(): AppConfig {
  if (cache) return cache
  try {
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<AppConfig>
    cache = { ...DEFAULTS, ...raw, layout: { ...DEFAULTS.layout, ...raw.layout } }
  } catch {
    cache = structuredClone(DEFAULTS)
  }
  // Like the CLI: default to the directory the app was launched from.
  if (!cache.cwd || !existsSync(cache.cwd)) cache.cwd = process.cwd()
  cache.recentProjects = cache.recentProjects.filter((p) => existsSync(p))
  // Configs from before Neo-Deco may still say 'midnight' or 'paper'.
  if (cache.theme !== 'light') cache.theme = 'dark'
  return cache
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const next: AppConfig = { ...loadConfig(), ...patch }
  if (patch.cwd) next.recentProjects = [patch.cwd, ...next.recentProjects.filter((p) => p !== patch.cwd)].slice(0, 10)
  cache = next
  mkdirSync(dirname(configPath()), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(next, null, 2))
  return next
}
