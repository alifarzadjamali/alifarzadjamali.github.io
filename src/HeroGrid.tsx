import { useState, type CSSProperties } from 'react'

const COLS = 11
const ROWS = 11
const COLORS = ['var(--red)', 'var(--coral)', 'var(--orange)', 'var(--yellow)', 'var(--lime)', 'var(--turquoise)', 'var(--sky)', 'var(--king)', 'var(--lavender)', 'var(--pink)']

/** Decorative stagger grid: a ripple of squares radiates from an origin cell; clicking a cell moves the origin. */
export function HeroGrid() {
  const [origin, setOrigin] = useState({ x: (COLS - 1) / 2, y: (ROWS - 1) / 2, run: 0 })
  return (
    <div className="stagger-grid" aria-hidden="true" key={origin.run} style={{ '--cols': COLS } as CSSProperties}>
      {Array.from({ length: COLS * ROWS }, (_, index) => {
        const x = index % COLS
        const y = Math.floor(index / COLS)
        const distance = Math.hypot(x - origin.x, y - origin.y)
        return <span key={index} style={{ '--d': distance.toFixed(2), '--c': COLORS[Math.round(distance) % COLORS.length] } as CSSProperties} onPointerDown={() => setOrigin(current => ({ x, y, run: current.run + 1 }))} />
      })}
    </div>
  )
}
