import * as THREE from 'three'

/**
 * Project-scene palette. `palette.brand = true` maps every saturated colour onto the brand pair
 * (warm hues → brand red, cool hues → brand cyan), keeping lightness so shading survives.
 * Greys, near-black and near-white are left alone.
 */
export const palette = { brand: true }

export function brandRgb(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (s < 0.2 || l < 0.04 || l > 0.94) return [r, g, b]
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (h * 60 + 360) % 360
  const warm = h < 75 || h > 290
  const [th, ts] = warm ? [0, 1] : [184, 0.96]
  const c = (1 - Math.abs(2 * l - 1)) * ts, x = c * (1 - Math.abs(((th / 60) % 2) - 1)), m = l - c / 2
  const [rr, gg, bb] = th < 60 ? [c, x, 0] : th < 180 ? [0, c, x] : th < 240 ? [0, x, c] : [x, 0, c]
  return [rr + m, gg + m, bb + m]
}

export function paintRgb(rgb: [number, number, number]): [number, number, number] {
  return palette.brand ? brandRgb(rgb[0], rgb[1], rgb[2]) : rgb
}

/** Paint a CSS hex colour (#rgb / #rrggbb, optional alpha) for canvas drawing. Other strings pass through. */
export function paintCss(css: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(css)
  if (!m || !palette.brand) return css
  const v = m[1]!.length === 3 ? m[1]!.split('').map(c => c + c).join('') : m[1]!
  const [r, g, b] = brandRgb(parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255)
  const hex = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}${m[2] ?? ''}`
}

/** A THREE.Color from a CSS colour, painted with the current palette. */
export function paintColor(css: string): THREE.Color {
  return new THREE.Color(paintCss(css))
}
