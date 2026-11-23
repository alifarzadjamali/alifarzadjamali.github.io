import * as THREE from 'three'
import { chip, mix, runStory, segment, type BuildContext, type StoryScene } from './engine'
import { hexRgb, lerpRgb, outline, panel, scaleRgb, type Rgb } from './helpers'

/** Segment → Read → Review: a raster floor plan is segmented into classes, its text read, then lifted to 3D with polygons and JSON. */
export const PHASE_STARTS = [0, 0.36, 0.66]

const ACCENT = '#00ffaa'
const W = 24
const H = 18
const CELL = 0.17
const ROOMS: [string, number, number, number, number][] = [
  ['BEDROOM', 0, 0, 9, 8], ['BATH', 9, 0, 14, 6], ['OFFICE', 14, 0, 24, 8], ['KITCHEN', 0, 8, 8, 18],
  ['LIVING', 8, 8, 17, 18], ['HALL', 17, 8, 24, 12], ['STUDY', 17, 12, 24, 18], ['CORRIDOR', 9, 6, 14, 8],
]
const DOORS = [[5, 7], [6, 7], [19, 7], [20, 7], [11, 5], [7, 13], [7, 14], [20, 11], [16, 9], [16, 10], [11, 17], [12, 17]]
const WINDOW_RANGES: [number, number, number, number][] = [[2, 0, 6, 0], [16, 0, 21, 0], [0, 10, 0, 15], [23, 2, 23, 5], [23, 13, 23, 16], [2, 17, 5, 17], [19, 17, 22, 17]]
const DIMENSIONS: [string, number][] = [['3.2 × 2.7 m', 0], ['3.4 × 4.1 m', 4]]

type Kind = 'room' | 'wall' | 'door' | 'window' | 'corridor'
const CLASS_COLOR: Record<Kind, Rgb> = { wall: hexRgb('#f6f4f2'), door: hexRgb('#ffa828'), window: hexRgb('#05dbe9'), room: hexRgb(ACCENT), corridor: hexRgb('#4d9cff') }

