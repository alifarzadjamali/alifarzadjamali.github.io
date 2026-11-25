import { useEffect, useState, type CSSProperties } from 'react'
import { DetailHeader } from './ProjectPage'
import { SiteFooter } from './SiteFooter'
import { RIG_ENTRY_KEY } from './rig/egg'
import specs from './rig/specs.json'

type Component = (typeof specs.components)[number]

const CATEGORIES = ['All', 'Core', 'Storage', 'Desk'] as const
const STAT_LABELS = ['Processor', 'Graphics', 'Memory', 'Storage']
const STATUS: Record<string, { label: string; tone: string }> = {
  detected: { label: 'Detected', tone: 'is-cyan' },
  'usb-match': { label: 'USB ID match', tone: 'is-plain' },
  owner: { label: 'Owner confirmed', tone: 'is-red' },
}

/* ---------- Pixel-art case (Lian Li O11 Mini-ish): a dual-chamber glass box with fans that breathe ---------- */
// [colour, x, y, w, h, extra class]
const CASE: [string, number, number, number, number, string?][] = [
  ['glass', 1, 1, 22, 20],
  ['frame', 0, 0, 24, 1], ['frame', 0, 21, 24, 1], ['frame', 0, 0, 1, 22], ['frame', 23, 0, 1, 22],
  ['dim', 18, 1, 1, 20], // chamber divider
  ['dark', 2, 1, 15, 3], // radiator
  ['cyan', 3, 2, 3, 1, 'fan f1'], ['cyan', 8, 2, 3, 1, 'fan f2'], ['cyan', 13, 2, 3, 1, 'fan f3'],
  ['dim', 8, 4, 1, 3], ['dim', 11, 4, 1, 3], // hoses
  ['frame', 7, 7, 6, 4], ['cyan', 9, 8, 2, 2, 'fan f2'], // CPU block
  ['red', 14, 6, 1, 6], ['red', 16, 6, 1, 6], // RAM
  ['dark', 2, 13, 15, 3], ['red', 2, 15, 15, 1], ['cyan', 15, 13, 1, 1, 'noise'], // GPU
  ['dark', 2, 17, 15, 3],
  ['cyan', 3, 18, 3, 1, 'fan f3'], ['cyan', 8, 18, 3, 1, 'fan f1'], ['cyan', 13, 18, 3, 1, 'fan f2'], // bottom intake
  ['dim', 20, 3, 2, 1], ['dim', 20, 5, 2, 1], ['dark', 19, 14, 4, 6], ['red', 20, 3, 1, 1, 'noise'], // back chamber + PSU
  ['frame', 2, 22, 3, 1], ['frame', 19, 22, 3, 1], // feet
]

function PixelCase() {
  return (
    <svg className="rig-case" viewBox="0 0 24 23" shapeRendering="crispEdges" aria-hidden="true">
      {CASE.map(([tone, x, y, w, h, extra], i) => <rect key={i} className={`px-${tone}${extra ? ` ${extra}` : ''}`} x={x} y={y} width={w} height={h} />)}
    </svg>
  )
}

/* ---------- Arrival: the maximised terminal from the "cd .rig" trip fades into the page ----------
   Coming through an easter egg, the screen already says HYPERION. and simply fades out. A direct visit types the
   boot command first. Timing is pure CSS, so the overlay also clears without JavaScript. */
/** Read once per page load (effects run twice in dev StrictMode, and the flag is removed on first read). */
let cameFromEgg: boolean | undefined
function readEntry() {
  if (cameFromEgg === undefined) {
    try { cameFromEgg = sessionStorage.getItem(RIG_ENTRY_KEY) === '1'; sessionStorage.removeItem(RIG_ENTRY_KEY) } catch { cameFromEgg = false }
  }
  return cameFromEgg
}

function RigArrival() {
  const [direct, setDirect] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('egg-running')
    const fromEgg = readEntry()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setGone(true); return }
    setDirect(!fromEgg)
    const skip = () => setGone(true)
    window.addEventListener('keydown', skip, { once: true })
    window.addEventListener('pointerdown', skip, { once: true })
    return () => { window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip) }
  }, [])

  if (gone) return null
  return (
    <div className={`rig-arrive${direct ? ' is-direct' : ''}`} aria-hidden="true" onAnimationEnd={event => { if (event.target === event.currentTarget) setGone(true) }}>
      {direct && <div className="rig-arrive-log"><p><span className="egg-p">visitor@hyperion:~$</span> <span className="rig-arrive-cmd">cd .rig &amp;&amp; ./boot</span></p><p className="egg-c">booting {specs.name}…</p></div>}
      <div className="egg-hyp">{specs.name}<span>.</span></div>
    </div>
  )
}

