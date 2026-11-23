import * as THREE from 'three'
import { paintCss } from './palette'

/** Shared runtime for scroll-driven project scenes: renderer, layout fitting, scroll progress and render loop. */
export const FOV = 35
const TAN = Math.tan((FOV * Math.PI) / 360)

export type StoryScene = {
  /** World-space extent (width, height) the scene needs to fit inside the usable area. */
  extent: [number, number]
  update(progress: number, time: number): void
  dispose(): void
}
export type BuildContext = { scene: THREE.Scene; group: THREE.Group; renderer: THREE.WebGLRenderer }

/**
 * Places the camera so `extent` (world units) fits inside the on-screen `stage` element,
 * and shifts `group` so the scene is centred on it. Returns the stage size in world units.
 */
export function fitToStage(camera: THREE.PerspectiveCamera, group: THREE.Object3D, canvas: HTMLElement, stage: HTMLElement, extent: [number, number]) {
  const box = canvas.getBoundingClientRect()
  const rect = stage.getBoundingClientRect()
  const height = box.height || 1
  const stageW = Math.max(rect.width, 1)
  const stageH = Math.max(rect.height, 1)
  const distance = Math.max((extent[0] * height) / (2 * TAN * stageW), (extent[1] * height) / (2 * TAN * stageH))
  const perPixel = (2 * distance * TAN) / height
  camera.position.set(0, 0, distance)
  camera.updateProjectionMatrix()
  group.position.set((rect.left + stageW / 2 - box.left - box.width / 2) * perPixel, -(rect.top + stageH / 2 - box.top - height / 2) * perPixel, 0)
  return { width: stageW * perPixel, height: stageH * perPixel, perPixel }
}

export const clamp = (value: number) => Math.min(1, Math.max(0, value))
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
/** Eased 0→1 progress across [start, end], optionally staggered by delay (0–1). */
export const segment = (p: number, start: number, end: number, delay = 0, spread = 0.4) => ease(clamp(((p - start) / (end - start) - delay * spread) / (1 - spread)))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Text drawn on a canvas looks soft if the GPU has to shrink it (mipmaps blur it). Every text texture registers here
 * and is redrawn at exactly its on-screen pixel size after each layout, with mipmaps off, so it stays sharp.
 */
type SharpText = { redraw: (devicePxPerWorld: number) => void }
let collecting: SharpText[] | null = null
export function sharpTexture(draw: (devicePxPerWorld: number | null) => HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(draw(null))
  texture.colorSpace = THREE.NoColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  collecting?.push({
    redraw(scale) {
      texture.image = draw(scale)
      texture.dispose() // size changed: let three re-allocate the GPU texture
      texture.needsUpdate = true
    },
  })
  return texture
}

/** A text chip as a texture-mapped plane; height is in world units. */
export function chip(text: string, background: string, height: number, options: { color?: string; strike?: string } = {}) {
  const draw = (scale: number | null) => {
    // canvas height = on-screen height in device pixels (or a sharp default before the first layout)
    const fontSize = scale ? Math.min(200, Math.max(8, (height * scale) / 1.7)) : 88
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const font = `600 ${fontSize}px "JetBrains Mono Variable", ui-monospace, monospace`
    ctx.font = font
    const padX = fontSize * 0.55
    canvas.width = Math.ceil(ctx.measureText(text).width + padX * 2)
    canvas.height = Math.ceil(fontSize * 1.7)
    ctx.font = font
    ctx.fillStyle = paintCss(background)
    ctx.beginPath()
    ctx.roundRect(0, 0, canvas.width, canvas.height, fontSize * 0.32)
    ctx.fill()
    ctx.fillStyle = paintCss(options.color ?? '#252423')
    ctx.textBaseline = 'middle'
    ctx.fillText(text, padX, canvas.height / 2 + fontSize * 0.03)
    if (options.strike) {
      ctx.strokeStyle = paintCss(options.strike)
      ctx.lineWidth = Math.max(1, fontSize * 0.12)
      ctx.beginPath()
      ctx.moveTo(padX * 0.6, canvas.height / 2)
      ctx.lineTo(canvas.width - padX * 0.6, canvas.height / 2)
      ctx.stroke()
    }
    return canvas
  }
  const texture = sharpTexture(draw)
  const first = texture.image as HTMLCanvasElement
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false })
  const width = (height * first.width) / first.height
  const geometry = new THREE.PlaneGeometry(width, height)
  geometry.translate(width / 2, 0, 0)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 2
  return { mesh, material, width, dispose: () => { texture.dispose(); material.dispose(); geometry.dispose() } }
}

export function runStory(canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, phaseStarts: number[], onPhase: (phase: number) => void, build: (context: BuildContext) => StoryScene) {
  THREE.ColorManagement.enabled = false
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200)
  const group = new THREE.Group()
  scene.add(group)
  collecting = []
  const story = build({ scene, group, renderer })
  const texts = collecting
  collecting = null

  function resize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    const fit = fitToStage(camera, group, canvas, stage, story.extent)
    // world units → device pixels at the text plane, so each label is drawn 1:1
    const scale = renderer.getPixelRatio() / fit.perPixel
    texts.forEach(text => text.redraw(scale))
  }

  let progress = 0
  let target = 0
  let phase = -1
  let pointerX = 0
  let pointerY = 0
  const readScroll = () => {
    const rect = section.getBoundingClientRect()
    const scrollable = rect.height - window.innerHeight
    target = scrollable > 0 ? clamp(-rect.top / scrollable) : 0
  }
  const clock = new THREE.Clock()
  function render() {
    progress += (target - progress) * 0.1
    if (Math.abs(target - progress) < 0.0005) progress = target
    let next = 0
    phaseStarts.forEach((start, index) => { if (progress >= start) next = index })
    if (next !== phase) { phase = next; onPhase(phase) }
    story.update(progress, clock.getElapsedTime())
    group.rotation.x = pointerY * 0.05
    group.rotation.y = pointerX * 0.08
    renderer.render(scene, camera)
  }

  let frame = 0
  let visible = false
  const loop = () => { frame = 0; if (!visible) return; readScroll(); render(); frame = requestAnimationFrame(loop) }
  const observer = new IntersectionObserver(([entry]) => { visible = !!entry?.isIntersecting; if (visible && !frame) frame = requestAnimationFrame(loop) })
  observer.observe(section)
  const resizeObserver = new ResizeObserver(() => { resize(); if (!visible) render() })
  resizeObserver.observe(canvas)
  resizeObserver.observe(stage)
  const onPointer = (event: PointerEvent) => { if (event.pointerType === 'touch') return; pointerX = event.clientX / window.innerWidth - 0.5; pointerY = event.clientY / window.innerHeight - 0.5 }
  window.addEventListener('pointermove', onPointer, { passive: true })
  resize()
  readScroll()
  progress = target
  render()

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    resizeObserver.disconnect()
    window.removeEventListener('pointermove', onPointer)
    story.dispose()
    renderer.dispose()
  }
}
