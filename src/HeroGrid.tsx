import { useMemo, useRef, useState, type CSSProperties } from 'react'
import type { SimpleIcon } from 'simple-icons'
import { ALL_ICONS, brandColor, rasterize, seededShuffle } from './techIcons'

const COLS = 12
const ROWS = 12
const BIG = 24
/** Every tile gets a logo: all 12 icons, 12 times each, in a fixed random order. */
const TILE_ICONS = seededShuffle(Array.from({ length: COLS * ROWS }, (_, i) => ALL_ICONS[i % ALL_ICONS.length]!), 7)

/** Shuffle-bag: every hover takes the next logo; a fresh shuffle starts only after all 12 have shown. */
function shuffled(last?: SimpleIcon) {
  const bag = [...ALL_ICONS]
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j]!, bag[i]!] }
  if (bag[0] === last) bag.push(bag.shift()!)
  return bag
}

function BigIcon({ icon }: { icon: SimpleIcon }) {
  const cells = useMemo(() => rasterize(icon, BIG), [icon])
  const center = (BIG - 1) / 2
  return (
    <div className="morph-layer" style={{ '--brand': brandColor(icon.hex) } as CSSProperties}>
      <div className="big-icon">
        {cells.map((on, i) => <span key={i} className={on ? 'on' : ''} style={{ '--d': Math.hypot((i % BIG) - center, Math.floor(i / BIG) - center).toFixed(1) } as CSSProperties} />)}
      </div>
      <span className="morph-name">{icon.title}</span>
    </div>
  )
}

/** Decorative logo grid: a ripple radiates from an origin tile; clicking moves the origin.
 *  Hovering blows up one tech logo from the current focus area at 24×24 pixels, with its name below. */
export function HeroGrid({ onHover }: { onHover?: (hovering: boolean) => void }) {
  const [origin, setOrigin] = useState({ x: (COLS - 1) / 2, y: (ROWS - 1) / 2, run: 0 })
  const [shown, setShown] = useState<SimpleIcon | null>(null)
  const bag = useRef<SimpleIcon[]>([])
  const lastShown = useRef<SimpleIcon | undefined>(undefined)
  const hovering = shown !== null

  return (
    <div
      className={`stagger-grid${hovering ? ' is-morph' : ''}`}
      aria-hidden="true"
      key={origin.run}
      style={{ '--cols': COLS } as CSSProperties}
      onPointerEnter={event => {
        if (event.pointerType === 'touch') return
        if (!bag.current.length) bag.current = shuffled(lastShown.current)
        const icon = bag.current.shift()!
        lastShown.current = icon
        setShown(icon)
        onHover?.(true)
      }}
      onPointerLeave={() => {
        if (!hovering) return
        setShown(null)
        onHover?.(false)
      }}
    >
      <p className="grid-caption"><span>MY TECH STACK</span> · HOVER TO EXPLORE</p>
      <svg className="tile-defs" width="0" height="0">{ALL_ICONS.map(icon => <symbol key={icon.slug} id={`ti-${icon.slug}`} viewBox="0 0 24 24"><path d={icon.path} /></symbol>)}</svg>
      {TILE_ICONS.map((icon, index) => {
        const x = index % COLS
        const y = Math.floor(index / COLS)
        const distance = Math.hypot(x - origin.x, y - origin.y)
        return <span key={index} data-field={Math.floor(ALL_ICONS.indexOf(icon) / 4)} style={{ '--d': distance.toFixed(2), '--c': brandColor(icon.hex) } as CSSProperties} onPointerDown={() => setOrigin(current => ({ x, y, run: current.run + 1 }))}><svg><use href={`#ti-${icon.slug}`} /></svg></span>
      })}
      {shown && <BigIcon key={shown.slug} icon={shown} />}
    </div>
  )
}