function PartCard({ part, index }: { part: Component; index: number }) {
  const status = STATUS[part.status] ?? STATUS.owner!
  return (
    <article className="record-tile rig-part" style={{ '--i': index } as CSSProperties}>
      <div className="rig-part-head"><span className="rig-part-icon" aria-hidden="true">{part.icon}</span><span>{String(index + 1).padStart(2, '0')} / {part.category}</span></div>
      <em className="rig-part-role">{part.role}</em>
      <h3>{part.name}</h3>
      <ul>{part.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>
      <div className="rig-part-foot">
        <span className={`record-tag ${status.tone}`}>{status.label}</span>
        {part.source && <a href={part.source} target="_blank" rel="noopener noreferrer" aria-label={`${part.name} model specs (opens in a new tab)`}>Model specs ↗</a>}
      </div>
    </article>
  )
}

export function RigPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const shown = specs.components.filter(part => category === 'All' || part.category === category)
  const total = String(specs.components.length).padStart(2, '0')

  return <div className="site-shell detail-page rig-page">
    <RigArrival />
    <a className="skip-link" href="#main">Skip to content</a>
    <DetailHeader current="" />
    <main id="main" tabIndex={-1}>
      <section className="detail-hero rig-hero" aria-labelledby="rig-title">
        <div className="container rig-hero-inner">
          <div>
            <span className="project-story-meta">?? / You found the rig</span>
            <h1 id="rig-title" className="detail-title">{specs.name}<span>.</span></h1>
            <p className="rig-tagline">Built to <em>go beyond.</em></p>
            <p className="detail-lead">A living record of every component powering {specs.name}, the machine this site is built on, from the silicon inside the case to the tools on the desk.</p>
          </div>
          <figure className="rig-art">
            <PixelCase />
            <figcaption><span>System / {specs.name}</span><span>Configuration 001</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="detail-notes rig-notes" aria-labelledby="rig-parts-title">
        <div className="container">
          <div className="rig-stats">
            {specs.hero.map((value, i) => <div className="record-tile record-stat rig-stat" key={value}><span>0{i + 1} / {STAT_LABELS[i]}</span><b>{value}</b></div>)}
          </div>

          <div className="rig-parts-head">
            <h2 id="rig-parts-title" className="record-title">Inside the <span>system.</span></h2>
            <p>Choose a category to explore the parts. Every card separates what this PC reports from published model specifications.</p>
          </div>
          <div className="rig-filter-row">
            <div className="project-filters rig-filters" role="group" aria-label="Filter components">
              {CATEGORIES.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <p className="project-result-count" role="status">{String(shown.length).padStart(2, '0')} / {total}</p>
          </div>
          <div className="rig-grid" key={category}>
            {shown.map(part => <PartCard key={part.name} part={part} index={specs.components.indexOf(part)} />)}
          </div>

          <div className="rig-archive">
            <div className="record-tile rig-archive-copy">
              <h3 className="record-kicker"><span>01</span>THE ARCHIVE</h3>
              <p className="rig-archive-title">Hardware changes. <em>The record follows.</em></p>
              <p className="detail-text">Inventory collected on {new Date(specs.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}. Manufacturer specifications describe the model; they are not live measurements of this exact machine.</p>
            </div>
            <div className="record-tile rig-legend">
              <h3 className="record-kicker"><span>02</span>HOW IT WAS VERIFIED</h3>
              <div className="record-row is-tight"><span className="record-tag is-cyan">Detected</span><i>Reported by Windows on this PC</i></div>
              <div className="record-row is-tight"><span className="record-tag is-plain">USB ID match</span><i>Model inferred from the device's USB ID</i></div>
              <div className="record-row is-tight"><span className="record-tag is-red">Owner confirmed</span><i>Parts Windows can't see, confirmed by me</i></div>
            </div>
          </div>

          <nav className="detail-more rig-exit" aria-label="Leave the rig">
            <a className="record-tile detail-step" href="/"><em>BACK TO THE VISIBLE SITE</em><b>Farzad Jamali</b></a>
            <a className="record-tile detail-step is-next" href="/#projects" style={{ '--accent': 'var(--brand-red)' } as CSSProperties}><em>WHAT IT BUILDS</em><b>Selected projects</b></a>
          </nav>
        </div>
      </section>
    </main>
    <SiteFooter top="#main" />
  </div>
}

export const isRigPath = (path: string) => path.replace(/\/?$/, '/') === '/rig/'
