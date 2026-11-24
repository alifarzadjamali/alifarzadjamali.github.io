/**
 * The story in the middle of the Research → CV + Contact transition (src/record/tokenShuffle.ts):
 * retrieval-augmented generation, "grounded answer + citations".
 * It gets the page as a grid of glyph tokens and a progress m ∈ (0, 1). At m → 0 tokens must sit at home
 * showing the bento (`src`), at m → 1 at home showing CV + Contact (`dst`), so the dissolve in and out stays seamless.
 */
export type Cells = { lum: Float32Array; color: string[] }
export type Box = { x: number; y: number; w: number; h: number; label: string }
type TokenOptions = { cells?: Cells; color?: string; alpha?: number; char?: string; jitter?: number }
type LabelOptions = { color?: string; size?: number; align?: CanvasTextAlign; alpha?: number; weight?: number; background?: string }
export type Env = {
  ctx: CanvasRenderingContext2D; CW: number; CH: number; GLYPHS: string
  /** Device pixels per layout px on screen (fit scale × devicePixelRatio); `snap` rounds a layout coordinate to a device pixel. */
  readonly px: number; snap(v: number): number
  readonly width: number; readonly height: number; readonly cols: number; readonly rows: number; readonly n: number
  readonly rand: Float32Array; readonly r2: Float32Array; readonly r3: Float32Array; readonly ax: Float32Array; readonly ay: Float32Array
  readonly src: Cells; readonly dst: Cells; readonly srcBoxes: Box[]; readonly dstBoxes: Box[]; readonly cache: Record<string, unknown>
  hx(i: number): number; hy(i: number): number
  glyph(cells: Cells, i: number, jitter?: number): string
  token(i: number, x: number, y: number, options?: TokenOptions): void
  label(text: string, x: number, y: number, options?: LabelOptions): void
}
export type Variant = { name: string; idea: string; draw(env: Env, m: number): void }

const RED = '#ff4b4b', CYAN = '#05dbe9', WHITE = '#f6f4f2', GREY = '#9a9794', BG = '#252423'
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const s = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const hash = (n: number) => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296 }
/** Overlay alpha: in shortly after the story starts, out shortly before it ends. */
const la = (m: number) => s(0.02, 0.08, m) * (1 - s(0.92, 0.98, m))

/** Story title above the box (left) and the current step (right). */
function titles(e: Env, m: number, title: string, step: string) {
  const a = la(m)
  e.label(title, 0, -26, { color: RED, size: 20, alpha: a, weight: 700 })
  e.label(step, e.width, -26, { color: CYAN, size: 17, alpha: a, align: 'right', weight: 500 })
}
/** Device pixels per layout px for the frame being drawn (set at the start of each draw). */
let PX = 1
/** Rounds to the device-pixel grid so edges stay crisp instead of anti-aliased across two pixels. */
const snap = (v: number) => Math.round(v * PX) / PX
/** Line width in device pixels (at least 1), back in layout px. */
const lineW = (width: number) => Math.max(1, Math.round(width * PX)) / PX
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number, width = 2, dash: number[] = []) {
  if (alpha <= 0.004) return
  const lw = lineW(width), half = (Math.round(lw * PX) % 2) / PX / 2
  ctx.globalAlpha = Math.min(1, alpha); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash)
  ctx.strokeRect(snap(x) + half, snap(y) + half, snap(x + w) - snap(x), snap(y + h) - snap(y)); ctx.setLineDash([])
}

/* ---------- shared RAG pieces ---------- */
const ASK = 'how do I reach Farzad?'
/** A query box with the question typed in over [t0, t1]. */
function queryBox(e: Env, m: number, t0: number, t1: number, x: number, y: number, w: number, alpha: number) {
  if (alpha <= 0.004) return
  const { ctx } = e
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#302e2d'; ctx.beginPath(); ctx.roundRect(snap(x), snap(y - 27), snap(w), snap(54), 10); ctx.fill(); ctx.restore()
  rect(ctx, x, y - 27, w, 54, RED, alpha, 2)
  const typed = ASK.slice(0, Math.floor(s(t0, t1, m) * ASK.length))
  e.label(`query: “${typed}${m < t1 + 0.02 && Math.floor(m * 90) % 2 ? '▍' : ''}${typed.length === ASK.length ? '”' : ''}`, x + 18, y, { size: 21, color: WHITE, alpha, weight: 500 })
}
/** Which box (index) each token sits in, or -1. Cached per capture. */
function owners(e: Env, boxes: Box[], key: string) {
  const c = e.cache as Record<string, Int16Array | undefined>
  if (!c[key]) {
    const own = new Int16Array(e.n).fill(-1)
    boxes.forEach((b, j) => { for (let i = 0; i < e.n; i++) { const x = e.hx(i), y = e.hy(i); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) own[i] = j } })
    c[key] = own
  }
  return c[key]!
}

