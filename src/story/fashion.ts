import * as THREE from 'three'
import { paintColor } from './palette'
import { chip, mix, random, runStory, segment, type BuildContext, type StoryScene } from './engine'
import { GARMENTS as TYPES, atlasOffset, dressCells, garmentAtlas, type Garment } from './garments'

/** Retrieve → Rerank → Explain: a query dress, a catalogue cloud, a ranked shortlist and an evidence-backed outfit. */
export const PHASE_STARTS = [0, 0.36, 0.66]

const ORANGE = '#ffa828'
const COPIES = 7
const CARD_COUNT = TYPES.length * COPIES
const DRESS = new THREE.Vector3(-1.65, 0, 0)
/** Shortlist order by raw similarity, then after rule-based reranking. */
const ORDER_A: Garment[] = ['skirt', 'top', 'bag', 'cardigan', 'trousers', 'shoe', 'hat', 'coat']
const ORDER_B: Garment[] = ['cardigan', 'bag', 'shoe', 'skirt', 'top', 'coat', 'trousers', 'hat']
const SCORES_A = [0.95, 0.9, 0.86, 0.82, 0.78, 0.72, 0.66, 0.6]
const SCORES_B = [0.97, 0.93, 0.9, 0.7, 0.64, 0.55, 0.48, 0.4]
const OUTFIT: Partial<Record<Garment, [number, number, number]>> = { cardigan: [1.8, 0.85, 0.2], bag: [1.9, -0.3, 0.2], shoe: [1.55, -1.35, 0.2] }

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

function hex(color: string) { return paintColor(color) }

