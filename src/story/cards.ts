import * as THREE from 'three'
import { atlasOffset, garmentAtlas } from './garments'

const cardVertex = /* glsl */ `
attribute vec2 aUv; attribute float aDim; attribute float aHi;
varying vec2 vUv; varying vec2 vLocal; varying float vDim; varying float vHi;
void main() { vLocal = uv; vUv = aUv + uv * vec2(0.25, 0.5); vDim = aDim; vHi = aHi;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`
const cardFragment = /* glsl */ `
uniform sampler2D uMap; uniform vec3 uHi;
varying vec2 vUv; varying vec2 vLocal; varying float vDim; varying float vHi;
void main() { vec2 p = vLocal - 0.5; float k = 0.14;
  float d = length(max(abs(p) - (0.5 - k), 0.0)) - k; if (d > 0.0) discard;
  vec3 color = texture2D(uMap, vUv).rgb * vDim;
  color = mix(color, uHi, vHi * step(-0.035, d));
  gl_FragColor = vec4(color, 1.0); }`

/** Instanced garment cards (atlas icons) with per-card dim and highlight border. `types` are indices into GARMENTS. */
export function createCards(types: number[], highlight: string) {
  const atlas = garmentAtlas()
  const geometry = new THREE.PlaneGeometry(1, 1)
  const uvs = new Float32Array(types.length * 2)
  types.forEach((type, i) => uvs.set(atlasOffset(type), i * 2))
  const dim = new THREE.InstancedBufferAttribute(new Float32Array(types.length).fill(1), 1)
  const hi = new THREE.InstancedBufferAttribute(new Float32Array(types.length), 1)
  geometry.setAttribute('aUv', new THREE.InstancedBufferAttribute(uvs, 2))
  geometry.setAttribute('aDim', dim)
  geometry.setAttribute('aHi', hi)
  const material = new THREE.ShaderMaterial({ vertexShader: cardVertex, fragmentShader: cardFragment, uniforms: { uMap: { value: atlas }, uHi: { value: new THREE.Color(highlight) } }, side: THREE.DoubleSide })
  const mesh = new THREE.InstancedMesh(geometry, material, types.length)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  const dummy = new THREE.Object3D()
  return {
    mesh,
    setDim(index: number, value: number) { dim.array[index] = value },
    setHi(index: number, value: number) { hi.array[index] = value },
    set(index: number, x: number, y: number, z: number, scale: number, rotY = 0) {
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, rotY, 0)
      dummy.scale.set(Math.max(scale, 1e-4), Math.max(scale, 1e-4), 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    },
    commit() { mesh.instanceMatrix.needsUpdate = true; dim.needsUpdate = true; hi.needsUpdate = true },
    dispose() { geometry.dispose(); material.dispose(); atlas.dispose() },
  }
}
