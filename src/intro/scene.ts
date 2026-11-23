/**
 * Intro scroll scene (Canvas 2D). Timeline over pinned scroll progress p ∈ [0, 1]:
 *   0.03–0.14  hero DOM fades while particles take its place (text glyphs + grid tiles)
 *   0.10–0.44  particles fly into a rotating 3D embedding space with six labelled clusters
 *   0.44–0.62  embedding holds and rotates
 *   0.62–0.90  particles settle into the About section's text
 *   0.88–0.97  real About DOM fades in, canvas fades out
 * Then a reading pause, then phase 2 over p2 ∈ [0, 1] (About → projects, "convolution channels"):
 *   0.02–0.06  About DOM fades, its text becomes dots
 *   0.05–0.22  dots wrap a rotating sphere
 *   0.24–0.34  the sphere splits into 4 orbiting channel-spheres (red, cyan, white, red)
 *   0.40–0.62  the dots slowly leave the spheres and spell "Selected work."
 *   0.70–0.89  the dots fly into the first project's text
 *   0.895–1    the stage turns transparent, revealing the real first project pinned underneath
 */

type RGB = [number, number, number]
type Point = { x: number; y: number; c: RGB; s: number }
type Particle = { sx: number; sy: number; sc: RGB; ss: number; tx: number; ty: number; tc: RGB; ts: number; ex: number; ey: number; ez: number; k: number; seed: number; swirl: number }

const CLUSTERS = [
  { label: 'COMPUTER VISION', color: '--brand-red' },
  { label: 'LLM & NLP', color: '--brand-cyan' },
  { label: 'RESPONSIBLE AI', color: '--brand-white' },
  { label: 'RETRIEVAL', color: '--brand-cyan' },
  { label: 'EVALUATION', color: '--brand-white' },
  { label: 'ENGINEERING', color: '--brand-red' },
]
const MAX_PARTICLES = 4200
/** Scroll lengths (vh): phase 1, reading pause on About, phase 2. Keep in sync with .intro height in styles.css. */
const T1 = 280
const PAUSE = 70
const T2 = 380

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

/** Resolve any CSS colour (vars, color-mix) to RGB via a probe element and a 1×1 canvas. */
function makeColorResolver(host: HTMLElement) {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  host.append(probe)
  const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const cache = new Map<string, RGB>()
  const resolve = (value: string): RGB => {
    const hit = cache.get(value)
    if (hit) return hit
    probe.style.color = ''
    probe.style.color = value
    const computed = getComputedStyle(probe).color
    let rgb: RGB = [246, 244, 242]
    if (pixel) {
      pixel.clearRect(0, 0, 1, 1)
      pixel.fillStyle = '#f6f4f2'
      pixel.fillStyle = computed
      pixel.fillRect(0, 0, 1, 1)
      const d = pixel.getImageData(0, 0, 1, 1).data
      rgb = [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]
    }
    cache.set(value, rgb)
    return rgb
  }
  return { resolve, dispose: () => probe.remove() }
}

function stretchKeyword(value: string): CanvasFontStretch {
  const n = parseFloat(value)
  if (!Number.isFinite(n) || n <= 100) return 'normal'
  if (n < 118) return 'semi-expanded'
  if (n < 140) return 'expanded'
  return 'extra-expanded'
}

