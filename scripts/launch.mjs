// Fast launcher used by launch.vbs (the desktop shortcut).
// Rebuilds only when something under src/ or resources/ (or the build config) is newer than the last build,
// then starts Electron directly: no npm, and no 20-second rebuild on every boot.
// Output from both the build and the app goes to launch.log in the project root.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, openSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const log = openSync(join(root, 'launch.log'), 'w')

const INPUTS = ['src', 'resources', 'package.json', 'electron.vite.config.ts', 'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json']
const OUTPUTS = ['out/main/index.js', 'out/preload/index.cjs', 'out/renderer/index.html']

/** Newest modification time anywhere under `path`. */
function newest(path) {
  const stat = statSync(path)
  if (!stat.isDirectory()) return stat.mtimeMs
  let max = stat.mtimeMs
  for (const name of readdirSync(path)) max = Math.max(max, newest(join(path, name)))
  return max
}

const outputs = OUTPUTS.map((p) => join(root, p))
const lastBuild = outputs.every(existsSync) ? Math.min(...outputs.map((p) => statSync(p).mtimeMs)) : 0
const lastChange = Math.max(...INPUTS.map((p) => join(root, p)).filter(existsSync).map(newest))

if (lastChange > lastBuild) {
  const build = spawnSync(process.execPath, [join(root, 'node_modules/electron-vite/bin/electron-vite.js'), 'build'], {
    cwd: root,
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  if (build.status !== 0) process.exit(build.status ?? 1)
}

const electron = join(root, 'node_modules/electron/dist', process.platform === 'win32' ? 'electron.exe' : 'electron')
spawn(electron, [root], { cwd: root, detached: true, stdio: ['ignore', log, log] }).unref()
