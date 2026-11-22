import * as THREE from 'three'
import { BACKGROUND_COLOR, GRID, IMG, OBJECTS, drawLabel, drawSource, tileClasses } from './image'

const N = GRID * GRID
const IMAGE_SIZE = 4
const TILE = IMAGE_SIZE / GRID
const FOV = 35
const TAN = Math.tan((FOV * Math.PI) / 360)

/** Scroll ranges for each transition between the five states. */
const SEGMENTS = [
  { start: 0.08, end: 0.22 },
  { start: 0.3, end: 0.45 },
  { start: 0.52, end: 0.67 },
  { start: 0.74, end: 0.88 },
]
/** Scroll position where each caption step begins. */
export const STEP_STARTS = [0, 0.15, 0.38, 0.6, 0.81]

type State = { pos: Float32Array; scale: Float32Array; round: Float32Array; mix: Float32Array; dim: Float32Array; rotZ: Float32Array }

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

const vertexShader = /* glsl */ `
attribute vec2 aUv;
attribute vec3 aTint;
attribute float aMix;
attribute float aRound;
attribute float aDim;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vTint;
varying float vMix;
varying float vRound;
varying float vDim;
void main() {
  vLocal = uv;
  vUv = aUv + uv * ${(1 / GRID).toFixed(6)};
  vTint = aTint; vMix = aMix; vRound = aRound; vDim = aDim;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vTint;
varying float vMix;
varying float vRound;
varying float vDim;
void main() {
  vec2 p = vLocal - 0.5;
  float k = vRound * 0.5 + 0.04;
  float d = length(max(abs(p) - (0.5 - k), 0.0)) - k;
  if (d > 0.0) discard;
  vec3 color = mix(texture2D(uMap, vUv).rgb, vTint, vMix) * vDim;
  gl_FragColor = vec4(color, 1.0);
}`

