import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { content } from './content'
import { SHUFFLE_VH, createTokenShuffle } from './record/tokenShuffle'

const ROOMY = '(min-width: 1001px) and (min-height: 700px)'
/** Scroll lengths after the bento is fully revealed (vh): reading hold, then the bento → CV/Contact transition. */
const HOLD = 40
const MORPH = SHUFFLE_VH

const clamp = (v: number) => Math.min(1, Math.max(0, v))

function useRoomy() {
  const [roomy, setRoomy] = useState(false)
  useEffect(() => {
    const query = window.matchMedia(ROOMY)
    const update = () => setRoomy(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return roomy
}

/**
 * Research, work & study on one screen (bento: Education · Research · Experience), then the CV + Contact screen.
 * With the project stories running, this screen sits pinned underneath them and is revealed as the last project slides up;
 * scrolling on, the bento tokenizes, its tokens shuffle like self-attention and decode into CV + Contact on the same pinned screen.
 */
export function RecordSection({ stories, finale }: { stories: boolean; finale: (inStage: boolean) => ReactNode }) {
  const roomy = useRoomy()
  const joined = stories && roomy
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const finaleRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const tokensRef = useRef<HTMLCanvasElement>(null)

  // columns are 5% taller than their content: measure the natural height, then set the grid to 105% (tiles grow, text stays put)
  // (pinned mode does this itself in fitScreen below, so the measurements run in a fixed order)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid || joined) return
    const fit = () => {
      grid.style.height = ''
      if (window.innerWidth <= 1000) return
      grid.style.height = `${Math.round(grid.offsetHeight * 1.05)}px`
    }
    fit()
    void document.fonts.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [joined])

  // bento → CV/Contact progress
  useEffect(() => {
    if (!joined) return
    const wrapper = wrapperRef.current
    const stage = stageRef.current
    const layer = layerRef.current, finaleLayer = finaleRef.current, tokens = tokensRef.current, fitBox = fitRef.current, grid = gridRef.current
    const inner = layer?.querySelector<HTMLElement>('.record-inner'), bento = layer?.querySelector<HTMLElement>('.record-bento')
    if (!wrapper || !stage || !layer || !finaleLayer || !tokens || !fitBox || !grid || !inner || !bento) return
    const shuffle = createTokenShuffle(fitBox, layer, finaleLayer, tokens)
    /**
     * Both screens use fixed-size type, so on shorter laptop screens they are taller than the pinned stage (which clips them).
     * Lay them out at natural size, make the shared box tall enough for CV + Contact too, then scale the whole stage
     * down uniformly until it fits. Tall screens are untouched (scale stays 1).
     */
    const layoutAt = (scale: number) => {
      stage.style.setProperty('--fit', scale.toFixed(4))
      inner.style.minHeight = ''
      grid.style.height = ''
      grid.style.height = `${Math.round(grid.offsetHeight * 1.05)}px`
      shuffle.resize() // places the finale in the bento's box (its width decides how CV + Contact wrap)
      const part = (selector: string) => finaleLayer.querySelector<HTMLElement>(selector)?.offsetHeight ?? 0
      const finaleNeeds = part('.cv-section') + part('.contact-section > .container') + part('.site-footer')
      if (finaleNeeds > inner.offsetHeight) inner.style.minHeight = `${Math.ceil(finaleNeeds)}px`
      // breathing room above and below: ~5% of the screen height per side (24–56px)
      const room = stage.clientHeight - 2 * Math.min(56, Math.max(24, stage.clientHeight * 0.05))
      return Math.min(1, room / bento.offsetHeight)
    }
    // a scaled stage is also laid out wider (width / scale), so text wraps into fewer lines and needs less shrinking;
    // a few passes settle the scale, the last one guarantees it fits
    const fitScreen = () => {
      let scale = 1
      for (let pass = 0; pass < 4; pass++) {
        const next = layoutAt(scale)
        if (Math.abs(next - scale) < 0.005) break
        scale = next
      }
      const fits = Math.min(scale, layoutAt(scale))
      if (fits < scale) { stage.style.setProperty('--fit', fits.toFixed(4)); shuffle.resize() }
    }
    let frame = 0
    const update = () => {
      frame = 0
      const top = parseFloat(getComputedStyle(stage).top) || 0
      const vh = window.innerHeight / 100
      const y = top - wrapper.getBoundingClientRect().top
      const p = clamp((y - window.innerHeight - HOLD * vh) / (MORPH * vh))
      shuffle.render(p)
      stage.classList.toggle('show-finale', p > 0.86)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const resize = () => { fitScreen(); schedule() }
    fitScreen()
    update()
    void document.fonts.ready.then(resize)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame); shuffle.dispose(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resize)
      stage.style.removeProperty('--fit'); inner.style.minHeight = ''; grid.style.height = ''
    }
  }, [joined])

  const { record, research, education } = content
  const jobs = content.experience.map(job => { const [org = '', dates = ''] = job.organization.split(' · '); return { ...job, org, dates } })
  const bento = (
    <section className="record-bento" aria-labelledby="record-title">
      <div className="container record-inner">
        <h2 id="record-title" className="record-title">Research, work <span>&amp; study.</span></h2>
        <div className="record-grid" ref={gridRef}>
          <div className="record-col">
            <div className="record-tile record-stat is-cyan"><b>{record.years.value}</b><span>{record.years.label}</span></div>
            <div className="record-tile record-grow">
              <h3 className="record-kicker"><span>03</span>EDUCATION</h3>
              {education.map(item => <div className="record-row" key={item.title}><em>{item.dates}</em><b>{item.title}</b><i>{item.organization}</i></div>)}
            </div>
            <div className="record-tile record-stat is-small is-cyan is-pair">
              {[record.degrees, record.countries].map(stat => <div className="record-pair" key={stat.title}><b>{stat.value}</b><span><strong>{stat.title}</strong>{stat.label}</span></div>)}
            </div>
          </div>
          <div className="record-col">
            <div className="record-tile record-grow record-research">
              <h3 className="record-kicker"><span>04</span>RESEARCH</h3>
              {research.items.map(item => (
                <div className="record-paper" key={item.title}>
                  <span className={`record-tag is-${item.tone}`}>{item.tag}</span>
                  {item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer"><b>{item.title}</b></a> : <b>{item.title}</b>}
                  <i>{item.meta}</i>
                </div>
              ))}
              <a className="record-link" href={content.links.googleScholar} target="_blank" rel="noopener noreferrer">{research.note}</a>
            </div>
          </div>
          <div className="record-col">
            <div className="record-tile record-stat"><b>{record.members.value}</b><span>{record.members.label}</span></div>
            <div className="record-tile record-grow">
              <h3 className="record-kicker"><span>05</span>EXPERIENCE</h3>
              {jobs.map(job => <div className="record-row is-tight" key={job.title + job.org}><em>{job.dates}</em><b>{job.title}</b><i>{job.org}</i></div>)}
            </div>
            <div className="record-tile record-stat is-small"><b>{record.students.value}</b><span><strong>{record.students.title}</strong>{record.students.label}</span></div>
          </div>
        </div>
      </div>
    </section>
  )

  if (!joined) {
    return (
      <>
        <div className="record">
          <span className="record-anchor" id="research" />
          <span className="record-anchor" id="experience" />
          <span className="record-anchor" id="education" />
          {bento}
        </div>
        {finale(false)}
      </>
    )
  }
  return (
    <div className="record is-joined" ref={wrapperRef} style={{ '--hold': `${HOLD}vh`, '--morph': `${MORPH}vh` } as CSSProperties}>
      <span className="record-anchor" id="research" />
      <span className="record-anchor" id="experience" />
      <span className="record-anchor" id="education" />
      <span className="record-anchor is-end" id="cv" />
      <span className="record-anchor is-end" id="contact" />
      <div className="record-stage" ref={stageRef}>
        <div className="record-fit" ref={fitRef}>
          <div className="record-layer" ref={layerRef}>{bento}</div>
          <div className="record-finale" ref={finaleRef}>{finale(true)}</div>
          <canvas className="record-tokens" ref={tokensRef} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
