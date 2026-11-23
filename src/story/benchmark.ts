import * as THREE from 'three'
import { createCards } from './cards'
import { chip, mix, random, runStory, segment, type BuildContext, type StoryScene } from './engine'
import { GARMENTS } from './garments'
import { createTiles, hexRgb, lerpRgb, outline, rectPoints, type Rgb } from './helpers'

/** Extract → Train → Compare: garment cards emit feature vectors, which become points split by a learned boundary, then fill an outfit's missing slot. */
export const PHASE_STARTS = [0, 0.36, 0.66]

const ACCENT = '#ff718b'
const g = (name: (typeof GARMENTS)[number]) => GARMENTS.indexOf(name)
/** Outfit items (left column) followed by candidates for the blank slot. */
const CARD_TYPES = [g('coat'), g('top'), g('trousers'), g('shoe'), g('skirt'), g('hat'), g('bag')]
const FEATURES = 12
const EXTRA_POINTS = 110
const PALETTE = ['#ff718b', '#e962bf', '#a369ff', '#7c85ff', '#4d9cff', '#05dbe9'].map(hexRgb)
const GOOD = hexRgb('#00ffaa')
const BAD = hexRgb('#ff718b')

export function createBenchmarkScene(canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, onPhase: (phase: number) => void) {
  return runStory(canvas, section, stage, PHASE_STARTS, onPhase, ({ group }: BuildContext): StoryScene => {
    const rand = random(41)
    const disposers: (() => void)[] = []
    const cards = createCards(CARD_TYPES, ACCENT)
    group.add(cards.mesh)
    disposers.push(cards.dispose)

    const rowY = (row: number) => 1.35 - row * 0.9
    const cardX = -2.05
    const total = 4 * FEATURES + EXTRA_POINTS
    const dots = createTiles(total)
    group.add(dots.mesh)
    disposers.push(dots.dispose)
    // Boundary in the 2D projection: points above the line are compatible.
    const angle = -0.35
    const normal = new THREE.Vector2(-Math.sin(angle), Math.cos(angle))
    const points = Array.from({ length: total }, (_, i) => {
      const good = rand() > 0.5
      const center = good ? new THREE.Vector2(0.55, 0.75) : new THREE.Vector2(-0.35, -0.7)
      const r = Math.sqrt(rand()) * 1.05
      const a = rand() * Math.PI * 2
      const point = new THREE.Vector2(center.x + Math.cos(a) * r * 1.3, center.y + Math.sin(a) * r * 0.75)
      const side = point.dot(normal) > 0
      return { point, good: side, feature: i < 4 * FEATURES, row: Math.floor(i / FEATURES), k: i % FEATURES, value: PALETTE[Math.floor(rand() * PALETTE.length)]!, delay: rand() }
    })
    const boundaryMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f6f4f2'), transparent: true, opacity: 0, depthWrite: false })
    const boundary = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.025), boundaryMaterial)
    boundary.position.set(0.25, 0, 0.05)
    group.add(boundary)
    disposers.push(() => { boundary.geometry.dispose(); boundaryMaterial.dispose() })

    const chipAt = (text: string, background: string, x: number, y: number, options: { color?: string } = {}) => {
      const item = chip(text, background, 0.17, options)
      item.mesh.position.set(x, y, 0.3)
      group.add(item.mesh)
      disposers.push(item.dispose)
      return item
    }
    const frozen = chipAt('frozen CLIP features', ACCENT, -1.55, 1.85)
    const compatible = chipAt('compatible', '#00ffaa', 1.25, 1.75)
    const clash = chipAt('not compatible', '#ff718b', -1.6, -1.75)
    const fitb = chipAt('✓ fill-in-the-blank', '#00ffaa', -0.9, 1.25)

    // Outfit slots for the compare phase.
    const slotX = [-1.65, -0.55, 0.55, 1.65]
    const slotY = 0.35
    const blank = outline(rectPoints(0.82, 0.82), ACCENT, true)
    blank.line.position.set(slotX[2]!, slotY, 0.05)
    group.add(blank.line)
    disposers.push(blank.dispose)
    const candidateX = [-1.2, -0.4, 0.4, 1.2]
    const candidateOrder = [5, 2, 6, 4] // hat, trousers (answer), bag, skirt

    return {
      extent: [5.3, 4.3],
      update(p, time) {
        const extract = segment(p, 0.06, 0.3)
        const train = segment(p, 0.38, 0.52)
        const sweep = segment(p, 0.5, 0.62)
        const compare = segment(p, 0.68, 0.78)
        const snap = segment(p, 0.8, 0.88)

        // Cards: four outfit items on the left, then into outfit slots; candidates appear below.
        for (let i = 0; i < CARD_TYPES.length; i++) {
          let x = cardX
          let y = 0
          let scale = 0.62
          let dim = 1
          let hi = 0
          if (i < 4) {
            y = rowY(i)
            const intro = segment(p, 0, 0.06, i / 4)
            x = mix(cardX - 2, cardX, intro)
            dim = mix(1, 0.45, train) * mix(1, 1 / 0.45, compare)
            hi = extract * (1 - train)
            if (i === 2) {
              // Trousers become the hidden answer among the candidates.
              const cx = candidateX[candidateOrder.indexOf(2)]!
              x = mix(x, cx, compare); y = mix(y, -1.15, compare); scale = mix(scale, 0.55, compare)
              x = mix(x, slotX[2]!, snap); y = mix(y, slotY, snap); scale = mix(scale, 0.72, snap)
              hi = mix(hi, 0, compare) + snap
            } else {
              const slot = i === 3 ? 3 : i
              x = mix(x, slotX[slot]!, compare); y = mix(y, slotY, compare); scale = mix(scale, 0.72, compare)
            }
          } else {
            const cx = candidateX[candidateOrder.indexOf(i)]!
            const arrive = segment(p, 0.7, 0.8, (i - 4) / 3)
            x = cx; y = mix(-2.6, -1.15, arrive)
            scale = 0.55 * arrive
            dim = mix(1, 0.4, snap)
          }
          y += Math.sin(time * 0.9 + i) * 0.03 * (1 - compare)
          cards.set(i, x, y, 0.1, i < 4 ? scale * segment(p, 0, 0.06, i / 4) : scale)
          cards.setDim(i, dim)
          cards.setHi(i, Math.min(1, hi))
        }
        cards.commit()

        // Feature cells fly out of each card; all points then settle into the 2D projection.
        points.forEach((item, i) => {
          let x: number
          let y: number
          let size: number
          let colour: Rgb
          const t = segment(p, 0.38, 0.52, item.delay)
          if (item.feature) {
            const out = segment(p, 0.06, 0.3, item.k / FEATURES)
            const fx = cardX + 0.5 + item.k * 0.2
            x = mix(cardX, fx, out); y = rowY(item.row)
            size = 0.15 * out
            x = mix(x, item.point.x, t); y = mix(y, item.point.y, t)
            size = mix(size, 0.1, t)
            colour = lerpRgb(item.value, item.good ? GOOD : BAD, segment(p, 0.5, 0.62, item.delay))
          } else {
            x = item.point.x; y = item.point.y
            size = 0.1 * t
            colour = lerpRgb(hexRgb('#93908d'), item.good ? GOOD : BAD, segment(p, 0.5, 0.62, item.delay))
          }
          size *= 1 - compare
          dots.set(i, x, y, 0, size, size)
          dots.setColor(i, colour)
          dots.setRound(i, item.feature ? t : 1)
        })
        dots.commit()

        boundary.rotation.z = mix(1.2, angle, sweep)
        boundaryMaterial.opacity = sweep * (1 - compare) * 0.9
        frozen.material.opacity = extract * (1 - train)
        compatible.material.opacity = sweep * (1 - compare)
        clash.material.opacity = sweep * (1 - compare)
        blank.material.opacity = compare * (1 - snap * 0.7)
        fitb.material.opacity = segment(p, 0.86, 0.92)
      },
      dispose() { disposers.forEach(dispose => dispose()) },
    }
  })
}
