/** Procedurally drawn source image for the "How a machine sees" section: three simple objects on a floor. */
export const GRID = 16
export const IMG = 768

export type VisionObject = { id: number; name: string; score: string; color: string; box: [number, number, number, number] }

export const OBJECTS: VisionObject[] = [
  { id: 1, name: 'sphere', score: '0.98', color: '#ff4b4b', box: [115, 385, 345, 615] },
  { id: 2, name: 'cube', score: '0.95', color: '#00ffaa', box: [456, 400, 664, 640] },
  { id: 3, name: 'cylinder', score: '0.91', color: '#a369ff', box: [315, 164, 485, 496] },
]
export const BACKGROUND_COLOR = '#615e5b'

const HORIZON = 470

function cylinder(ctx: CanvasRenderingContext2D, flat?: string) {
  ctx.beginPath()
  ctx.moveTo(315, 190)
  ctx.lineTo(315, 470)
  ctx.ellipse(400, 470, 85, 26, 0, Math.PI, 0, true)
  ctx.lineTo(485, 190)
  ctx.closePath()
  if (flat) ctx.fillStyle = flat
  else {
    const body = ctx.createLinearGradient(315, 0, 485, 0)
    body.addColorStop(0, '#5b3699'); body.addColorStop(0.45, '#a369ff'); body.addColorStop(0.62, '#c7a4ff'); body.addColorStop(1, '#6d45b3')
    ctx.fillStyle = body
  }
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(400, 190, 85, 26, 0, 0, Math.PI * 2)
  ctx.fillStyle = flat ?? '#d6c0ff'
  ctx.fill()
}

function sphere(ctx: CanvasRenderingContext2D, flat?: string) {
  ctx.beginPath()
  ctx.arc(230, 500, 115, 0, Math.PI * 2)
  if (flat) ctx.fillStyle = flat
  else {
    const shade = ctx.createRadialGradient(190, 455, 10, 230, 500, 118)
    shade.addColorStop(0, '#ffb0a8'); shade.addColorStop(0.35, '#ff4b4b'); shade.addColorStop(1, '#7d1f1f')
    ctx.fillStyle = shade
  }
  ctx.fill()
}

function cube(ctx: CanvasRenderingContext2D, flat?: string) {
  const faces: [number[][], string][] = [
    [[[456, 460], [560, 520], [664, 460], [560, 400]], '#86ffd6'],
    [[[456, 460], [560, 520], [560, 640], [456, 580]], '#00dc97'],
    [[[560, 520], [664, 460], [664, 580], [560, 640]], '#00996b'],
  ]
  for (const [points, color] of faces) {
    ctx.beginPath()
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)))
    ctx.closePath()
    ctx.fillStyle = flat ?? color
    ctx.fill()
  }
}

export function drawSource(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON)
  sky.addColorStop(0, '#222120'); sky.addColorStop(1, '#2f2d2b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, IMG, HORIZON)
  const floor = ctx.createLinearGradient(0, HORIZON, 0, IMG)
  floor.addColorStop(0, '#3b3836'); floor.addColorStop(1, '#2a2827')
  ctx.fillStyle = floor
  ctx.fillRect(0, HORIZON, IMG, IMG - HORIZON)
  ctx.strokeStyle = '#4a474433'
  ctx.lineWidth = 2
  for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(IMG / 2 + i * 30, HORIZON); ctx.lineTo(IMG / 2 + i * 150, IMG); ctx.stroke() }
  for (let i = 1; i < 7; i++) { const y = HORIZON + (IMG - HORIZON) * (i / 7) ** 1.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(IMG, y); ctx.stroke() }
  ctx.fillStyle = '#00000055'
  for (const [x, y, rx, ry] of [[400, 478, 105, 22], [245, 612, 112, 20], [575, 640, 120, 18]] as const) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill() }
  cylinder(ctx); sphere(ctx); cube(ctx)
}

/** Per-tile class id (0 = background) from a flat label map, using majority coverage. */
export function tileClasses(): number[] {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = IMG
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, IMG, IMG)
  cylinder(ctx, 'rgb(3,0,0)'); sphere(ctx, 'rgb(1,0,0)'); cube(ctx, 'rgb(2,0,0)')
  const data = ctx.getImageData(0, 0, IMG, IMG).data
  const size = IMG / GRID
  const classes: number[] = []
  for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
    const counts = [0, 0, 0, 0]
    for (let sy = 0; sy < 6; sy++) for (let sx = 0; sx < 6; sx++) {
      const x = Math.floor(gx * size + (sx + 0.5) * size / 6)
      const y = Math.floor(gy * size + (sy + 0.5) * size / 6)
      const id = data[(y * IMG + x) * 4]!; counts[id] = (counts[id] ?? 0) + 1
    }
    let best = 1
    for (let id = 2; id < 4; id++) if (counts[id]! > counts[best]!) best = id
    classes.push(counts[best]! >= 14 ? best : 0)
  }
  return classes
}

export function drawLabel(ctx: CanvasRenderingContext2D, text: string, color: string, x: number, y: number, fontSize: number) {
  ctx.font = `600 ${fontSize}px "JetBrains Mono Variable", ui-monospace, monospace`
  const padX = fontSize * 0.5
  const width = ctx.measureText(text).width + padX * 2
  const height = fontSize * 1.6
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, fontSize * 0.3)
  ctx.fill()
  ctx.fillStyle = '#252423'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + height / 2 + 1)
}

/** Static fallback: the finished result (masks, boxes, labels) drawn in 2D. */
export function drawAnnotated(ctx: CanvasRenderingContext2D) {
  drawSource(ctx)
  const classes = tileClasses()
  const size = IMG / GRID
  classes.forEach((id, index) => {
    const x = (index % GRID) * size
    const y = Math.floor(index / GRID) * size
    if (id === 0) { ctx.fillStyle = '#25242399'; ctx.fillRect(x, y, size, size); return }
    ctx.fillStyle = OBJECTS[id - 1]!.color + '59'
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2)
  })
  for (const object of OBJECTS) {
    const [x1, y1, x2, y2] = object.box
    ctx.strokeStyle = object.color
    ctx.lineWidth = 4
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    drawLabel(ctx, `${object.name} ${object.score}`, object.color, x1 - 2, y1 - 38, 22)
  }
}
