/**
 * Bento → CV + Contact transition (T4).
 * Both screens are rasterised from their live DOM (backgrounds + text runs) into a coarse token grid.
 * Start: the whole bento turns into glyph tokens at once (it fades out while the tokens speckle in, "soft dissolve").
 * Middle: retrieval-augmented generation: the page shrinks into retrieved sources and a grounded answer is drafted beside
 * it, every block citing its source (see ./groundedAnswer.ts).
 * End: the whole page decodes at once (tokens speckle out while the real CV/Contact DOM fades in).
 */
import { groundedAnswer as story, type Box, type Cells, type Env } from './groundedAnswer'

const GLYPHS = ' .:-=+*#%@01AIΣλ'
/** Token cell size (px); 13.5×19 gives ~20% fewer tokens than 12×17. */
const CW = 13.5
const CH = 19
const DIM = 'rgba(97,94,91,.5)'
/** Tokens may drift this far (px) outside the content window, so its edge looks organic instead of ruled. */
const SPILL = 48
/** Scroll length of the whole transition in vh (must match MORPH in RecordSection.tsx). */
export const SHUFFLE_VH = 260
/**
 * Timeline as fractions of the transition: the page tokenizes over [E0, E1] ("soft dissolve"), the story plays over
 * [E1, D0], the page decodes over [D0, D1]. Speckle: each token fades over OWN, starting at a random point within SPREAD.
 */
const E0 = 0.015, E1 = 0.185, D0 = 0.815, D1 = 0.985
const SPREAD = 0.046, OWN = 0.123

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }

function parseColor(value: string): [number, number, number, number] | null {
  const m = value.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const [r = 0, g = 0, b = 0, a = 1] = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number)
  return a > 0.02 ? [r, g, b, a] : null
}

