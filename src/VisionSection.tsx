import { useEffect, useRef, useState, type CSSProperties } from 'react'

const STEPS = [
  { label: 'INPUT', title: 'An image is a grid of numbers.', text: 'To a model, a photo is only pixel values. Nothing in it is labelled yet.', color: 'var(--red)' },
  { label: 'PATCHES', title: 'Split it into patches.', text: 'The image is cut into small squares, so each region can be looked at on its own.', color: 'var(--coral)' },
  { label: 'TOKENS', title: 'Read patches as a sequence.', text: 'Each patch becomes a token, much like a word in a sentence, and the model reads them in order.', color: 'var(--yellow)' },
  { label: 'EMBEDDINGS', title: 'Similar patches group together.', text: 'In embedding space, patches that look alike sit close to each other and form clusters.', color: 'var(--turquoise)' },
  { label: 'UNDERSTANDING', title: 'Clusters become objects.', text: 'Mapped back onto the image, the clusters give masks, boxes and labels.', color: 'var(--king)' },
]

export function VisionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'static' | 'scroll'>('static')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let webgl = false
    try { webgl = !!document.createElement('canvas').getContext('webgl2') } catch { webgl = false }
    if (!reduced && webgl) setMode('scroll')
  }, [])

  useEffect(() => {
    if (mode !== 'static') return
    let cancelled = false
    void Promise.all([import('./vision/image'), document.fonts.ready]).then(([{ drawAnnotated }]) => {
      const context = staticRef.current?.getContext('2d')
      if (!cancelled && context) drawAnnotated(context)
    })
    return () => { cancelled = true }
  }, [mode])

  useEffect(() => {
    if (mode !== 'scroll') return
    const section = sectionRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!section || !canvas || !stage) return
    let disposed = false
    let cleanup: (() => void) | undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      void Promise.all([import('./vision/scene'), document.fonts.ready]).then(([{ createVisionScene }]) => {
        if (disposed) return
        try { cleanup = createVisionScene(canvas, section, stage, setStep) } catch { setMode('static') }
      }, () => setMode('static'))
    }, { rootMargin: '100% 0px' })
    observer.observe(section)
    return () => { disposed = true; observer.disconnect(); cleanup?.() }
  }, [mode])

  return (
    <section ref={sectionRef} className={`vision vision-${mode}`} id="vision" aria-labelledby="vision-title">
      <div className="vision-sticky">
        <canvas ref={canvasRef} className="vision-canvas" aria-hidden="true" />
        <div className="container vision-overlay">
          <div className="vision-text">
          <h2 id="vision-title" className="section-kicker"><span>00</span><span>HOW A MACHINE SEES</span></h2>
          <ol className="vision-steps">
            {STEPS.map((item, index) => (
              <li key={item.label} className={index === step ? 'is-active' : undefined} style={{ '--accent': item.color } as CSSProperties} aria-current={mode === 'scroll' && index === step ? 'step' : undefined}>
                <span className="vision-step-label">{String(index + 1).padStart(2, '0')} / {item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
          <div className="vision-progress" aria-hidden="true">{STEPS.map((item, index) => <span key={item.label} className={index <= step ? 'is-done' : undefined} style={{ '--accent': item.color } as CSSProperties} />)}</div>
          <p className="vision-note">Illustration of the idea, not real model output.</p>
          </div>
          <div ref={stageRef} className="vision-stage" aria-hidden="true" />
        </div>
        <canvas ref={staticRef} className="vision-static-canvas" width={768} height={768} role="img" aria-label="A simple scene with a sphere, a cube and a cylinder. Each object has a coloured mask, a detection box and a label." />
      </div>
    </section>
  )
}
