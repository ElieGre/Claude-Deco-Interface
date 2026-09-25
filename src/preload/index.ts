import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Api, ClaudeEvent, FsChange } from '../shared/types'

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

const api: Api = {
  platform: process.platform,
  config: {
    get: () => invoke('config:get'),
    set: (patch) => invoke('config:set', patch),
    pickFolder: () => invoke('config:pickFolder'),
  },
  claude: {
    start: (opts) => invoke('claude:start', opts),
    send: (key, text) => invoke('claude:send', key, text),
    interrupt: (key) => invoke('claude:interrupt', key),
    setModel: (key, model) => invoke('claude:setModel', key, model),
    setPermissionMode: (key, mode) => invoke('claude:setPermissionMode', key, mode),
    setEffort: (key, effort) => invoke('claude:setEffort', key, effort),
    contextUsage: (key) => invoke('claude:contextUsage', key),
    respondPermission: (key, id, decision) => invoke('claude:respondPermission', key, id, decision),
    stop: (key) => invoke('claude:stop', key),
    onEvent: (cb) => {
      const listener = (_e: IpcRendererEvent, event: ClaudeEvent) => cb(event)
      ipcRenderer.on('claude:event', listener)
      return () => ipcRenderer.removeListener('claude:event', listener)
    },
  },
  history: {
    list: (cwd) => invoke('history:list', cwd),
    messages: (id, cwd) => invoke('history:messages', id, cwd),
    rename: (id, title, cwd) => invoke('history:rename', id, title, cwd),
    remove: (id, cwd) => invoke('history:remove', id, cwd),
  },
  git: {
    status: (cwd) => invoke('git:status', cwd),
    graph: (cwd, limit) => invoke('git:graph', cwd, limit),
  },
  files: {
    list: (dir, root) => invoke('fs:list', dir, root),
    read: (path) => invoke('fs:read', path),
    watch: (root) => invoke('fs:watch', root),
    onChanged: (cb) => {
      const listener = (_e: IpcRendererEvent, change: FsChange) => cb(change)
      ipcRenderer.on('fs:changed', listener)
      return () => ipcRenderer.removeListener('fs:changed', listener)
    },
  },
  shell: {
    reveal: (path) => invoke('shell:reveal', path),
    open: (path) => invoke('shell:open', path),
    copy: (text) => invoke('shell:copy', text),
  },
}

contextBridge.exposeInMainWorld('api', api)