/** Sample real glyph pixels of every visible text node under `root`, line by line. */
function sampleText(root: HTMLElement, origin: DOMRect, resolve: (v: string) => RGB, scratch: CanvasRenderingContext2D): Point[] {
  const points: Point[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    const parent = node.parentElement
    if (!parent || !text.trim() || parent.closest('.sr-only, [aria-hidden="true"] svg, .tile-defs')) continue
    const style = getComputedStyle(parent)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    const size = parseFloat(style.fontSize)
    const color = resolve(style.color)
    const upper = style.textTransform === 'uppercase'
    // group characters into rendered lines
    const lines: { text: string; left: number; top: number; height: number }[] = []
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getClientRects()[0]
      if (!r || r.width === 0) { if (lines.length) lines[lines.length - 1]!.text += text[i]; continue }
      const line = lines[lines.length - 1]
      if (line && Math.abs(r.top - line.top) < r.height / 2) line.text += text[i]
      else lines.push({ text: text[i]!, left: r.left, top: r.top, height: r.height })
    }
    scratch.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    scratch.fontStretch = stretchKeyword(style.fontStretch)
    scratch.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
    scratch.fillStyle = '#fff'
    const step = clamp(Math.round(size / 8), 3, 6)
    for (const line of lines) {
      const content = (upper ? line.text.toUpperCase() : line.text).replace(/\s+/g, ' ')
      if (!content.trim()) continue
      const m = scratch.measureText(content)
      const w = Math.ceil(m.width) + 8
      const h = Math.ceil(line.height) + 8
      if (w > scratch.canvas.width || h > scratch.canvas.height) continue
      scratch.clearRect(0, 0, w, h)
      scratch.fillText(content, 2, 2 + (m.fontBoundingBoxAscent || size * 0.8))
      const data = scratch.getImageData(0, 0, w, h).data
      const offset = Math.floor(Math.random() * step)
      for (let y = offset; y < h; y += step) for (let x = offset; x < w; x += step) {
        if ((data[(y * w + x) * 4 + 3] ?? 0) > 120) points.push({ x: line.left - origin.left + x - 2, y: line.top - origin.top + y - 2, c: color, s: step * 0.9 })
      }
    }
  }
  return points
}

/** Grid tiles become little brand-coloured squares of particles. */
function sampleTiles(root: HTMLElement, origin: DOMRect, resolve: (v: string) => RGB): (Point & { k: number })[] {
  const points: (Point & { k: number })[] = []
  root.querySelectorAll<HTMLElement>('.stagger-grid > span').forEach(tile => {
    const r = tile.getBoundingClientRect()
    const color = resolve(tile.style.getPropertyValue('--c') || '#888')
    const k = Number(tile.dataset.field ?? Math.floor(Math.random() * 3))
    const cx = r.left + r.width / 2 - origin.left
    const cy = r.top + r.height / 2 - origin.top
    const g = r.width * 0.2
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) points.push({ x: cx + i * g, y: cy + j * g, c: color, s: g * 0.9, k })
  })
  return points
}

function resample<T>(list: T[], n: number): T[] {
  if (!list.length) return []
  const out: T[] = []
  if (list.length >= n) {
    const copy = [...list]
    for (let i = 0; i < n; i++) { const j = i + Math.floor(Math.random() * (copy.length - i)); [copy[i], copy[j]] = [copy[j]!, copy[i]!]; out.push(copy[i]!) }
    return out
  }
  for (let i = 0; i < n; i++) out.push(list[i < list.length ? i : Math.floor(Math.random() * list.length)]!)
  return out
}

