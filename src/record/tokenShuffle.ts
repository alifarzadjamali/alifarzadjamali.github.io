/**
 * Bento → CV + Contact "attention shuffle" (T4).
 * Both screens are rasterised from their live DOM (backgrounds + text runs) into a coarse token grid.
 * Rows of the bento turn into glyph tokens top → bottom, every token flies to a random slot (self-attention mixing),
 * flies home carrying the CV/Contact glyph, then rows decode into the real CV/Contact DOM top → bottom.
 * The real DOM layers stay crisp: they are clipped to the rows that are not tokens yet / already decoded.
 */
const GLYPHS = ' .:-=+*#%@01AIΣλ'
/** Token cell size (px); 13.5×19 gives ~20% fewer tokens than 12×17. */
const CW = 13.5
const CH = 19
const RED = '#ff4b4b'
const CYAN = '#05dbe9'
const DIM = 'rgba(97,94,91,.5)'
/** Tokens may drift this far (px) outside the content window, so its edge looks organic instead of ruled. */
const SPILL = 48

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
/** Mirror-reflect v into [0, size]. */
const fold = (v: number, size: number) => { const m = ((v % (2 * size)) + 2 * size) % (2 * size); return m > size ? 2 * size - m : m }

type Cells = { lum: Float32Array; color: string[] }

function parseColor(value: string): [number, number, number, number] | null {
  const m = value.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const [r = 0, g = 0, b = 0, a = 1] = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number)
  return a > 0.02 ? [r, g, b, a] : null
}

