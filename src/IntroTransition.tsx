import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Pinned intro runs only on roomy screens without a reduced-motion preference. Decided after mount. */
export function useIntroEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const room = window.matchMedia('(min-width: 901px) and (min-height: 620px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(room.matches && !reduced.matches)
    update()
    room.addEventListener('change', update)
    reduced.addEventListener('change', update)
    return () => { room.removeEventListener('change', update); reduced.removeEventListener('change', update) }
  }, [])
  return enabled
}

/**
 * Hero → embedding space → About, on one pinned screen. Scrolling through the tall wrapper dissolves the
 * hero into particles, spins them as a 3D embedding, then settles them into the About text.
 */
export function IntroTransition({ enabled, hero, about }: { enabled: boolean; hero: ReactNode; about: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return
    const wrapper = wrapperRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!wrapper || !stage || !canvas) return
    let disposed = false
    let cleanup: (() => void) | undefined
    void Promise.all([import('./intro/scene'), document.fonts.ready]).then(([{ createIntroScene }]) => {
      if (disposed) return
      try { cleanup = createIntroScene(canvas, wrapper, stage) } catch { /* scene is decorative; DOM still works */ }
    })
    return () => { disposed = true; cleanup?.() }
  }, [enabled])

  if (!enabled) return <>{hero}{about}</>
  return (
    <div className="intro" id="top" ref={wrapperRef}>
      <div className="intro-stage" ref={stageRef}>
        <div className="intro-hero">{hero}</div>
        <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
        <div className="intro-about">{about}</div>
      </div>
      <div className="intro-anchor" id="about" aria-hidden="true" />
    </div>
  )
}
