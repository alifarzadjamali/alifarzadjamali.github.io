/** "Glitch F" pixel logo: a bold F with red/sky channel split, dissolving into noise at the bottom. */
const GRID = [
  '............',
  '..rwwwwwwwws',
  '...rwwwwwwww',
  '..rwws......',
  '..rwws......',
  '...rwwwwwws.',
  '.rwwwwwws...',
  '..rwws......',
  '..rwws......',
  '...w.n......',
  '..r.w.......',
  '....n.......',
]
const COLORS: Record<string, string> = { w: 'var(--fg-1)', r: 'var(--red)', s: 'var(--sky)', n: 'var(--sky)' }

/** One path per colour, so there are no hairline seams between pixels. */
const PATHS = Object.keys(COLORS).map(key => ({
  key,
  d: GRID.flatMap((row, y) => [...row].map((cell, x) => (cell === key ? `M${x} ${y}h1v1h-1z` : ''))).join(''),
}))

export function PixelLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      {PATHS.map(path => <path key={path.key} className={path.key === 'n' ? 'logo-noise' : undefined} d={path.d} fill={COLORS[path.key]} />)}
    </svg>
  )
}
