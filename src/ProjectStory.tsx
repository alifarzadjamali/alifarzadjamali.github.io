import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { content, type Project } from './content'

type SceneFactory = (canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, onPhase: (phase: number) => void) => () => void
export type SceneLoader = () => Promise<SceneFactory>

/** Lazy loaders for each project's scroll-driven scene, keyed by the project's visual id. */
export const sceneLoaders: Record<Project['visual'], SceneLoader> = {
  fashion: () => import('./story/fashion').then(module => module.createFashionScene),
  floorplan: () => import('./story/floorplan').then(module => module.createFloorplanScene),
  fabric: () => import('./story/fabric').then(module => module.createFabricScene),
  benchmark: () => import('./story/benchmark').then(module => module.createBenchmarkScene),
  language: () => import('./story/language').then(module => module.createLanguageScene),
}

const ACCENTS = ['var(--orange)', 'var(--turquoise)', 'var(--king)', 'var(--pink)', 'var(--lime)']

/** Whether pinned 3D stories can run (WebGL2 and no reduced-motion preference). Decided after mount. */
export function useStoriesEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let webgl = false
    try { webgl = !!document.createElement('canvas').getContext('webgl2') } catch { webgl = false }
    if (!reduced && webgl) setEnabled(true)
  }, [])
  return enabled
}

/**
 * All projects share one pinned screen. Each project owns an invisible scroll "track" (its slice of the
 * tall wrapper) that drives its scene; between tracks the screen holds while the next project fades in.
 */
export function ProjectStories({ enabled, fallback }: { enabled: boolean; fallback: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(false)
  const on = enabled && !failed
  const fail = useCallback(() => setFailed(true), [])

  useEffect(() => {
    if (!on) return
    let frame = 0
    const update = () => {
      frame = 0
      const wrapper = wrapperRef.current
      const track = wrapper?.querySelector<HTMLElement>('.project-track')
      if (!wrapper || !track) return
      const slice = track.offsetHeight
      // --lead holds the first project still for a moment before its track starts
      const y = -wrapper.getBoundingClientRect().top - track.offsetTop
      const index = Math.floor((y - (slice - window.innerHeight) - window.innerHeight / 2) / slice) + 1
      setActive(Math.min(content.projects.length - 1, Math.max(0, index)))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [on])

  if (!on) return <>{fallback}</>

  return (
    <div ref={wrapperRef} className="project-stories" style={{ '--count': content.projects.length } as CSSProperties}>
      {content.projects.map((project, index) => <div key={project.number} id={`project-${project.number}`} className="project-track" style={{ '--i': index } as CSSProperties} aria-hidden="true" />)}
      <div className="project-stories-sticky">
        {content.projects.map((project, index) => <ProjectLayer key={project.number} project={project} index={index} active={index === active} onFail={fail} wrapper={wrapperRef} />)}
      </div>
    </div>
  )
}

function ProjectLayer({ project, index, active, onFail, wrapper }: { project: Project; index: number; active: boolean; onFail: () => void; wrapper: RefObject<HTMLDivElement | null> }) {
  const layerRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState(0)
  // Page switch (S3): name this layer's pills, kicker and title right before navigating, so the detail page's
  // matching elements morph from them (cross-document view transition; see styles.css "Page switch").
  const tagShared = () => {
    document.querySelectorAll<HTMLElement>('[data-vt]').forEach(el => { el.style.viewTransitionName = ''; delete el.dataset.vt })
    const layer = layerRef.current
    if (!layer) return
    for (const [selector, name] of [['.project-story-index', 'project-pills'], ['.project-story-meta', 'project-kicker'], ['h3', 'project-title']] as const) {
      const el = layer.querySelector<HTMLElement>(selector)
      if (el) { el.style.viewTransitionName = name; el.dataset.vt = '' }
    }
  }
  const slug = project.repository.split('/').pop()

  useEffect(() => {
    const track = wrapper.current?.querySelectorAll<HTMLElement>('.project-track')[index]
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!track || !canvas || !stage) return
    let disposed = false
    let cleanup: (() => void) | undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      void Promise.all([sceneLoaders[project.visual](), document.fonts.ready]).then(([create]) => {
        if (disposed) return
        try { cleanup = create(canvas, track, stage, setPhase) } catch { onFail() }
      }, onFail)
    }, { rootMargin: '100% 0px' })
    observer.observe(track)
    return () => { disposed = true; observer.disconnect(); cleanup?.() }
  }, [index, project.visual, wrapper, onFail])

  useEffect(() => { if (layerRef.current) layerRef.current.inert = !active }, [active])

  return (
    <article ref={layerRef} className={active ? 'project-story project-layer is-active' : 'project-story project-layer'} style={{ '--accent': ACCENTS[index % ACCENTS.length] } as CSSProperties} aria-labelledby={`project-title-${project.number}`} aria-hidden={!active}>
      <canvas ref={canvasRef} className="project-story-canvas" aria-hidden="true" />
      <div className="container project-story-overlay">
        <div className="project-story-panel">
          <nav className="project-story-index" aria-label="Projects">
            {content.projects.map((item, itemIndex) => <a key={item.number} href={`#project-${item.number}`} aria-current={item.number === project.number ? 'true' : undefined} style={{ '--accent': ACCENTS[itemIndex % ACCENTS.length] } as CSSProperties} title={item.title}>{item.number}</a>)}
          </nav>
          <span className="project-story-meta">{project.number} / {project.category}</span>
          <h3 id={`project-title-${project.number}`}><a href={`/projects/${slug}/`} onClick={tagShared}>{project.title}</a></h3>
          <ol className="project-story-phases">
            {project.stages.map((stage, stageIndex) => (
              <li key={stage.label} className={stageIndex === phase ? 'is-active' : stageIndex < phase ? 'is-done' : undefined} aria-current={stageIndex === phase ? 'step' : undefined}>
                <span className="project-story-phase-label">{String(stageIndex + 1).padStart(2, '0')} {stage.label}</span>
                <p>{stage.description}</p>
              </li>
            ))}
          </ol>
          <div className="project-story-links">
            <a className="text-link" href={`/projects/${slug}/`} onClick={tagShared}>Read project details</a>
            <a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} repository (opens in a new tab)`}>Repository</a>
          </div>
        </div>
        <div ref={stageRef} className="project-story-stage" aria-hidden="true" />
      </div>
    </article>
  )
}