export function createFloorplanScene(canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, onPhase: (phase: number) => void) {
  return runStory(canvas, section, stage, PHASE_STARTS, onPhase, ({ group, scene }: BuildContext): StoryScene => {
    const disposers: (() => void)[] = []
    scene.add(new THREE.AmbientLight(0xffffff, 0.62))
    const sun = new THREE.DirectionalLight(0xffffff, 0.55)
    sun.position.set(0.4, 0.8, 1)
    scene.add(sun)

    const plan = new THREE.Group()
    group.add(plan)
    const roomAt = (x: number, y: number) => ROOMS.findIndex(([, x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1)
    const cells: { x: number; y: number; kind: Kind; room: number; raster: Rgb; target: Rgb; delay: number }[] = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const room = roomAt(x, y)
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || roomAt(x + 1, y) !== room || roomAt(x, y + 1) !== room
      let kind: Kind = edge ? 'wall' : ROOMS[room]![0] === 'CORRIDOR' ? 'corridor' : 'room'
      if (DOORS.some(([dx, dy]) => dx === x && dy === y)) kind = 'door'
      if (WINDOW_RANGES.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) kind = 'window'
      const raster: Rgb = kind === 'wall' || kind === 'window' ? hexRgb('#b4b1af') : hexRgb('#2f2d2b')
      const target = kind === 'room' ? scaleRgb(CLASS_COLOR.room, 0.42 + (room % 4) * 0.09) : kind === 'corridor' ? scaleRgb(CLASS_COLOR.corridor, 0.5) : CLASS_COLOR[kind]
      cells.push({ x, y, kind, room, raster, target, delay: (x + y * 0.4) / (W + H * 0.4) })
    }
    const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), cells.length)
    boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    boxes.frustumCulled = false
    plan.add(boxes)
    disposers.push(() => { boxes.geometry.dispose(); (boxes.material as THREE.Material).dispose() })
    const toWorld = (x: number, y: number) => [(x - W / 2) * CELL, (H / 2 - y) * CELL] as const

    // Scan line for the OCR pass.
    const scanMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT), transparent: true, opacity: 0, depthWrite: false })
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL + 0.3, 0.035), scanMaterial)
    scan.renderOrder = 3
    plan.add(scan)
    disposers.push(() => { scan.geometry.dispose(); scanMaterial.dispose() })

    // OCR labels inside rooms, plus two dimension strings.
    const labels = ROOMS.filter(([name]) => name !== 'CORRIDOR').map(([name, x0, y0, x1, y1]) => {
      const item = chip(name, '#f6f4f2', 0.15)
      const [cx, cy] = toWorld((x0 + x1) / 2, (y0 + y1) / 2)
      item.mesh.position.set(cx - item.width / 2, cy + 0.08, 0.09)
      plan.add(item.mesh)
      disposers.push(item.dispose)
      return { ...item, y: cy }
    })
    const dims = DIMENSIONS.map(([text, roomIndex]) => {
      const [, x0, y0, x1, y1] = ROOMS[roomIndex]!
      const item = chip(text, '#484543', 0.13, { color: '#f6f4f2' })
      const [cx, cy] = toWorld((x0 + x1) / 2, (y0 + y1) / 2)
      item.mesh.position.set(cx - item.width / 2, cy - 0.14, 0.09)
      plan.add(item.mesh)
      disposers.push(item.dispose)
      return { ...item, y: cy }
    })

    // Approximate room polygons for the review step.
    const polygons = ROOMS.map(([, x0, y0, x1, y1], index) => {
      const inset = 0.6 + (index % 3) * 0.1
      const corners: [number, number][] = [[x0 + inset, y0 + inset], [x1 - inset, y0 + inset], [x1 - inset, y1 - inset], [x0 + inset, y1 - inset]]
      const item = outline(corners.map(([x, y]) => toWorld(x - 0.5, y - 0.5) as unknown as [number, number]), ACCENT)
      item.line.position.z = 0.06
      plan.add(item.line)
      disposers.push(item.dispose)
      return item
    })

    const json = panel(['{', '  "rooms": 7,', '  "doors": 7,', '  "windows": 7,', '  "text": ["BEDROOM", …],', '  "geometry": "approximate"', '}'], 0.16, { accent: ACCENT })
    json.mesh.position.set(0.75, 1.45, 0.6)
    group.add(json.mesh)
    disposers.push(json.dispose)

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    return {
      extent: [4.6, 3.8],
      update(p, time) {
        const segmentT = (delay: number) => segment(p, 0.08, 0.3, delay, 0.5)
        const lift = segment(p, 0.68, 0.82)
        const scanY = mix(H / 2 * CELL + 0.1, -H / 2 * CELL - 0.1, segment(p, 0.4, 0.6, 0, 0))
        cells.forEach((cell, i) => {
          const drop = segment(p, 0, 0.08, cell.delay, 0.6)
          const [wx, wy] = toWorld(cell.x + 0.5, cell.y + 0.5)
          const wall = cell.kind === 'wall' || cell.kind === 'window'
          const depth = mix(0.03, wall ? 0.42 : cell.kind === 'door' ? 0.05 : 0.03, lift)
          dummy.position.set(wx, wy, (1 - drop) * 2.5 + depth / 2)
          dummy.rotation.set((1 - drop) * 1.2, 0, 0)
          dummy.scale.set(CELL * 0.93 * drop, CELL * 0.93 * drop, depth)
          dummy.updateMatrix()
          boxes.setMatrixAt(i, dummy.matrix)
          const [r, g, b] = lerpRgb(cell.raster, cell.target, segmentT(cell.delay))
          boxes.setColorAt(i, color.setRGB(r, g, b))
        })
        boxes.instanceMatrix.needsUpdate = true
        if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true

        const reading = segment(p, 0.4, 0.6, 0, 0)
        scan.position.set(0, scanY, 0.08)
        scanMaterial.opacity = reading > 0 && reading < 1 ? 0.9 : 0
        const show = (y: number) => (scanY < y ? 1 : 0)
        labels.forEach(item => { item.material.opacity = segment(p, 0.4, 0.6) > 0 ? show(item.y) * (1 - lift * 0.35) : 0 })
        dims.forEach(item => { item.material.opacity = segment(p, 0.4, 0.6) > 0 ? show(item.y) * (1 - lift) : 0 })
        polygons.forEach((item, index) => { item.material.opacity = segment(p, 0.74 + index * 0.01, 0.8 + index * 0.01) * 0.95 })
        json.material.opacity = segment(p, 0.78, 0.86)

        plan.rotation.set(-0.95 * lift, 0, 0.32 * lift)
        plan.position.set(-0.35 * lift, -0.35 * lift + Math.sin(time * 0.8) * 0.02, 0)
      },
      dispose() { disposers.forEach(dispose => dispose()) },
    }
  })
}
