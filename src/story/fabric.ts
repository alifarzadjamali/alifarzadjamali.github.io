import * as THREE from 'three'
import { chip, mix, random, runStory, segment, type BuildContext, type StoryScene } from './engine'
import { createTiles, hexRgb, lerpRgb, outline, rectPoints, scaleRgb, type Rgb } from './helpers'

/** Prepare → Inspect → Evaluate: woven fabric is cropped, passed through an encoder–decoder into a defect heatmap, then checked on a holdout set. */
export const PHASE_STARTS = [0, 0.36, 0.66]

const ACCENT = '#4d9cff'
const N = 20
const CELL = 0.2
const SIZE = N * CELL
const CROPS = 4
const TEAR: [number, number, number, number] = [8.5, 10.5, 13.5, 8]
const HOLDOUT = 12
const HOLDOUT_DEFECT = new Set([0, 4, 9])

function distanceToTear(x: number, y: number) {
  const [x0, y0, x1, y1] = TEAR
  const dx = x1 - x0
  const dy = y1 - y0
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy))
}

function heat(value: number): Rgb {
  const stops: [number, Rgb][] = [[0, hexRgb('#1d3354')], [0.45, hexRgb('#4d9cff')], [0.75, hexRgb('#ffcc2a')], [1, hexRgb('#ff4b4b')]]
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i]!
    const [p0, c0] = stops[i - 1]!
    if (value <= p1) return lerpRgb(c0, c1, (value - p0) / (p1 - p0))
  }
  return stops[stops.length - 1]![1]
}

