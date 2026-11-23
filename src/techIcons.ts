import {
  siFastapi, siHuggingface, siJupyter, siLangchain, siNumpy, siOpenai, siOpencv, siPandas, siPython, siPytorch, siScikitlearn, siStreamlit,
  type SimpleIcon,
} from 'simple-icons'

/** Tech stack for each focus area, in the same order as content.focus. */
export const STACKS: SimpleIcon[][] = [
  [siPytorch, siOpencv, siNumpy, siPython],
  [siHuggingface, siOpenai, siLangchain, siFastapi],
  [siScikitlearn, siPandas, siJupyter, siStreamlit],
]

export const ALL_ICONS = STACKS.flat()

/** Brand colour, lifted when too dark to read on the charcoal background. */
export function brandColor(hex: string) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
  return lum < 0.2 ? `color-mix(in srgb, #${hex} 50%, #fff)` : `#${hex}`
}

/** Which cells of an n×n grid the 24×24 logo covers (browser only). */
export function rasterize(icon: SimpleIcon, n: number): boolean[] {
  const scale = 8
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = n * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.scale((n * scale) / 24, (n * scale) / 24)
  ctx.fill(new Path2D(icon.path))
  const data = ctx.getImageData(0, 0, n * scale, n * scale).data
  const cells: boolean[] = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let sum = 0
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) sum += data[((y * scale + sy) * n * scale + x * scale + sx) * 4 + 3] ?? 0
    cells.push(sum / (scale * scale * 255) > 0.42)
  }
  return cells
}

/** Deterministic shuffle (same result on server and client, so hydration matches). */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let s = seed
  const rand = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j] as T, out[i] as T] }
  return out
}
