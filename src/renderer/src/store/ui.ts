// Transient UI: toasts, the confirm dialog and the context menu.
import { create } from 'zustand'

export interface Toast {
  id: number
  text: string
  tone: 'info' | 'warn'
}

export type MenuItem =
  | { label: string; hint?: string; disabled?: boolean; danger?: boolean; onClick: () => void }
  | 'separator'

export interface ConfirmOptions {
  title: string
  body: string
  confirmLabel: string
  /** Show a "Don't ask again" checkbox */
  allowDontAsk?: boolean
}

export interface ConfirmResult {
  ok: boolean
  dontAsk: boolean
}

interface UiState {
  toasts: Toast[]
  confirm: (ConfirmOptions & { resolve: (r: ConfirmResult) => void }) | null
  menu: { x: number; y: number; items: MenuItem[] } | null

  toast(text: string, tone?: Toast['tone']): void
  dismissToast(id: number): void
  ask(opts: ConfirmOptions): Promise<ConfirmResult>
  openMenu(x: number, y: number, items: MenuItem[]): void
  closeMenu(): void
}

let toastSeq = 0

export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  confirm: null,
  menu: null,

  toast(text, tone = 'info') {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }))
    setTimeout(() => get().dismissToast(id), 4000)
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  ask(opts) {
    get().confirm?.resolve({ ok: false, dontAsk: false })
    return new Promise((resolve) =>
      set({
        confirm: {
          ...opts,
          resolve: (r) => {
            set({ confirm: null })
            resolve(r)
          },
        },
      }),
    )
  },

  openMenu(x, y, items) {
    set({ menu: { x, y, items } })
  },

  closeMenu() {
    set({ menu: null })
  },
}))

export const focusComposer = () => document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus()