export function createFabricScene(canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, onPhase: (phase: number) => void) {
  return runStory(canvas, section, stage, PHASE_STARTS, onPhase, ({ group }: BuildContext): StoryScene => {
    const rand = random(23)
    const disposers: (() => void)[] = []
    const fabric = new THREE.Group()
    group.add(fabric)

    // Backing plane seen through the gaps of the weave.
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ color: new THREE.Color('#10201f') }))
    backing.position.z = -0.02
    fabric.add(backing)
    disposers.push(() => { backing.geometry.dispose(); (backing.material as THREE.Material).dispose() })

    const threads = createTiles(N * N * 2)
    fabric.add(threads.mesh)
    disposers.push(threads.dispose)
    const cells = Array.from({ length: N * N }, (_, i) => {
      const x = i % N
      const y = Math.floor(i / N)
      const horizontal = (x + y) % 2 === 0
      const d = distanceToTear(x, y)
      const torn = d < 0.75
      const base = scaleRgb(hexRgb(horizontal ? '#2f7f8a' : '#24636c'), 0.85 + rand() * 0.3)
      return { x, y, horizontal, torn, frayed: !torn && d < 1.4, heat: Math.exp(-(d * d) / (2 * 1.9 * 1.9)), base, crop: Math.floor(x / (N / CROPS)) + Math.floor(y / (N / CROPS)) * CROPS, jitter: rand() }
    })

    // Crop frames (prepare) and encoder–decoder layer frames (inspect).
    const cropSize = SIZE / CROPS
    const cropFrames = Array.from({ length: CROPS * CROPS }, () => { const item = outline(rectPoints(cropSize - 0.04, cropSize - 0.04), ACCENT); fabric.add(item.line); disposers.push(item.dispose); return item })
    const layerSizes = [4.4, 3.4, 2.3, 3.4, 4.4]
    const layers = layerSizes.map((size, index) => { const item = outline(rectPoints(size, size), index === 2 ? '#ffcc2a' : ACCENT); item.line.position.z = 0.8 - index * 0.4; group.add(item.line); disposers.push(item.dispose); return item })
    const unet = chip('U-Net · encoder → decoder', ACCENT, 0.17)
    unet.mesh.position.set(-SIZE / 2, SIZE / 2 + 0.28, 0.4)
    group.add(unet.mesh)
    disposers.push(unet.dispose)
    const defectFrame = outline(rectPoints(1.5, 1.0), '#ff4b4b')
    const [tx0, ty0, tx1, ty1] = TEAR
    defectFrame.line.position.set(((tx0 + tx1) / 2 + 0.5 - N / 2) * CELL, (N / 2 - (ty0 + ty1) / 2 - 0.5) * CELL, 0.1)
    fabric.add(defectFrame.line)
    disposers.push(defectFrame.dispose)

    // Holdout cards.
    const cards = createTiles(HOLDOUT)
    group.add(cards.mesh)
    disposers.push(cards.dispose)
    const slot = (index: number) => [(index % 4 - 1.5) * 1.05, (1 - Math.floor(index / 4)) * 1.05] as const
    const cardChips = Array.from({ length: HOLDOUT }, (_, index) => {
      const defect = HOLDOUT_DEFECT.has(index)
      const item = chip(defect ? 'defect' : 'OK', defect ? '#ff4b4b' : '#00ffaa', 0.15)
      const [sx, sy] = slot(index)
      item.mesh.position.set(sx - item.width / 2, sy, 0.3)
      group.add(item.mesh)
      disposers.push(item.dispose)
      return item
    })
    const holdout = chip('locked holdout set', '#f6f4f2', 0.17)
    holdout.mesh.position.set(-2.1, 1.85, 0.3)
    group.add(holdout.mesh)
    disposers.push(holdout.dispose)
    const fabricRgb = hexRgb('#2a7480')

    return {
      extent: [5.2, 5.0],
      update(p, time) {
        const assemble = (delay: number) => segment(p, 0, 0.08, delay, 0.6)
        const split = segment(p, 0.08, 0.26)
        const rejoin = segment(p, 0.38, 0.46)
        const spread = split * (1 - rejoin)
        const heatT = (delay: number) => segment(p, 0.5, 0.62, delay, 0.5)
        const shrink = segment(p, 0.68, 0.78)

        cells.forEach((cell, i) => {
          const cropX = (cell.crop % CROPS) - (CROPS - 1) / 2
          const cropY = Math.floor(cell.crop / CROPS) - (CROPS - 1) / 2
          const x = (cell.x + 0.5 - N / 2) * CELL + cropX * 0.32 * spread
          const y = (N / 2 - cell.y - 0.5) * CELL - cropY * 0.32 * spread
          const t = assemble(cell.jitter)
          const wobble = cell.frayed ? Math.sin(time * 2 + cell.jitter * 6) * 0.015 : 0
          const scale = (cell.torn ? 0.2 : 1) * t
          const long = CELL * 1.0 * scale
          const short = CELL * 0.5 * scale
          const px = mix(x, x * 2.2, 1 - t)
          const py = y + (1 - t) * 3 + wobble
          const pz = spread * (cell.crop % 3) * 0.05
          const tilt = cell.frayed ? (cell.jitter - 0.5) * 0.6 : 0
          const heated = heatT(1 - cell.heat)
          for (let j = 0; j < 2; j++) {
            const horizontal = j === 0
            const top = horizontal === cell.horizontal
            const index = i * 2 + j
            threads.set(index, px, py, pz + (top ? 0.012 : 0), horizontal ? long : short, horizontal ? short : long, tilt)
            const base = scaleRgb(cell.base, top ? 1.05 : 0.62)
            threads.setColor(index, lerpRgb(cell.torn ? scaleRgb(base, 0.35) : base, scaleRgb(heat(cell.heat), top ? 1 : 0.75), heated))
            threads.setRound(index, 0.45)
          }
        })
        threads.commit()

        cropFrames.forEach((item, index) => {
          const cx = (index % CROPS) - (CROPS - 1) / 2
          const cy = Math.floor(index / CROPS) - (CROPS - 1) / 2
          item.line.position.set(cx * (cropSize + 0.32 * spread), -cy * (cropSize + 0.32 * spread), 0.05)
          item.material.opacity = spread
        })
        const inspect = segment(p, 0.4, 0.5) * (1 - segment(p, 0.6, 0.66))
        layers.forEach((item, index) => { item.material.opacity = inspect * segment(p, 0.4 + index * 0.02, 0.48 + index * 0.02) * 0.9 })
        unet.material.opacity = inspect
        defectFrame.material.opacity = segment(p, 0.58, 0.63) * (1 - shrink * 0.2)
        backing.scale.setScalar(Math.max(segment(p, 0, 0.07), 1e-4))

        // Fabric shrinks into the first holdout slot; the others fly in and flip to reveal results.
        const [s0x, s0y] = slot(0)
        fabric.scale.setScalar(mix(1, 0.22, shrink))
        fabric.position.set(mix(0, s0x, shrink), mix(0, s0y, shrink), 0)
        fabric.rotation.y = Math.sin(time * 0.4) * 0.04 * (1 - shrink) + inspect * 0.35
        for (let i = 0; i < HOLDOUT; i++) {
          const [sx, sy] = slot(i)
          const arrive = segment(p, 0.7, 0.8, i / HOLDOUT)
          const flip = segment(p, 0.8, 0.94, i / HOLDOUT, 0.6)
          const defect = HOLDOUT_DEFECT.has(i)
          const visible = i === 0 ? 0 : arrive
          cards.set(i, mix(sx + 4, sx, arrive), sy, 0, 0.88 * visible, 0.88 * visible, 0, flip * Math.PI)
          cards.setColor(i, flip < 0.5 ? fabricRgb : scaleRgb(hexRgb(defect ? '#ff4b4b' : '#00ffaa'), 0.55))
          cards.setRound(i, 0.2)
          cardChips[i]!.material.opacity = segment(p, 0.84, 0.95, i / HOLDOUT, 0.6)
        }
        cards.commit()
        holdout.material.opacity = segment(p, 0.74, 0.8)
      },
      dispose() { disposers.forEach(dispose => dispose()) },
    }
  })
}