/** Paint a layer's backgrounds and text runs into a canvas, then sample one value per token cell. */
function rasterize(layer: HTMLElement, origin: DOMRect, cols: number, rows: number, base: string): Cells {
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
    ctx.beginPath(); ctx.roundRect(r.left - origin.left, r.top - origin.top, r.width, r.height, Math.min(parseFloat(style.borderTopLeftRadius) || 0, r.height / 2)); ctx.fill()
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
    for (const r of range.getClientRects()) if (r.width) ctx.fillRect(r.left - origin.left, r.top - origin.top + r.height * 0.18, r.width, r.height * 0.64)
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

export function createTokenShuffle(stage: HTMLElement, layer: HTMLElement, finale: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  // the animation lives inside the bento's content window; the finale is placed in the exact same box
  const bento = layer.querySelector<HTMLElement>('.record-inner') ?? layer
  let width = 0, height = 0, cols = 0, rows = 0
  let src: Cells | null = null, dst: Cells | null = null
  let rand = new Float32Array(0), moveX = new Float32Array(0), moveY = new Float32Array(0), reach = new Float32Array(0), jitX = new Float32Array(0), jitY = new Float32Array(0)
  let last = -1

  const layout = () => {
    const s = stage.getBoundingClientRect(), b = bento.getBoundingClientRect()
    width = b.width; height = b.height
    stage.style.setProperty('--box-l', `${b.left - s.left}px`)
    stage.style.setProperty('--box-t', `${b.top - s.top}px`)
    stage.style.setProperty('--box-w', `${width}px`)
    stage.style.setProperty('--box-h', `${height}px`)
    cols = Math.ceil(width / CW); rows = Math.ceil(height / CH)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round((width + SPILL * 2) * dpr); canvas.height = Math.round((height + SPILL * 2) * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, SPILL * dpr, SPILL * dpr)
    const n = cols * rows
    let seed = 7
    const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    rand = Float32Array.from({ length: n }, next)
    // every token travels a random distance and bounces off the window's walls (mirror reflection):
    // a uniform field stays uniform at every moment, so no crowded centre and no empty patch
    moveX = Float32Array.from({ length: n }, () => (next() * 2 - 1) * width * 0.8)
    moveY = Float32Array.from({ length: n }, () => (next() * 2 - 1) * height * 0.8)
    reach = Float32Array.from({ length: n }, () => SPILL * 1.3 * next())
    jitX = Float32Array.from({ length: n }, () => (next() - 0.5) * 14)
    jitY = Float32Array.from({ length: n }, () => (next() - 0.5) * 14)
    src = dst = null
  }

  const capture = () => {
    const origin = bento.getBoundingClientRect()
    const base = getComputedStyle(layer).backgroundColor
    src = rasterize(bento, origin, cols, rows, base)
    dst = rasterize(finale, origin, cols, rows, base)
  }

  // dark background cells get faint dots; ink cells (text, buttons, cards) get a varied glyph so text lines don't flatten into one character
  const glyph = (cells: Cells, i: number, jitter: number) => {
    const l = cells.lum[i]!
    const base = l < 0.18 ? Math.floor(l * 16) : 4 + Math.floor(((rand[i]! * 9973 + l * 7) % 1) * (GLYPHS.length - 4))
    return GLYPHS[(base + jitter) % GLYPHS.length]!
  }

  function render(p: number) {
    if (p === last) return
    last = p
    if (p <= 0 || p >= 1) {
      ctx.clearRect(-SPILL, -SPILL, width + SPILL * 2, height + SPILL * 2)
      bento.style.clipPath = ''; bento.style.visibility = p >= 1 ? 'hidden' : ''
      finale.style.clipPath = ''; finale.style.opacity = p >= 1 ? '1' : '0'
      if (p <= 0) src = dst = null // re-capture next time (content may have reflowed)
      return
    }
    if (!src || !dst) capture()
    const enc = (r: number) => smooth(0.03 + (r / rows) * 0.18, 0.08 + (r / rows) * 0.18, p)
    const dec = (r: number) => smooth(0.8 + (r / rows) * 0.14, 0.86 + (r / rows) * 0.14, p)
    let encoded = 0, decoded = 0
    while (encoded < rows && enc(encoded) > 0) encoded++
    while (decoded < rows && dec(decoded) >= 1) decoded++
    const encY = encoded * CH, decY = Math.min(decoded * CH, height)
    bento.style.visibility = ''
    bento.style.clipPath = `inset(${encY}px 0 0 0)`
    finale.style.opacity = decoded ? '1' : '0'
    finale.style.clipPath = `inset(0 0 ${Math.max(0, height - decY)}px 0)`

    ctx.clearRect(-SPILL, -SPILL, width + SPILL * 2, height + SPILL * 2)
    ctx.fillStyle = getComputedStyle(layer).backgroundColor
    ctx.fillRect(0, decY, width, Math.max(0, Math.min(encY, height) - decY))
    ctx.font = '700 14px "JetBrains Mono Variable", ui-monospace, monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const thinking = p > 0.38 && p < 0.62
    for (let r = decoded; r < encoded; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, d = rand[i]! * 0.08
      const out = smooth(0.24 + d, 0.44 + d, p), back = smooth(0.52 + d, 0.74 + d, p), k = out * (1 - back)
      const x0 = fold(c * CW + CW / 2 + moveX[i]! * k, width), y0 = fold(r * CH + CH / 2 + moveY[i]! * k, height) - Math.sin(Math.PI * k) * 20
      // near the edges, drift outward a little (always a bit, fully while mixing) so the outline is organic, not ruled
      const nx = (x0 / width) * 2 - 1, ny = (y0 / height) * 2 - 1, edge = Math.max(Math.abs(nx), Math.abs(ny)) ** 4, drift = 0.3 + 0.7 * k
      const x = x0 + (nx * edge * reach[i]! + jitX[i]!) * drift, y = y0 + (ny * edge * reach[i]! + jitY[i]!) * drift
      const cells = back > 0.5 ? dst! : src!
      ctx.fillStyle = k > 0.15 && k < 0.85 ? (rand[i]! > 0.5 ? RED : CYAN) : cells.color[i]!
      ctx.fillText(glyph(cells, i, thinking ? Math.floor(rand[i]! * 7 + p * 40) % GLYPHS.length : 0), x, y)
    }
  }

  layout()
  return {
    render,
    resize() { layout(); const p = last; last = -1; render(Math.max(0, p)) },
    dispose() { bento.style.clipPath = ''; bento.style.visibility = ''; finale.style.clipPath = ''; finale.style.opacity = '' },
  }
}
