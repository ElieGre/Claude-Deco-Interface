import type { MouseEvent } from 'react'
import { useApp } from '../store/app'

const MIN = 180
const MAX = 900

export function Resizer({ side }: { side: 'left' | 'right' }) {
  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const { layout, setLayout } = useApp.getState()
    const start = side === 'left' ? layout.leftWidth : layout.rightWidth

    const move = (ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - startX
      const w = Math.max(MIN, Math.min(MAX, side === 'left' ? start + dx : start - dx))
      setLayout(side === 'left' ? { leftWidth: w } : { rightWidth: w }, false)
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.classList.remove('is-resizing')
      setLayout({}, true)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    document.body.classList.add('is-resizing')
  }
  return <div className={`resizer resizer-${side}`} onMouseDown={onMouseDown} />
}