/* ---------- RAG: grounded generation with citations ---------- */
export const groundedAnswer: Variant = {
  name: 'Grounded answer + citations', idea: 'the page shrinks into a panel of retrieved sources; the answer is drafted beside it block by block, every block citing its source [1] [2] [3], then the answer fills the screen',
  draw(e, m) {
    PX = e.px
    // mini pages: one solid block per token cell, snapped to whole device pixels (crisp edges, even gaps)
    const bw = Math.max(1, Math.round(4.6 * PX)) / PX, bh = Math.max(1, Math.round(6.6 * PX)) / PX
    const block = (x: number, y: number) => ctx.fillRect(snap(x - bw / 2), snap(y - bh / 2), bw, bh)
    const { ctx, width: W, height: H } = e, a = la(m), sc = 0.42, L0x = W * 0.03, R0x = W * 0.53, T0 = H * 0.24
    const dstOwn = owners(e, e.dstBoxes, 'dstOwn'), nD = Math.max(1, e.dstBoxes.length)
    const mini = (i: number, ox: number): [number, number] => [ox + e.hx(i) * sc, T0 + e.hy(i) * sc]
    const startOf = (j: number) => 0.32 + (j / nD) * 0.36
    const panels = a * s(0.12, 0.2, m) * (1 - s(0.72, 0.8, m))
    queryBox(e, m, 0.16, 0.28, W * 0.03, H * 0.1, W * 0.94, a * s(0.12, 0.18, m) * (1 - s(0.72, 0.8, m)))
    e.label('RETRIEVED SOURCES', L0x, T0 - 26, { size: 17, color: GREY, alpha: panels, weight: 700 })
    e.label('GROUNDED ANSWER', R0x, T0 - 26, { size: 17, color: CYAN, alpha: panels, weight: 700 })
    rect(ctx, L0x - 8, T0 - 8, W * sc + 16, H * sc + 16, GREY, panels * 0.6, 1.5)
    rect(ctx, R0x - 8, T0 - 8, W * sc + 16, H * sc + 16, CYAN, panels * 0.6, 1.5)
    ctx.save()
    const srcA = s(0.1, 0.22, m) * (1 - s(0.78, 0.88, m))
    for (let i = 0; i < e.n; i++) {
      const shrink = s(0.02 + e.rand[i]! * 0.06, 0.2 + e.rand[i]! * 0.06, m)
      if (e.src.lum[i]! > 0.18 && srcA > 0) { const [x, y] = mini(i, L0x); ctx.globalAlpha = srcA * shrink; ctx.fillStyle = e.src.color[i]!; block(x, y) }
      const j = dstOwn[i]!, st = j >= 0 ? startOf(j) : 0.32 + e.rand[i]! * 0.36, ans = s(st, st + 0.05, m), ex = s(0.72 + e.rand[i]! * 0.08, 0.86 + e.rand[i]! * 0.08, m)
      const [ax_, ay_] = mini(i, R0x)
      if (ans > 0 && e.dst.lum[i]! > 0.18 && ex < 1) { ctx.globalAlpha = ans * (1 - ex); ctx.fillStyle = e.dst.color[i]!; block(lerp(ax_, e.hx(i), ex), lerp(ay_, e.hy(i), ex)) }
    }
    ctx.restore()
    for (let i = 0; i < e.n; i++) {
      const shrink = s(0.02 + e.rand[i]! * 0.06, 0.2 + e.rand[i]! * 0.06, m)
      if (shrink < 1) { const [x, y] = mini(i, L0x); e.token(i, lerp(e.hx(i), x, shrink), lerp(e.hy(i), y, shrink), { alpha: 1 - shrink }) }
      const j = dstOwn[i]!, st = j >= 0 ? startOf(j) : 0.32 + e.rand[i]! * 0.36, ff = s(st - 0.02, st + 0.05, m)
      if (ff > 0 && ff < 1 && e.dst.lum[i]! > 0.3 && hash(i * 7) < 0.25) { const [sx, sy] = mini(i, L0x), [tx, ty] = mini(i, R0x); e.token(i, lerp(sx, tx, ff), lerp(sy, ty, ff) - Math.sin(Math.PI * ff) * 40, { cells: e.dst, color: CYAN, alpha: Math.sin(Math.PI * ff) }) }
      const ex = s(0.72 + e.rand[i]! * 0.08, 0.86 + e.rand[i]! * 0.08, m)
      if (ex > 0) { const [x, y] = mini(i, R0x); e.token(i, lerp(x, e.hx(i), ex), lerp(y, e.hy(i), ex), { cells: e.dst, alpha: ex }) }
    }
    e.dstBoxes.forEach((d, j) => {
      const k = e.srcBoxes.length ? Math.floor(hash(j * 13 + 2) * e.srcBoxes.length) : -1, al = a * s(startOf(j), startOf(j) + 0.05, m) * (1 - s(0.72, 0.8, m))
      if (k < 0 || al <= 0) return
      const sb = e.srcBoxes[k]!, x1 = L0x + (sb.x + sb.w) * sc, y1 = T0 + (sb.y + sb.h / 2) * sc, x2 = R0x + d.x * sc, y2 = T0 + (d.y + d.h / 2) * sc
      rect(ctx, L0x + sb.x * sc, T0 + sb.y * sc, sb.w * sc, sb.h * sc, RED, al * 0.95, 2)
      rect(ctx, R0x + d.x * sc, T0 + d.y * sc, d.w * sc, d.h * sc, CYAN, al * 0.95, 2)
      ctx.save(); ctx.globalAlpha = al * 0.8; ctx.strokeStyle = j % 2 ? CYAN : RED; ctx.lineWidth = lineW(2); ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2); ctx.stroke(); ctx.restore()
      e.label(`[${j + 1}]`, x2 - 8, y2, { size: 15, align: 'right', color: BG, background: j % 2 ? CYAN : RED, alpha: al, weight: 700 })
      e.label(`[${j + 1}]`, x1 + 8, y1, { size: 15, color: BG, background: j % 2 ? CYAN : RED, alpha: al, weight: 700 })
    })
    titles(e, m, 'RAG · GROUNDED GENERATION', m < 0.3 ? '1 · retrieve the sources' : m < 0.7 ? '2 · draft the answer · every block cites its source' : '3 · the grounded answer → CV + Contact')
  },
}