/** Paint a layer's backgrounds and text runs into a canvas, then sample one value per token cell. */
/** `k` is the on-screen scale of the stage (rects are measured on screen, the canvas works in unscaled px). */
function rasterize(layer: HTMLElement, origin: DOMRect, k: number, cols: number, rows: number, base: string): Cells {
  const w = Math.ceil(cols * CW), h = Math.ceil(rows * CH)
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h)
  for (const el of [layer, ...layer.querySelectorAll<HTMLElement>('*')]) {
    const style = getComputedStyle(el)
    const bg = parseColor(style.backgroundColor)
    if (!bg || style.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    ctx.fillStyle = `rgba(${bg.join(',')})`
    ctx.beginPath(); ctx.roundRect((r.left - origin.left) / k, (r.top - origin.top) / k, r.width / k, r.height / k, Math.min(parseFloat(style.borderTopLeftRadius) || 0, r.height / k / 2)); ctx.fill()
  }
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || !node.parentElement) continue
    const style = getComputedStyle(node.parentElement)
    const color = parseColor(style.color)
    if (!color || style.visibility === 'hidden') continue
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${color[3] * 0.9})`
    range.selectNodeContents(node)
    for (const r of range.getClientRects()) if (r.width) ctx.fillRect((r.left - origin.left) / k, (r.top - origin.top + r.height * 0.18) / k, r.width / k, (r.height * 0.64) / k)
  }
  const data = ctx.getImageData(0, 0, w, h).data
  const lum = new Float32Array(cols * rows), colorOut: string[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = (Math.floor(r * CH + CH / 2) * w + Math.floor(c * CW + CW / 2)) * 4
    const l = (0.2126 * data[k]! + 0.7152 * data[k + 1]! + 0.0722 * data[k + 2]!) / 255
    lum[r * cols + c] = l
    colorOut.push(l < 0.18 ? DIM : `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`)
  }
  return { lum, color: colorOut }
}

/** Named element boxes (for stories that work with the page layout, e.g. object detection). */
function boxesOf(root: HTMLElement, origin: DOMRect, k: number, list: [string, (el: HTMLElement) => string][]): Box[] {
  const out: Box[] = []
  for (const [selector, label] of list) for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect()
    if (r.width && r.height) out.push({ x: (r.left - origin.left) / k, y: (r.top - origin.top) / k, w: r.width / k, h: r.height / k, label: label(el) })
  }
  return out
}
const tileLabel = (el: HTMLElement) => {
  const kicker = el.querySelector('.record-kicker')?.textContent?.replace(/[0-9]/g, '').trim().toLowerCase()
  return kicker || 'metric'
}

/** `stage` is the (possibly scaled) box holding the layers and the canvas; all positions are kept in its unscaled px. */
export function createTokenShuffle(stage: HTMLElement, layer: HTMLElement, finale: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  // the animation lives inside the bento's content window; the finale is placed in the exact same box
  const bento = layer.querySelector<HTMLElement>('.record-inner') ?? layer
  let width = 0, height = 0, cols = 0, rows = 0
  let src: Cells | null = null, dst: Cells | null = null
  let srcBoxes: Box[] = [], dstBoxes: Box[] = []
  let rand = new Float32Array(0), r2 = new Float32Array(0), r3 = new Float32Array(0), ax = new Float32Array(0), ay = new Float32Array(0)
  let cache: Record<string, unknown> = {}
  let last = -1, p = 0, px = 1
  /** On-screen scale of the stage (CSS transform), so measured rects can be turned back into layout px. */
  const scaleOf = () => (stage.offsetWidth ? stage.getBoundingClientRect().width / stage.offsetWidth : 1)

  const layout = () => {
    const s = stage.getBoundingClientRect(), b = bento.getBoundingClientRect(), k = scaleOf()
    width = b.width / k; height = b.height / k
    stage.style.setProperty('--box-l', `${(b.left - s.left) / k}px`)
    stage.style.setProperty('--box-t', `${(b.top - s.top) / k}px`)
    stage.style.setProperty('--box-w', `${width}px`)
    stage.style.setProperty('--box-h', `${height}px`)
    cols = Math.ceil(width / CW); rows = Math.ceil(height / CH)
    // draw at the exact on-screen resolution: layout px × the stage's fit scale × device pixel ratio, so one canvas pixel
    // is one screen pixel (a canvas at layout resolution would be resampled by the scale and look soft)
    px = Math.min(3, window.devicePixelRatio || 1) * k
    canvas.width = Math.round((width + SPILL * 2) * px); canvas.height = Math.round((height + SPILL * 2) * px)
    ctx.setTransform(px, 0, 0, px, SPILL * px, SPILL * px)
    const n = cols * rows
    let seed = 7
    const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    rand = Float32Array.from({ length: n }, next)
    r2 = Float32Array.from({ length: n }, next)
    r3 = Float32Array.from({ length: n }, next)
    ax = Float32Array.from({ length: n }, () => next() * 2 - 1)
    ay = Float32Array.from({ length: n }, () => next() * 2 - 1)
    src = dst = null
  }

  const capture = () => {
    const origin = bento.getBoundingClientRect(), k = scaleOf()
    const base = getComputedStyle(layer).backgroundColor
    src = rasterize(bento, origin, k, cols, rows, base)
    dst = rasterize(finale, origin, k, cols, rows, base)
    srcBoxes = boxesOf(bento, origin, k, [['.record-title', () => 'title'], ['.record-tile', tileLabel]])
    dstBoxes = boxesOf(finale, origin, k, [['.cv-panel', () => 'cv_card'], ['.contact-section .section-heading', () => 'heading'], ['.contact-email', () => 'email'], ['.contact-topic', () => 'form'], ['.contact-links', () => 'links'], ['.site-footer', () => 'footer']])
    cache = {}
  }

  // dark background cells get faint dots; ink cells (text, buttons, cards) get a varied glyph so text lines don't flatten into one character
  const glyph = (cells: Cells, i: number, jitter = 0) => {
    const l = cells.lum[i]!
    const base = l < 0.18 ? Math.floor(l * 16) : 4 + Math.floor(((rand[i]! * 9973 + l * 7) % 1) * (GLYPHS.length - 4))
    return GLYPHS[(base + jitter) % GLYPHS.length]!
  }
  /** Speckle alpha of token i: fades in during the tokenize window and out during the decode window. */
  const speckle = (i: number) => {
    const t = ((rand[i]! * 7919) % 1) * SPREAD
    return smooth(E0 + t, E0 + OWN + t, p) * (1 - smooth(D0 + t, D0 + OWN + t, p))
  }

  const env: Env = {
    ctx, CW, CH, GLYPHS,
    get px() { return px },
    snap: v => Math.round(v * px) / px,
    get width() { return width }, get height() { return height }, get cols() { return cols }, get rows() { return rows },
    get n() { return cols * rows }, get rand() { return rand }, get r2() { return r2 }, get r3() { return r3 }, get ax() { return ax }, get ay() { return ay },
    get src() { return src! }, get dst() { return dst! }, get srcBoxes() { return srcBoxes }, get dstBoxes() { return dstBoxes }, get cache() { return cache },
    hx: i => (i % cols) * CW + CW / 2,
    hy: i => Math.floor(i / cols) * CH + CH / 2,
    glyph,
    token(i, x, y, options = {}) {
      const a = speckle(i) * (options.alpha ?? 1)
      if (a <= 0.004) return
      const cells = options.cells ?? src!
      ctx.globalAlpha = Math.min(1, a)
      ctx.fillStyle = options.color ?? cells.color[i]!
      ctx.fillText(options.char ?? glyph(cells, i, options.jitter ?? 0), x, y)
    },
    label(text, x, y, options = {}) {
      if ((options.alpha ?? 1) <= 0.004) return
      ctx.save()
      ctx.globalAlpha = Math.min(1, options.alpha ?? 1)
      ctx.font = `${options.weight ?? 600} ${options.size ?? 18}px "JetBrains Mono Variable", ui-monospace, monospace`
      ctx.textAlign = options.align ?? 'left'; ctx.textBaseline = 'middle'
      if (options.background) {
        const w = ctx.measureText(text).width, s = options.size ?? 18, pad = s * 0.4
        const left = options.align === 'center' ? x - w / 2 : options.align === 'right' ? x - w : x
        ctx.fillStyle = options.background
        ctx.beginPath(); ctx.roundRect(left - pad, y - s * 0.75, w + pad * 2, s * 1.5, 4); ctx.fill()
      }
      ctx.fillStyle = options.color ?? '#f6f4f2'
      ctx.fillText(text, x, y)
      ctx.restore()
    },
  }

  /** Tokens resting at home (before / after the story). */
  const homes = (cells: Cells) => { for (let i = 0; i < cols * rows; i++) env.token(i, env.hx(i), env.hy(i), { cells }) }

  function render(progress: number) {
    if (progress === last) return
    last = progress; p = progress
    if (p <= 0 || p >= 1) {
      ctx.clearRect(-SPILL, -SPILL, width + SPILL * 2, height + SPILL * 2)
      bento.style.opacity = ''; bento.style.visibility = p >= 1 ? 'hidden' : ''
      finale.style.opacity = p >= 1 ? '1' : '0'
      if (p <= 0) src = dst = null // re-capture next time (content may have reflowed)
      return
    }
    if (!src || !dst) capture()
    // whole page at once: the bento fades into tokens, and later the tokens fade into CV + Contact
    const enc = smooth(E0, E1, p), dec = smooth(D0, D1, p)
    bento.style.visibility = enc >= 1 ? 'hidden' : ''
    bento.style.opacity = String(1 - enc)
    finale.style.opacity = String(dec)

    ctx.clearRect(-SPILL, -SPILL, width + SPILL * 2, height + SPILL * 2)
    if (enc <= 0 || dec >= 1) return
    ctx.font = '700 14px "JetBrains Mono Variable", ui-monospace, monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const m = clamp((p - E1) / (D0 - E1))
    if (m <= 0) homes(src!)
    else if (m >= 1) homes(dst!)
    else story.draw(env, m)
    ctx.globalAlpha = 1
  }

  layout()
  return {
    render,
    resize() { layout(); const q = last; last = -1; render(Math.max(0, q)) },
    dispose() { bento.style.opacity = ''; bento.style.visibility = ''; finale.style.opacity = '' },
  }
}