export function createIntroScene(canvas: HTMLCanvasElement, wrapper: HTMLElement, stage: HTMLElement): () => void {
  const ctx = canvas.getContext('2d')
  const heroLayer = stage.querySelector<HTMLElement>('.intro-hero')
  const aboutLayer = stage.querySelector<HTMLElement>('.intro-about')
  if (!ctx || !heroLayer || !aboutLayer) throw new Error('intro scene: missing elements')
  const colors = makeColorResolver(stage)
  const scratch = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  scratch.canvas.width = 2400
  scratch.canvas.height = 260
  const clusterRGB = CLUSTERS.map(c => colors.resolve(`var(${c.color})`))
  const labelRGB = colors.resolve('var(--fg-3)')
  // cluster centres spread on a sphere
  const centres = CLUSTERS.map((_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / CLUSTERS.length)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    return [Math.sin(phi) * Math.cos(theta), Math.cos(phi) * 0.8, Math.sin(phi) * Math.sin(theta)] as const
  })

  let particles: Particle[] = []
  let width = 0, height = 0, dpr = 1
  let progress = 0
  let progress2 = 0
  let sampled = false
  let sampled2 = false
  /** Phase-2 targets, aligned with particles: title glyph (h*) and first-project glyph (p*). */
  let targets2: { hx: number; hy: number; hs: number; px: number; py: number; pc: RGB; ps: number; fade: boolean }[] = []
  const channelRGB = ['--brand-red', '--brand-cyan', '--brand-white', '--brand-red'].map(v => colors.resolve(`var(${v})`))
  let titleTop = 0
  let frame = 0
  let running = false
  const start = performance.now()

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    width = stage.clientWidth
    height = stage.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    sampled = false
    sampled2 = false
  }

  const sample = () => {
    const origin = stage.getBoundingClientRect()
    const tiles = sampleTiles(heroLayer, origin, colors.resolve)
    const heroText = sampleText(heroLayer, origin, colors.resolve, scratch)
    const aboutText = sampleText(aboutLayer, origin, colors.resolve, scratch)
    const sources: (Point & { k: number })[] = [...tiles, ...heroText.map(p => ({ ...p, k: 3 + Math.floor(Math.random() * 3) }))]
    const n = Math.min(MAX_PARTICLES, Math.max(sources.length, aboutText.length))
    const src = resample(sources, n)
    const dst = resample(aboutText.length ? aboutText : [{ x: width / 2, y: height / 2, c: labelRGB, s: 2 }], n)
    particles = src.map((s, i) => {
      const t = dst[i]!
      const k = Math.random() < 0.85 ? s.k : Math.floor(Math.random() * CLUSTERS.length)
      const c = centres[k]!
      // soft-capped spread: clusters keep a loose, organic outline instead of flinging stray points across the screen
      const spread = Math.random() < 0.06 ? 0.38 : 0.2
      const soft = () => 2 * Math.tanh(gauss() / 2) * spread
      return { sx: s.x, sy: s.y, sc: s.c, ss: s.s, tx: t.x, ty: t.y, tc: t.c, ts: t.s, ex: c[0] + soft(), ey: c[1] + soft(), ez: c[2] + soft(), k, seed: Math.random(), swirl: (Math.random() - 0.5) * 160 }
    })
    sampled = true
  }

  const sample2 = () => {
    const stageRect = stage.getBoundingClientRect()
    // "Selected work." in the site's display face, centred on the stage
    const size = Math.round(Math.min(width * 0.1, 150))
    const title = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    title.canvas.width = width
    title.canvas.height = height
    title.font = `800 ${size}px "Archivo Variable", "Helvetica Neue", Arial, sans-serif`
    title.fontStretch = 'expanded'
    title.letterSpacing = `${-size * 0.035}px`
    title.textAlign = 'center'
    title.textBaseline = 'middle'
    title.fillStyle = '#fff'
    title.fillText('Selected work.', width / 2, height * 0.5)
    titleTop = height * 0.5 - size * 0.62
    const td = title.getImageData(0, 0, width, height).data
    const step = Math.max(3, Math.round(size / 24))
    const titlePts: { x: number; y: number }[] = []
    for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) if ((td[(y * width + x) * 4 + 3] ?? 0) > 128) titlePts.push({ x, y })
    // the first project's text, where it will sit once its pinned screen takes over
    const layer = document.querySelector<HTMLElement>('.project-stories .project-layer')
    const sticky = layer?.parentElement
    const headerTop = parseFloat(getComputedStyle(stage).top) || 0
    let projectPts: Point[] = []
    if (layer && sticky) {
      const r = sticky.getBoundingClientRect()
      projectPts = sampleText(layer, { left: stageRect.left, top: r.top + headerTop } as DOMRect, colors.resolve, scratch)
    }
    const n = particles.length
    const tp = resample(titlePts.length ? titlePts : [{ x: width / 2, y: height / 2 }], n)
    const pp = projectPts.length ? resample(projectPts, n) : null
    targets2 = tp.map((t, i) => {
      const q = pp?.[i]
      return q
        ? { hx: t.x, hy: t.y, hs: step * 0.95, px: q.x, py: q.y, pc: q.c, ps: q.s, fade: false }
        : { hx: t.x, hy: t.y, hs: step * 0.95, px: t.x + (Math.random() - 0.5) * width, py: t.y + (Math.random() - 0.5) * height, pc: labelRGB, ps: 1, fade: true }
    })
    sampled2 = true
  }

  const project = (x: number, y: number, z: number, angle: number) => {
    const tilt = 0.38
    const cosA = Math.cos(angle), sinA = Math.sin(angle)
    const x1 = x * cosA + z * sinA
    const z1 = -x * sinA + z * cosA
    const y1 = y * Math.cos(tilt) - z1 * Math.sin(tilt)
    const z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt)
    const persp = 3.2 / (3.2 + z2)
    const scale = Math.min(width, height) * 0.26
    return { x: width / 2 + x1 * scale * persp, y: height * 0.47 + y1 * scale * persp, depth: persp }
  }

  const draw = (now: number) => {
    const p = progress
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const alpha = smooth(0.02, 0.1, p) * (1 - smooth(0.9, 0.975, p))
    if (alpha <= 0 || !particles.length) return
    const angle = (now - start) * 0.00012 + p * 5
    const fly = p < 0.5 ? smooth(0.1, 0.44, p) : 1
    const settle = smooth(0.62, 0.9, p)
    const embedAlpha = smooth(0.36, 0.46, p) * (1 - smooth(0.6, 0.68, p))

    // axes + labels behind the points
    if (embedAlpha > 0) {
      ctx.lineWidth = 1
      for (const axis of [[1.25, 0, 0], [0, 1.05, 0], [0, 0, 1.25]] as const) {
        const a = project(-axis[0], -axis[1], -axis[2], angle)
        const b = project(axis[0], axis[1], axis[2], angle)
        ctx.strokeStyle = `rgba(${labelRGB.join(',')},${0.22 * embedAlpha})`
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      }
      // a few edges from points to their cluster centre
      for (let i = 0; i < particles.length; i += 23) {
        const q = particles[i]!
        const pp = project(q.ex, q.ey, q.ez, angle)
        const c = centres[q.k]!
        const cc = project(c[0], c[1], c[2], angle)
        ctx.strokeStyle = `rgba(${clusterRGB[q.k]!.join(',')},${0.16 * embedAlpha})`
        ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.lineTo(cc.x, cc.y); ctx.stroke()
      }
    }

    for (const q of particles) {
      const t1 = easeInOut(clamp((fly - q.seed * 0.25) / 0.75))
      const t2 = easeInOut(clamp((settle - (q.tx / Math.max(1, width)) * 0.25) / 0.75))
      const e = project(q.ex, q.ey, q.ez, angle)
      // source → embedding, with a sideways swirl mid-flight
      let x = lerp(q.sx, e.x, t1) + Math.sin(Math.PI * t1) * q.swirl
      let y = lerp(q.sy, e.y, t1) - Math.sin(Math.PI * t1) * q.swirl * 0.4
      // embedding → about text
      x = lerp(x, q.tx, t2) + Math.sin(Math.PI * t2) * q.swirl * 0.6
      y = lerp(y, q.ty, t2)
      const ec = clusterRGB[q.k]!
      const mid: RGB = [lerp(q.sc[0], ec[0], t1), lerp(q.sc[1], ec[1], t1), lerp(q.sc[2], ec[2], t1)]
      const r = lerp(mid[0], q.tc[0], t2), g = lerp(mid[1], q.tc[1], t2), b = lerp(mid[2], q.tc[2], t2)
      const embedSize = 2.4 * e.depth
      const size = lerp(lerp(q.ss, embedSize, t1), q.ts, t2)
      const depthFade = lerp(1, 0.45 + 0.55 * (e.depth - 0.6), t1 * (1 - t2))
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha * clamp(depthFade, 0.25, 1)})`
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    }

    if (embedAlpha > 0) {
      ctx.font = '600 22px "JetBrains Mono Variable", ui-monospace, monospace'
      ctx.textAlign = 'center'
      CLUSTERS.forEach((cluster, i) => {
        const c = centres[i]!
        const pos = project(c[0], c[1] - 0.5, c[2], angle)
        ctx.fillStyle = `rgba(${clusterRGB[i]!.join(',')},${embedAlpha * clamp(pos.depth, 0.5, 1)})`
        ctx.fillText(cluster.label, pos.x, pos.y)
      })
      ctx.textAlign = 'left'
      ctx.font = '500 11px "JetBrains Mono Variable", ui-monospace, monospace'
      ctx.fillStyle = `rgba(${labelRGB.join(',')},${embedAlpha})`
      ctx.fillText(`EMBEDDING SPACE · ${CLUSTERS.length} CLUSTERS · ${particles.length.toLocaleString('en-GB')} POINTS`, Math.max(24, (width - 1320) / 2), height - 30)
    }
  }

  const draw2 = (now: number) => {
    const p = progress2
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const alpha = smooth(0, 0.04, p) * (1 - smooth(0.92, 0.975, p))
    if (alpha <= 0 || !particles.length || targets2.length !== particles.length) return
    const wrap = easeInOut(smooth(0.05, 0.22, p))
    const split = easeInOut(smooth(0.24, 0.34, p)) * (1 - easeInOut(smooth(0.4, 0.56, p)))
    const form = easeInOut(smooth(0.4, 0.62, p))
    const release = easeInOut(smooth(0.7, 0.89, p))
    const cx = width / 2, cy = height * 0.48
    const Rs = Math.min(width, height) * 0.3
    // the 4 channel spheres orbit in the screen plane (side + up/down) so each filter stays visible,
    // and the whole orbit stays inside the content window (container width, stage height)
    const rs = Rs * 0.4
    const boxW = Math.min(width - 64, 1320) / 2, boxH = height / 2 - 24
    const ax = Math.max(rs * 1.4, Math.min(boxW - rs * 1.25, width * 0.2))
    const ay = Math.max(rs * 1.2, Math.min(boxH - rs * 1.25, Rs * 0.85))
    const rot = (now - start) * 0.0003 + p * 6
    const orbit = p * 5
    for (let i = 0; i < particles.length; i++) {
      const q = particles[i]!, t = targets2[i]!
      const ch = i % 4
      const lon = (q.tx / width - 0.5) * Math.PI * 2 + rot * (ch % 2 ? 1 : -1), lat = (q.ty / height - 0.5) * Math.PI * 0.92
      const R = lerp(Rs, rs, split)
      const oa = orbit + (ch / 4) * Math.PI * 2
      const sx = Math.cos(lat) * Math.sin(lon) * R + Math.cos(oa) * ax * split
      const sy = Math.sin(lat) * R + Math.sin(oa) * ay * split
      const sz = Math.cos(lat) * Math.cos(lon) * R + Math.sin(oa) * Rs * 0.12 * split
      // About glyph → sphere / channels → title glyph → project glyph
      let x = lerp(q.tx - cx, sx, wrap), y = lerp(q.ty - cy, sy, wrap), z = lerp(0, sz, wrap)
      x = lerp(x, t.hx - cx, form); y = lerp(y, t.hy - cy, form); z = lerp(z, 0, form)
      x = lerp(x, t.px - cx, release); y = lerp(y, t.py - cy, release); z = lerp(z, 0, release)
      const f = 900 / (900 - z)
      const tint = channelRGB[ch]!
      const titleC = i % 7 === 0 ? channelRGB[0]! : channelRGB[2]!
      const c1: RGB = [lerp(q.tc[0], tint[0], split * 0.85), lerp(q.tc[1], tint[1], split * 0.85), lerp(q.tc[2], tint[2], split * 0.85)]
      const c2: RGB = [lerp(c1[0], titleC[0], form), lerp(c1[1], titleC[1], form), lerp(c1[2], titleC[2], form)]
      const c: RGB = [lerp(c2[0], t.pc[0], release), lerp(c2[1], t.pc[1], release), lerp(c2[2], t.pc[2], release)]
      const size = lerp(lerp(lerp(q.ts, 2.2 * f, wrap), t.hs, form), t.ps, release)
      const depth = z < -R * 0.2 ? 0.35 : 1
      const a = alpha * lerp(depth, 1, form) * (t.fade ? 1 - release : 1)
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
      ctx.fillRect(cx + x * f - size / 2, cy + y * f - size / 2, size, size)
    }
    const kicker = smooth(0.52, 0.62, p) * (1 - smooth(0.7, 0.76, p))
    if (kicker > 0) {
      ctx.font = '500 12px "JetBrains Mono Variable", ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = `rgba(${channelRGB[0]!.join(',')},${kicker})`
      ctx.fillText('02 / FEATURED PROJECTS', width / 2, titleTop - 18)
      ctx.textAlign = 'left'
    }
    const caption = smooth(0.26, 0.31, p) * (1 - smooth(0.38, 0.42, p))
    if (caption > 0) {
      ctx.font = '500 11px "JetBrains Mono Variable", ui-monospace, monospace'
      ctx.fillStyle = `rgba(${labelRGB.join(',')},${caption})`
      ctx.fillText('4 FEATURE CHANNELS · CONV + RELU', Math.max(24, (width - 1320) / 2), height - 30)
    }
  }

  const render = (now: number) => { if (progress2 > 0) draw2(now); else draw(now) }

  const loop = (now: number) => {
    frame = 0
    render(now)
    if (running) frame = requestAnimationFrame(loop)
  }

  const update = () => {
    const top = parseFloat(getComputedStyle(stage).top) || 0
    const vh = window.innerHeight / 100
    const y = top - wrapper.getBoundingClientRect().top
    progress = clamp(y / (T1 * vh))
    progress2 = clamp((y - (T1 + PAUSE) * vh) / (T2 * vh))
    stage.style.setProperty('--hero-o', String(1 - smooth(0.03, 0.14, progress)))
    stage.style.setProperty('--about-o', String(smooth(0.88, 0.97, progress) * (1 - smooth(0.02, 0.06, progress2))))
    stage.style.setProperty('--stage-bg', String(1 - smooth(0.895, 0.96, progress2)))
    stage.classList.toggle('hero-gone', progress > 0.08)
    stage.classList.toggle('about-live', progress > 0.92 && progress2 < 0.03)
    stage.classList.toggle('handed-off', progress2 > 0.92)
    const active1 = progress > 0.015 && progress < 0.985
    const active2 = progress2 > 0 && progress2 < 1
    if ((active1 || active2) && !sampled) sample()
    if (active2 && !sampled2) sample2()
    if (progress <= 0.015) { sampled = false; sampled2 = false } // re-sample next time so it matches the current page
    const active = active1 || active2
    if (active && !running) { running = true; frame = requestAnimationFrame(loop) }
    if (!active && running) { running = false; cancelAnimationFrame(frame); frame = 0; render(performance.now()) }
  }

  resize()
  update()
  const onResize = () => { resize(); update() }
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', onResize)
  return () => {
    running = false
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', onResize)
    colors.dispose()
    stage.style.removeProperty('--hero-o')
    stage.style.removeProperty('--about-o')
    stage.style.removeProperty('--stage-bg')
  }
}
