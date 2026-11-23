import * as THREE from 'three'

/** Shared garment icons (atlas) and the tiled dress silhouette used by the fashion scenes. */
export const GARMENTS = ['top', 'cardigan', 'skirt', 'trousers', 'bag', 'shoe', 'hat', 'coat'] as const
export type Garment = (typeof GARMENTS)[number]

export function drawGarment(ctx: CanvasRenderingContext2D, type: Garment, cx: number, cy: number, s: number) {
  const p = (x: number, y: number) => [cx + x * s, cy + y * s] as const
  const poly = (points: [number, number][]) => { ctx.beginPath(); points.forEach(([x, y], i) => { const [px, py] = p(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) }); ctx.closePath(); ctx.fill() }
  switch (type) {
    case 'top': poly([[-0.35, -0.6], [-0.12, -0.68], [0, -0.55], [0.12, -0.68], [0.35, -0.6], [0.75, -0.3], [0.55, -0.05], [0.38, -0.18], [0.38, 0.65], [-0.38, 0.65], [-0.38, -0.18], [-0.55, -0.05], [-0.75, -0.3]]); break
    case 'cardigan': poly([[-0.35, -0.68], [0, -0.4], [0.35, -0.68], [0.6, -0.55], [0.78, 0.6], [0.55, 0.62], [0.45, -0.05], [0.42, 0.72], [-0.42, 0.72], [-0.45, -0.05], [-0.55, 0.62], [-0.78, 0.6], [-0.6, -0.55]]); ctx.fillStyle = '#302e2d'; for (const y of [-0.15, 0.1, 0.35]) { const [x0, y0] = p(0, y); ctx.beginPath(); ctx.arc(x0, y0, s * 0.05, 0, Math.PI * 2); ctx.fill() } break
    case 'skirt': poly([[-0.32, -0.6], [0.32, -0.6], [0.32, -0.45], [0.7, 0.6], [-0.7, 0.6], [-0.32, -0.45]]); break
    case 'trousers': poly([[-0.4, -0.7], [0.4, -0.7], [0.48, 0.72], [0.12, 0.72], [0, -0.2], [-0.12, 0.72], [-0.48, 0.72]]); break
    case 'bag': { const [hx, hy] = p(0, -0.25); ctx.lineWidth = s * 0.1; ctx.strokeStyle = ctx.fillStyle as string; ctx.beginPath(); ctx.arc(hx, hy, s * 0.3, Math.PI, 0); ctx.stroke(); const [bx, by] = p(-0.62, -0.22); ctx.beginPath(); ctx.roundRect(bx, by, s * 1.24, s * 0.85, s * 0.14); ctx.fill(); break }
    case 'shoe': poly([[-0.8, 0.05], [-0.25, 0.0], [0.05, -0.35], [0.4, -0.35], [0.55, 0.0], [0.82, 0.15], [0.82, 0.4], [-0.8, 0.4]]); break
    case 'hat': { const [ex, ey] = p(0, 0.25); ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.85, s * 0.2, 0, 0, Math.PI * 2); ctx.fill(); const [dx, dy] = p(0, 0.2); ctx.beginPath(); ctx.ellipse(dx, dy, s * 0.45, s * 0.55, 0, Math.PI, 0); ctx.fill(); break }
    case 'coat': poly([[-0.3, -0.75], [0, -0.35], [0.3, -0.75], [0.6, -0.6], [0.72, 0.5], [0.52, 0.52], [0.45, 0.0], [0.48, 0.8], [-0.48, 0.8], [-0.45, 0.0], [-0.52, 0.52], [-0.72, 0.5], [-0.6, -0.6]]); break
  }
}

/** 4×2 atlas of garment cards; UV offset for index i is ((i % 4) * 0.25, i < 4 ? 0.5 : 0). */
export function garmentAtlas() {
  const cell = 256
  const canvas = document.createElement('canvas')
  canvas.width = cell * 4
  canvas.height = cell * 2
  const ctx = canvas.getContext('2d')!
  GARMENTS.forEach((type, index) => {
    const x = (index % 4) * cell
    const y = Math.floor(index / 4) * cell
    ctx.fillStyle = '#302e2d'
    ctx.fillRect(x, y, cell, cell)
    ctx.fillStyle = '#d5d3d1'
    drawGarment(ctx, type, x + cell / 2, y + cell / 2, cell * 0.36)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4
  return texture
}
export const atlasOffset = (index: number) => [(index % 4) * 0.25, index < 4 ? 0.5 : 0] as const

/** Dress silhouette sampled on a grid: [x, y] cell coordinates (centred) plus a 0–1 shade per cell. */
export function dressCells(step = 8) {
  const W = 240
  const H = 340
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'
  ctx.lineWidth = 10
  ctx.beginPath(); ctx.moveTo(94, 6); ctx.lineTo(99, 66); ctx.moveTo(146, 6); ctx.lineTo(141, 66); ctx.stroke()
  // Bodice with a sweetheart neckline, tapering to the waist.
  ctx.beginPath()
  ctx.moveTo(92, 66)
  ctx.quadraticCurveTo(104, 52, 118, 70)
  ctx.lineTo(122, 70)
  ctx.quadraticCurveTo(136, 52, 148, 66)
  ctx.quadraticCurveTo(150, 110, 142, 150)
  ctx.lineTo(98, 150)
  ctx.quadraticCurveTo(90, 110, 92, 66)
  ctx.fill()
  // Flared skirt with a scalloped hem.
  ctx.beginPath()
  ctx.moveTo(98, 146)
  ctx.lineTo(142, 146)
  ctx.quadraticCurveTo(190, 220, 226, 316)
  const scallops = 6
  for (let i = 0; i < scallops; i++) {
    const x0 = 226 - (i * 212) / scallops
    const x1 = 226 - ((i + 1) * 212) / scallops
    ctx.quadraticCurveTo((x0 + x1) / 2, 336, x1, 316 + Math.sin((i + 1) / scallops * Math.PI) * 6)
  }
  ctx.quadraticCurveTo(50, 220, 98, 146)
  ctx.fill()
  const data = ctx.getImageData(0, 0, W, H).data
  const cols = Math.floor(W / step)
  const rows = Math.floor(H / step)
  const cells: { x: number; y: number; shade: number }[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const px = c * step + step / 2
    const py = r * step + step / 2
    if (data[(Math.floor(py) * W + Math.floor(px)) * 4]! < 128) continue
    let shade = 0.92
    if (py > 140 && py < 156) shade = 1.12
    else if (py >= 156) { const angle = Math.atan2(px - 120, py - 120); shade = 0.8 + 0.22 * (0.5 + 0.5 * Math.cos(angle * 16)) + (py - 156) / 900 }
    else if (py > 66) shade = 1.0 - Math.abs(px - 120) / 160
    cells.push({ x: c - (cols - 1) / 2, y: (rows - 1) / 2 - r, shade })
  }
  return cells
}
