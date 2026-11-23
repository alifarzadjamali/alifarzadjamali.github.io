import * as THREE from 'three'
import { mix, sharpTexture } from './engine'
import { paintColor, paintCss, paintRgb } from './palette'

/** A multi-line monospace panel (e.g. JSON) as a texture-mapped plane; lineHeight in world units. */
export function panel(lines: string[], lineHeight: number, options: { background?: string; color?: string; accent?: string } = {}) {
  const draw = (scale: number | null) => {
    const fontSize = scale ? Math.min(160, Math.max(7, (lineHeight * scale) / 1.45)) : 76
    const font = `500 ${fontSize}px "JetBrains Mono Variable", ui-monospace, monospace`
    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = font
    const pad = fontSize * 0.8
    const width = Math.ceil(Math.max(...lines.map(line => measure.measureText(line).width)) + pad * 2)
    const height = Math.ceil(lines.length * fontSize * 1.45 + pad * 1.6)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = paintCss(options.background ?? '#1d1c1b')
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, fontSize * 0.5)
    ctx.fill()
    if (options.accent) { ctx.strokeStyle = paintCss(options.accent); ctx.lineWidth = Math.max(1, fontSize * 0.12); ctx.stroke() }
    ctx.font = font
    ctx.textBaseline = 'top'
    lines.forEach((line, index) => {
      ctx.fillStyle = paintCss(/^\s*"/.test(line) ? (options.accent ?? '#f6f4f2') : (options.color ?? '#b4b1af'))
      ctx.fillText(line, pad, pad * 0.8 + index * fontSize * 1.45)
    })
    return canvas
  }
  const texture = sharpTexture(draw)
  const first = texture.image as HTMLCanvasElement
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false })
  // one text line = lineHeight world units; the default draw uses 76px text with 1.45 line spacing
  const worldHeight = (lineHeight * first.height) / (76 * 1.45)
  const geometry = new THREE.PlaneGeometry((worldHeight * first.width) / first.height, worldHeight)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 2
  return { mesh, material, dispose: () => { texture.dispose(); material.dispose(); geometry.dispose() } }
}

const tileVertex = /* glsl */ `
attribute vec3 aColor; attribute float aRound;
varying vec2 vLocal; varying vec3 vColor; varying float vRound;
void main() { vLocal = uv; vColor = aColor; vRound = aRound;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`
const tileFragment = /* glsl */ `
uniform sampler2D uMap; uniform float uHasMap;
varying vec2 vLocal; varying vec3 vColor; varying float vRound;
void main() { vec2 p = vLocal - 0.5; float k = vRound * 0.5 + 0.06;
  float d = length(max(abs(p) - (0.5 - k), 0.0)) - k; if (d > 0.0) discard;
  vec3 color = vColor;
  if (uHasMap > 0.5) { vec4 t = texture2D(uMap, vLocal); if (mix(t.a, 1.0, vRound) < 0.5) discard; color *= mix(t.rgb, vec3(1.0), vRound); }
  gl_FragColor = vec4(color, 1.0); }`

/** Instanced flat tiles that morph from rounded squares to circles; per-instance colour; optional texture mask. */
export function createTiles(count: number, map?: THREE.Texture) {
  const geometry = new THREE.PlaneGeometry(1, 1)
  const color = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3)
  const round = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
  geometry.setAttribute('aColor', color)
  geometry.setAttribute('aRound', round)
  const material = new THREE.ShaderMaterial({ vertexShader: tileVertex, fragmentShader: tileFragment, uniforms: { uMap: { value: map ?? null }, uHasMap: { value: map ? 1 : 0 } }, side: THREE.DoubleSide })
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  const dummy = new THREE.Object3D()
  return {
    mesh,
    setColor(index: number, rgb: [number, number, number]) { color.array.set(rgb, index * 3) },
    setRound(index: number, value: number) { round.array[index] = value },
    set(index: number, x: number, y: number, z: number, sx: number, sy = sx, rotZ = 0, rotY = 0) {
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, rotY, rotZ)
      dummy.scale.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    },
    commit() { mesh.instanceMatrix.needsUpdate = true; color.needsUpdate = true; round.needsUpdate = true },
    dispose() { geometry.dispose(); material.dispose() },
  }
}

export type Rgb = [number, number, number]
export function hexRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16)
  return paintRgb([((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255])
}
export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
}
export function scaleRgb(a: Rgb, k: number): Rgb { return [a[0] * k, a[1] * k, a[2] * k] }

function lineMaterial(color: string, dashed: boolean) {
  return dashed
    ? new THREE.LineDashedMaterial({ color: paintColor(color), dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0, depthWrite: false })
    : new THREE.LineBasicMaterial({ color: paintColor(color), transparent: true, opacity: 0, depthWrite: false })
}
/** Closed polyline outline (world units). */
export function outline(points: [number, number][], color: string, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x, y, 0)))
  const material = lineMaterial(color, dashed)
  const line = new THREE.LineLoop(geometry, material)
  if (dashed) line.computeLineDistances()
  line.renderOrder = 1
  return { line, material, dispose: () => { geometry.dispose(); material.dispose() } }
}
export const rectPoints = (width: number, height: number): [number, number][] => [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]]
export const circlePoints = (radius: number, segments = 96): [number, number][] => Array.from({ length: segments }, (_, i) => [Math.cos((i / segments) * Math.PI * 2) * radius, Math.sin((i / segments) * Math.PI * 2) * radius])
