import * as THREE from 'three'
import { chip, mix, random, runStory, segment, type BuildContext, type StoryScene } from './engine'
import { circlePoints, createTiles, hexRgb, lerpRgb, outline } from './helpers'

/** Prepare → Embed → Compare: responses from several datasets become embeddings; human answers stay spread, model answers bunch together. */
export const PHASE_STARTS = [0, 0.36, 0.66]

const COUNT = 84
const DATASETS = ['#05dbe9', '#a369ff', '#ffcc2a'].map(hexRgb)
const HUMAN = hexRgb('#ff4b4b')
const MODEL = hexRgb('#b7ff54')
const HUMAN_CENTER = new THREE.Vector3(-1.25, -0.1, 0)
const MODEL_CENTER = new THREE.Vector3(1.35, -0.1, 0)

function bubbleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(4, 4, 152, 96, 18)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(26, 96); ctx.lineTo(22, 124); ctx.lineTo(52, 96); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#5a5a5a'
  for (const [y, w] of [[26, 110], [48, 88], [70, 100]] as const) { ctx.beginPath(); ctx.roundRect(24, y, w, 9, 4); ctx.fill() }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4
  return texture
}

export function createLanguageScene(canvas: HTMLCanvasElement, section: HTMLElement, stage: HTMLElement, onPhase: (phase: number) => void) {
  return runStory(canvas, section, stage, PHASE_STARTS, onPhase, ({ group }: BuildContext): StoryScene => {
    const rand = random(57)
    const disposers: (() => void)[] = []
    const texture = bubbleTexture()
    const bubbles = createTiles(COUNT, texture)
    group.add(bubbles.mesh)
    disposers.push(bubbles.dispose, () => texture.dispose())

    const sphere = (radius: number) => {
      const r = radius * Math.cbrt(rand())
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta) * 0.6)
    }
    const items = Array.from({ length: COUNT }, (_, i) => {
      const column = i % 7
      const row = Math.floor(i / 7)
      const human = i % 2 === 0
      return {
        dataset: i % DATASETS.length,
        human,
        wall: new THREE.Vector3((column - 3) * 0.66 + (row % 2) * 0.2, (5.5 - row) * 0.36 * 0.95 - 0.1, (rand() - 0.5) * 0.4),
        cloud: sphere(1.75),
        split: (human ? HUMAN_CENTER : MODEL_CENTER).clone().add(sphere(human ? 1.1 : 0.36)),
        delay: rand(),
        tilt: (rand() - 0.5) * 0.25,
      }
    })

    const humanRing = outline(circlePoints(1.25), '#ff4b4b')
    humanRing.line.position.copy(HUMAN_CENTER)
    const modelRing = outline(circlePoints(1), '#b7ff54')
    modelRing.line.position.copy(MODEL_CENTER)
    group.add(humanRing.line, modelRing.line)
    disposers.push(humanRing.dispose, modelRing.dispose)
    const label = (text: string, background: string, x: number, y: number, options: { color?: string } = {}) => {
      const item = chip(text, background, 0.17, options)
      item.mesh.position.set(x - item.width / 2, y, 0.4)
      group.add(item.mesh)
      disposers.push(item.dispose)
      return item
    }
    const datasets = [label('dataset A', '#05dbe9', -1.6, 2.15), label('dataset B', '#a369ff', 0, 2.15), label('dataset C', '#ffcc2a', 1.6, 2.15)]
    const embedding = label('text embeddings', '#f6f4f2', 0, 2.05)
    const human = label('human answers: wide spread', '#ff4b4b', HUMAN_CENTER.x, 1.45)
    const model = label('model answers: homogenised', '#b7ff54', MODEL_CENTER.x, 1.45)

    const position = new THREE.Vector3()
    return {
      extent: [5.2, 4.6],
      update(p, time) {
        const embed = segment(p, 0.38, 0.54)
        const compare = segment(p, 0.68, 0.82)
        items.forEach((item, i) => {
          const arrive = segment(p, 0, 0.26, item.delay, 0.6)
          const toDot = segment(p, 0.38, 0.54, item.delay)
          const toSplit = segment(p, 0.68, 0.82, item.delay)
          position.copy(item.wall)
          position.x = mix(item.wall.x - 6, item.wall.x, arrive)
          position.lerp(item.cloud, toDot)
          position.lerp(item.split, toSplit)
          position.y += Math.sin(time * 0.8 + item.delay * 6) * 0.03
          const width = mix(0.56, 0.11, toDot)
          const height = mix(0.45, 0.11, toDot)
          bubbles.set(i, position.x, position.y, position.z, width * arrive, height * arrive, item.tilt * (1 - toDot))
          bubbles.setRound(i, toDot)
          bubbles.setColor(i, lerpRgb(DATASETS[item.dataset]!, item.human ? HUMAN : MODEL, toSplit))
        })
        bubbles.commit()
        const ring = segment(p, 0.76, 0.9)
        humanRing.material.opacity = ring * 0.8
        modelRing.material.opacity = ring * 0.9
        modelRing.line.scale.setScalar(mix(1.25, 0.5, ring))
        datasets.forEach((item, index) => { item.material.opacity = segment(p, 0.08 + index * 0.03, 0.14 + index * 0.03) * (1 - embed) })
        embedding.material.opacity = segment(p, 0.5, 0.56) * (1 - compare)
        human.material.opacity = segment(p, 0.8, 0.86)
        model.material.opacity = segment(p, 0.83, 0.89)
      },
      dispose() { disposers.forEach(dispose => dispose()) },
    }
  })
}