export function createFashionScene(canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, onPhase: (phase: number) => void) {
  return runStory(canvas, section, stage, PHASE_STARTS, onPhase, ({ group }: BuildContext): StoryScene => {
    const rand = random(11)
    const disposers: (() => void)[] = []

    // Query dress built from tiles.
    const cells = dressCells()
    const tileSize = 0.07
    const dress = new THREE.InstancedMesh(new THREE.PlaneGeometry(tileSize * 0.9, tileSize * 0.9), new THREE.MeshBasicMaterial(), cells.length)
    dress.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    const scatter = cells.map(() => new THREE.Vector3((rand() - 0.5) * 7, (rand() - 0.5) * 5, (rand() - 0.5) * 3))
    const dressDelay = cells.map(() => rand())
    cells.forEach(({ y, shade }, i) => {
      const color = hex(ORANGE).lerp(hex('#ff7d36'), Math.min(1, Math.max(0, 0.45 - y / 45))).multiplyScalar(shade * (0.94 + rand() * 0.1))
      dress.setColorAt(i, color)
    })
    group.add(dress)
    disposers.push(() => { dress.geometry.dispose(); (dress.material as THREE.Material).dispose() })

    // Catalogue cards.
    const atlas = garmentAtlas()
    const cardGeometry = new THREE.PlaneGeometry(1, 1)
    const uvs = new Float32Array(CARD_COUNT * 2)
    const dimAttr = new THREE.InstancedBufferAttribute(new Float32Array(CARD_COUNT).fill(1), 1)
    const hiAttr = new THREE.InstancedBufferAttribute(new Float32Array(CARD_COUNT), 1)
    const cardType: Garment[] = []
    const cloud: THREE.Vector3[] = []
    const baseScale: number[] = []
    const shortlist = new Map<Garment, number>()
    for (let i = 0; i < CARD_COUNT; i++) {
      const typeIndex = i % TYPES.length
      const type = TYPES[typeIndex]!
      cardType.push(type)
      uvs.set(atlasOffset(typeIndex), i * 2)
      const selected = i < TYPES.length
      if (selected) shortlist.set(type, i)
      let position: THREE.Vector3
      do {
        const r = Math.cbrt(rand())
        const theta = rand() * Math.PI * 2
        const phi = Math.acos(2 * rand() - 1)
        position = selected
          ? new THREE.Vector3(0.4 + r * 1.5 * Math.sin(phi) * Math.cos(theta), r * 1.5 * Math.cos(phi), -0.2 + r * 0.6 * Math.sin(phi) * Math.sin(theta))
          : new THREE.Vector3(0.3 + r * 3.4 * Math.sin(phi) * Math.cos(theta), r * 2.3 * Math.cos(phi), -0.8 + r * 1.4 * Math.sin(phi) * Math.sin(theta))
      } while (Math.abs(position.x - DRESS.x) < 1.2 && Math.abs(position.y - DRESS.y) < 1.7)
      cloud.push(position)
      baseScale.push(0.3 + rand() * 0.12)
    }
    cardGeometry.setAttribute('aUv', new THREE.InstancedBufferAttribute(uvs, 2))
    cardGeometry.setAttribute('aDim', dimAttr)
    cardGeometry.setAttribute('aHi', hiAttr)
    const cardMaterial = new THREE.ShaderMaterial({ vertexShader: cardVertex, fragmentShader: cardFragment, uniforms: { uMap: { value: atlas }, uHi: { value: hex(ORANGE) } }, side: THREE.DoubleSide })
    const cards = new THREE.InstancedMesh(cardGeometry, cardMaterial, CARD_COUNT)
    cards.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    cards.frustumCulled = false
    group.add(cards)
    disposers.push(() => { cardGeometry.dispose(); cardMaterial.dispose(); atlas.dispose() })
    const phases = cloud.map(() => rand() * Math.PI * 2)
    const delays = cloud.map(() => rand())

    // Target positions for the shortlisted cards in each state.
    // the ring sits to the right of the dress, so no card covers the query image
    const ring = (rank: number) => { const angle = mix(0.95, -0.95, rank / 7); return new THREE.Vector3(DRESS.x + 0.95 + Math.cos(angle) * 1.95, DRESS.y + Math.sin(angle) * 1.75, 0.1) }
    const row = (rank: number) => new THREE.Vector3(1.3, 1.75 - rank * 0.5, 0.1)

    // Similarity lines from the query to the shortlist.
    // lines leave from just outside the skirt's widest point, so they never cross the dress
    const anchor = new THREE.Vector3(DRESS.x + 1.18, DRESS.y + 0.05, 0.05)
    const linePositions = new Float32Array(TYPES.length * 6)
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    const lineMaterial = new THREE.LineBasicMaterial({ color: hex(ORANGE), transparent: true, opacity: 0, depthWrite: false })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    lines.frustumCulled = false
    group.add(lines)
    disposers.push(() => { lineGeometry.dispose(); lineMaterial.dispose() })

    // Score bars beside the ranked column.
    const barGeometry = new THREE.PlaneGeometry(1, 0.07)
    barGeometry.translate(0.5, 0, 0)
    const barMaterial = new THREE.MeshBasicMaterial({ color: hex(ORANGE), transparent: true, opacity: 0, depthWrite: false })
    const bars = TYPES.map(() => { const bar = new THREE.Mesh(barGeometry, barMaterial); group.add(bar); return bar })
    disposers.push(() => { barGeometry.dispose(); barMaterial.dispose() })

    // Text chips.
    const chips: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }[] = []
    const addChip = (text: string, background: string, x: number, y: number, options: { color?: string; strike?: string } = {}) => {
      const item = chip(text, background, 0.19, options)
      item.mesh.position.set(x, y, 0.3)
      group.add(item.mesh)
      chips.push(item)
      disposers.push(item.dispose)
      return item
    }
    const query = addChip('query', ORANGE, DRESS.x - 0.32, DRESS.y + 1.82)
    const rules = [addChip('+ colour harmony', '#b7ff54', -0.42, 0.95), addChip('+ occasion fit', '#b7ff54', -0.42, 0.45), addChip('− pattern clash', '#ff718b', -0.42, -0.05)]
    const evidence = [
      addChip('✓ style guide §4', '#00ffaa', DRESS.x + OUTFIT.cardigan![0] + 0.42, DRESS.y + OUTFIT.cardigan![1]),
      addChip('✓ colour rule', '#00ffaa', DRESS.x + OUTFIT.bag![0] + 0.42, DRESS.y + OUTFIT.bag![1]),
      addChip('“pairs with denim”', '#484543', DRESS.x + OUTFIT.shoe![0] + 0.42, DRESS.y + OUTFIT.shoe![1], { color: '#d5d3d1', strike: '#ff4b4b' }),
    ]

    const dummy = new THREE.Object3D()
    const temp = new THREE.Vector3()
    const target = new THREE.Vector3()
    const rankOf = (order: Garment[], type: Garment) => order.indexOf(type)

    return {
      extent: [5.7, 4.4],
      update(p, time) {
        // Dress assembles from scattered tiles.
        cells.forEach(({ x, y }, i) => {
          const t = segment(p, 0, 0.1, dressDelay[i]!, 0.5)
          dummy.position.set(DRESS.x + x * tileSize, DRESS.y + y * tileSize, Math.sin(time * 1.6 + y * 0.25) * 0.025)
          dummy.position.lerp(temp.copy(scatter[i]!), 1 - t)
          dummy.rotation.set((1 - t) * 2, (1 - t) * 1.5, 0)
          dummy.scale.setScalar(t)
          dummy.updateMatrix()
          dress.setMatrixAt(i, dummy.matrix)
        })
        dress.instanceMatrix.needsUpdate = true

        const retrieve = segment(p, 0.1, 0.28)
        const toColumn = segment(p, 0.38, 0.47)
        const rerank = segment(p, 0.5, 0.6)
        const explain = segment(p, 0.68, 0.8)
        const float = 1 - toColumn * 0.85

        for (let i = 0; i < CARD_COUNT; i++) {
          const type = cardType[i]!
          const selected = shortlist.get(type) === i
          const drift = Math.sin(time * 0.6 + phases[i]!) * 0.06 * float
          target.copy(cloud[i]!)
          let scale = baseScale[i]!
          let dim = 1
          let hi = 0
          if (selected) {
            const t1 = segment(p, 0.1, 0.28, delays[i]!)
            const t2 = segment(p, 0.38, 0.47, delays[i]!)
            const t3 = segment(p, 0.5, 0.6, delays[i]!)
            const t4 = segment(p, 0.68, 0.8, delays[i]!)
            target.lerp(ring(rankOf(ORDER_A, type)), t1)
            target.lerp(row(rankOf(ORDER_A, type)), t2)
            target.lerp(temp.copy(row(rankOf(ORDER_B, type))).add(new THREE.Vector3(0, 0, Math.sin(t3 * Math.PI) * 0.6 * (rankOf(ORDER_B, type) < rankOf(ORDER_A, type) ? 1 : -1))), t3)
            const outfit = OUTFIT[type]
            if (outfit) target.lerp(temp.set(DRESS.x + outfit[0], DRESS.y + outfit[1], outfit[2]), t4)
            else target.lerp(temp.set(4.2, target.y, -0.5), t4)
            scale = mix(mix(mix(scale, 0.46, t1), 0.4, t2), outfit ? 0.62 : 0.001, t4)
            hi = t1 * (outfit ? 1 : 1 - t4)
          } else {
            target.multiplyScalar(1 + retrieve * 0.25)
            target.z -= retrieve * 1.2
            dim = mix(1, mix(0.32, 0.16, toColumn), retrieve) * mix(1, 0.6, explain)
            scale *= mix(1, 0.8, toColumn) * mix(1, 0.75, explain)
          }
          target.y += drift
          dummy.position.copy(target)
          dummy.rotation.set(0, 0, selected ? 0 : Math.sin(phases[i]!) * 0.08 * float)
          dummy.scale.set(scale, scale, 1)
          dummy.updateMatrix()
          cards.setMatrixAt(i, dummy.matrix)
          dimAttr.array[i] = dim
          hiAttr.array[i] = hi
        }
        cards.instanceMatrix.needsUpdate = true
        dimAttr.needsUpdate = hiAttr.needsUpdate = true

        // Lines from the query to the shortlist (only to the outfit in the last phase).
        TYPES.forEach((type, index) => {
          const matrix = new THREE.Matrix4()
          cards.getMatrixAt(shortlist.get(type)!, matrix)
          temp.setFromMatrixPosition(matrix)
          const bar = bars[index]!
          bar.position.set(temp.x + 0.28, temp.y, temp.z)
          const end = target.set(temp.x - 0.2, temp.y, temp.z)
          if (!OUTFIT[type]) end.lerp(anchor, explain)
          linePositions.set([anchor.x, anchor.y, anchor.z, end.x, end.y, end.z], index * 6)
          const score = mix(SCORES_A[rankOf(ORDER_A, type)]!, SCORES_B[rankOf(ORDER_B, type)]!, rerank)
          bar.scale.set(score * 0.75 * toColumn, 1, 1)
        })
        lineGeometry.attributes.position!.needsUpdate = true
        lineMaterial.opacity = retrieve * mix(0.6, 0.18, toColumn) + explain * 0.45
        barMaterial.opacity = toColumn * (1 - explain)

        query.material.opacity = retrieve * (1 - toColumn)
        rules.forEach((item, index) => { item.material.opacity = segment(p, 0.44 + index * 0.03, 0.5 + index * 0.03) * (1 - explain) })
        evidence.forEach((item, index) => { item.material.opacity = segment(p, 0.8 + index * 0.03, 0.86 + index * 0.03) })
      },
      dispose() { disposers.forEach(dispose => dispose()) },
    }
  })
}