export function createVisionScene(canvas: HTMLCanvasElement, section: HTMLElement, onStep: (step: number) => void) {
  THREE.ColorManagement.enabled = false
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200)
  const group = new THREE.Group()
  scene.add(group)

  const source = document.createElement('canvas')
  source.width = source.height = IMG
  drawSource(source.getContext('2d')!)
  const texture = new THREE.CanvasTexture(source)
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4

  const classes = tileClasses()
  const geometry = new THREE.PlaneGeometry(1, 1)
  const uvs = new Float32Array(N * 2)
  const tints = new Float32Array(N * 3)
  const mixAttr = new THREE.InstancedBufferAttribute(new Float32Array(N), 1)
  const roundAttr = new THREE.InstancedBufferAttribute(new Float32Array(N), 1)
  const dimAttr = new THREE.InstancedBufferAttribute(new Float32Array(N).fill(1), 1)
  for (let i = 0; i < N; i++) {
    const gx = i % GRID
    const gy = Math.floor(i / GRID)
    uvs[i * 2] = gx / GRID
    uvs[i * 2 + 1] = 1 - (gy + 1) / GRID
    tints.set(rgb(classes[i] ? OBJECTS[classes[i]! - 1]!.color : BACKGROUND_COLOR), i * 3)
  }
  geometry.setAttribute('aUv', new THREE.InstancedBufferAttribute(uvs, 2))
  geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3))
  geometry.setAttribute('aMix', mixAttr)
  geometry.setAttribute('aRound', roundAttr)
  geometry.setAttribute('aDim', dimAttr)
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { uMap: { value: texture } }, side: THREE.DoubleSide })
  const tiles = new THREE.InstancedMesh(geometry, material, N)
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  tiles.frustumCulled = false
  group.add(tiles)

  // Detection boxes and labels for the final state.
  const toWorld = (x: number, y: number) => [(x / IMG - 0.5) * IMAGE_SIZE, (0.5 - y / IMG) * IMAGE_SIZE] as const
  const overlays: THREE.Mesh[] = []
  const overlayMaterials: THREE.MeshBasicMaterial[] = []
  for (const object of OBJECTS) {
    const color = new THREE.Color(object.color)
    const lineMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
    overlayMaterials.push(lineMaterial)
    const [x1, y1] = toWorld(object.box[0], object.box[1])
    const [x2, y2] = toWorld(object.box[2], object.box[3])
    const thickness = 0.025
    for (const [cx, cy, w, h] of [[(x1 + x2) / 2, y1, x2 - x1 + thickness, thickness], [(x1 + x2) / 2, y2, x2 - x1 + thickness, thickness], [x1, (y1 + y2) / 2, thickness, y1 - y2], [x2, (y1 + y2) / 2, thickness, y1 - y2]] as const) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMaterial)
      line.position.set(cx, cy, 0.03)
      overlays.push(line)
      group.add(line)
    }
    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 512
    labelCanvas.height = 64
    drawLabel(labelCanvas.getContext('2d')!, `${object.name} ${object.score}`, object.color, 0, 6, 32)
    const labelTexture = new THREE.CanvasTexture(labelCanvas)
    labelTexture.colorSpace = THREE.NoColorSpace
    const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, opacity: 0, depthWrite: false })
    overlayMaterials.push(labelMaterial)
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), labelMaterial)
    label.position.set(x1 + 0.8 - 0.012, y1 + 0.12, 0.03)
    overlays.push(label)
    group.add(label)
  }

  // Five states: image → patches → token sequence → embedding clusters → annotated image.
  const states: State[] = Array.from({ length: 5 }, () => ({ pos: new Float32Array(N * 3), scale: new Float32Array(N), round: new Float32Array(N), mix: new Float32Array(N), dim: new Float32Array(N), rotZ: new Float32Array(N) }))
  const delays = Array.from({ length: 4 }, () => new Float32Array(N))
  const rand = random(7)
  const noise = Array.from({ length: N }, () => [rand(), rand(), rand(), rand(), rand(), rand()] as const)
  const maxDistance = Math.hypot(GRID / 2, GRID / 2)
  for (let i = 0; i < N; i++) {
    const distance = Math.hypot(i % GRID - (GRID - 1) / 2, Math.floor(i / GRID) - (GRID - 1) / 2) / maxDistance
    delays[0]![i] = distance
    delays[1]![i] = i / N
    delays[2]![i] = noise[i]![5]
    delays[3]![i] = 1 - distance
  }

  let layout = { offsetX: 0, offsetY: 0, usableW: 6, usableH: 5 }
  function buildStates() {
    const fit = Math.min(1, layout.usableW / 5.6, layout.usableH / 5.2)
    for (let i = 0; i < N; i++) {
      const gx = i % GRID
      const gy = Math.floor(i / GRID)
      const hx = (gx + 0.5) * TILE - IMAGE_SIZE / 2
      const hy = IMAGE_SIZE / 2 - (gy + 0.5) * TILE
      const [n0, n1, n2, n3, n4] = noise[i]!
      const id = classes[i]!
      const set = (s: number, x: number, y: number, z: number, scale: number, round: number, mixValue: number, dim: number, rotZ: number) => {
        const state = states[s]!
        state.pos.set([x, y, z], i * 3)
        state.scale[i] = scale; state.round[i] = round; state.mix[i] = mixValue; state.dim[i] = dim; state.rotZ[i] = rotZ
      }
      set(0, hx, hy, 0, 1.012, 0, 0, 1, 0)
      set(1, hx * 1.28 * fit, hy * 1.28 * fit, (n0 - 0.5) * 1.6, 0.8, 0.18, 0, 1, (n1 - 0.5) * 0.5)
      const t = i / (N - 1)
      const angle = t * Math.PI * 2 * 4.5
      const length = Math.min(7.5, layout.usableW * 0.82)
      set(2, (t - 0.5) * length, Math.cos(angle) * 1.1 * fit, Math.sin(angle) * 1.1 * fit, 0.55, 0.3, 0, 1, angle * 0.15)
      const centers: [number, number, number, number][] = [[0, 0, 0, 2.5], [-1.8, 0.95, 0.6, 0.5], [1.75, -0.7, 0.4, 0.45], [0.25, 1.55, -0.9, 0.45]]
      const [cx, cy, cz, radius] = centers[id]!
      const r = radius * Math.cbrt(n2)
      const theta = n3 * Math.PI * 2
      const phi = Math.acos(2 * n4 - 1)
      set(3, (cx + r * Math.sin(phi) * Math.cos(theta)) * fit, (cy + r * Math.cos(phi)) * fit, (cz + r * Math.sin(phi) * Math.sin(theta)) * fit, id ? 0.34 : 0.22, 1, 1, id ? 1 : 0.7, 0)
      set(4, hx, hy, 0, 0.94, 0.12, id ? 0.42 : 0, id ? 1 : 0.42, 0)
    }
  }

  function resize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    const aspect = width / height
    camera.aspect = aspect
    const mobile = aspect < 0.9
    const fw = mobile ? 0.94 : 0.58
    const fh = mobile ? 0.6 : 0.84
    const distance = (IMAGE_SIZE * 1.12) / (2 * TAN * Math.min(aspect * fw, fh))
    const visH = 2 * distance * TAN
    const visW = visH * aspect
    camera.position.set(0, 0, distance)
    camera.updateProjectionMatrix()
    layout = { offsetX: mobile ? 0 : visW * (1 - fw) / 2, offsetY: mobile ? visH * (1 - fh) / 2 : 0, usableW: visW * fw, usableH: visH * fh }
    group.position.set(layout.offsetX, layout.offsetY, 0)
    buildStates()
  }

  const dummy = new THREE.Object3D()
  let progress = 0
  let target = 0
  let step = -1
  let pointerX = 0
  let pointerY = 0
  const readScroll = () => {
    const rect = section.getBoundingClientRect()
    const scrollable = rect.height - window.innerHeight
    target = scrollable > 0 ? clamp(-rect.top / scrollable) : 0
  }

  function update() {
    progress += (target - progress) * 0.1
    if (Math.abs(target - progress) < 0.0005) progress = target
    let nextStep = 0
    STEP_STARTS.forEach((start, index) => { if (progress >= start) nextStep = index })
    if (nextStep !== step) { step = nextStep; onStep(step) }

    for (let i = 0; i < N; i++) {
      let from = 0
      let to = 0
      let local = 0
      for (let s = 0; s < SEGMENTS.length; s++) {
        const { start, end } = SEGMENTS[s]!
        if (progress >= end) { from = to = s + 1; continue }
        if (progress > start) {
          const raw = (progress - start) / (end - start)
          local = ease(clamp((raw - delays[s]![i]! * 0.4) / 0.6))
          from = s
          to = s + 1
        }
        break
      }
      const a = states[from]!
      const b = states[to]!
      const lerp = (x: number, y: number) => x + (y - x) * local
      dummy.position.set(lerp(a.pos[i * 3]!, b.pos[i * 3]!), lerp(a.pos[i * 3 + 1]!, b.pos[i * 3 + 1]!), lerp(a.pos[i * 3 + 2]!, b.pos[i * 3 + 2]!))
      const flip = from !== to && (from === 0 || from === 3) ? Math.sin(local * Math.PI) * Math.PI * 0.5 : 0
      dummy.rotation.set(flip, 0, lerp(a.rotZ[i]!, b.rotZ[i]!))
      const scale = lerp(a.scale[i]!, b.scale[i]!) * TILE
      dummy.scale.set(scale, scale, 1)
      dummy.updateMatrix()
      tiles.setMatrixAt(i, dummy.matrix)
      mixAttr.array[i] = lerp(a.mix[i]!, b.mix[i]!)
      roundAttr.array[i] = lerp(a.round[i]!, b.round[i]!)
      dimAttr.array[i] = lerp(a.dim[i]!, b.dim[i]!)
    }
    tiles.instanceMatrix.needsUpdate = true
    mixAttr.needsUpdate = roundAttr.needsUpdate = dimAttr.needsUpdate = true

    const overlayOpacity = clamp((progress - 0.88) / 0.05)
    overlayMaterials.forEach(item => { item.opacity = overlayOpacity })
    overlays.forEach(item => { item.visible = overlayOpacity > 0 })

    const swing = Math.sin(progress * Math.PI)
    group.rotation.set(-0.18 * swing + pointerY * 0.06, 0.55 * Math.sin(progress * Math.PI * 2) * 0.6 + pointerX * 0.1, 0)
    renderer.render(scene, camera)
  }

  let frame = 0
  let visible = false
  const loop = () => { frame = 0; if (!visible) return; readScroll(); update(); frame = requestAnimationFrame(loop) }
  const start = () => { if (!frame) frame = requestAnimationFrame(loop) }
  const observer = new IntersectionObserver(([entry]) => { visible = !!entry?.isIntersecting; if (visible) start() })
  observer.observe(section)
  const resizeObserver = new ResizeObserver(() => { resize(); if (!visible) update() })
  resizeObserver.observe(canvas)
  const onPointer = (event: PointerEvent) => { if (event.pointerType === 'touch') return; pointerX = event.clientX / window.innerWidth - 0.5; pointerY = event.clientY / window.innerHeight - 0.5 }
  window.addEventListener('pointermove', onPointer, { passive: true })
  resize()
  readScroll()
  progress = target
  update()

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    resizeObserver.disconnect()
    window.removeEventListener('pointermove', onPointer)
    scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
    overlayMaterials.forEach(item => { item.map?.dispose(); item.dispose() })
    material.dispose()
    texture.dispose()
    renderer.dispose()
  }
}
