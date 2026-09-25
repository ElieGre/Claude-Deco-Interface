// Line icons drawn on a 16px grid: 1.25px strokes, square caps, mitred joins, only straight runs and 45° turns
// where possible, so they share the geometry of the git graph and the panel hairlines.

const PATHS = {
  menu: 'M2 4.5h12M2 8h9M2 11.5h6',
  branch: 'M5 2.5v11M11 2.5V5L5 11',
  refresh: 'M13 8a5 5 0 1 1-1.46-3.54M13.5 2.5v3h-3',
  up: 'M8 13.5v-11M4 6.5l4-4 4 4',
  collapse: 'M4 2.5l4 3.5 4-3.5M4 13.5l4-3.5 4 3.5',
  close: 'M4 4l8 8M12 4l-8 8',
  chevronRight: 'M6 3.5l4.5 4.5L6 12.5',
  chevronDown: 'M3.5 6L8 10.5 12.5 6',
  plus: 'M8 2.5v11M2.5 8h11',
  tag: 'M2.5 2.5h5.5l5.5 5.5L8 13.5 2.5 8zM5.5 5.5h.01',
  external: 'M9.5 2.5h4v4M13.5 2.5l-6 6M11.5 9.5v4h-9v-9h4',
  attach: 'M2.5 8h7M6.5 4.5L10 8l-3.5 3.5M13.5 2.5v11',
  copy: 'M5.5 5.5h8v8h-8zM2.5 10.5v-8h8',
  check: 'M2.5 8.5l3.5 3.5 7.5-7.5',
  folder: 'M2.5 3.5h4l1.5 2h5.5v7h-11z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/** The brand mark: a diamond within a diamond, the smallest unit of the Neo-Deco grid. */
export function DecoMark({ size = 18 }: { size?: number }) {
  return (
    <svg className="deco-mark" width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path d="M9 1.5L16.5 9 9 16.5 1.5 9z" fill="none" stroke="var(--sage)" strokeWidth={1} />
      <path d="M9 5.5L12.5 9 9 12.5 5.5 9z" fill="var(--ivory)" />
    </svg>
  )
}

/** Three diamonds lit in sequence, like marquee bulbs: the one motion the interface uses for "working". */
export function Marquee({ className }: { className?: string }) {
  return (
    <span className={`marquee${className ? ` ${className}` : ''}`} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}
