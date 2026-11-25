import { useRef, type MouseEvent } from 'react'
import type { SimpleIcon } from 'simple-icons'

/** The hidden PC page. Not linked in the nav, not in the sitemap, `noindex`. */
export const RIG_PATH = '/rig/'
/** Set just before navigating, so /rig/ knows the visitor came through the scare and skips its own intro. */
export const RIG_ENTRY_KEY = 'rig-entry'

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))
const PROMPT = '<span class="egg-p">visitor@hyperion:~$</span> '

/** Glitch away whatever matches `selector` and is on screen right now. */
function zap(selector: string) {
  const vh = window.innerHeight
  document.querySelectorAll<HTMLElement>(selector).forEach(el => {
    if (el.closest('.egg-term')) return
    const r = el.getBoundingClientRect()
    if (r.bottom > 0 && r.top < vh && r.width > 0) el.classList.add('egg-zap')
  })
}

/**
 * The trip into the rig ("sudo rm -rf" + "cd .rig"): a terminal slides up, deletes the page piece by piece,
 * says it was kidding, finds a hidden .rig/ folder, boots it and maximises into the rig page.
 * Any key or click skips straight there.
 */
export function enterRig(event?: MouseEvent) {
  event?.preventDefault()
  const root = document.documentElement
  if (root.classList.contains('egg-running')) return
  const go = () => { try { sessionStorage.setItem(RIG_ENTRY_KEY, '1') } catch { /* storage blocked: the rig plays its own intro */ } window.location.href = RIG_PATH }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { go(); return }
  root.classList.add('egg-running')

  const term = document.createElement('div')
  term.className = 'egg-term'
  term.setAttribute('aria-hidden', 'true')
  document.body.append(term)
  const add = (html: string) => { const line = document.createElement('div'); line.innerHTML = html; term.append(line); term.scrollTop = term.scrollHeight; return line }
  const type = async (text: string) => {
    const line = add(PROMPT + '<span class="egg-w"></span><i class="egg-caret"></i>')
    const out = line.querySelector('.egg-w')!
    for (const ch of text) { out.textContent += ch; await wait(40) }
    await wait(260); line.querySelector('.egg-caret')?.remove()
  }

  let skipped = false
  const skip = () => { if (skipped) return; skipped = true; go() }
  // after this click has finished bubbling, so the click that started it doesn't also skip it
  window.setTimeout(() => { window.addEventListener('keydown', skip, { once: true }); window.addEventListener('pointerdown', skip, { once: true }) }, 0)

  // Back button: the browser may restore this page from its back/forward cache exactly as it was left,
  // i.e. deleted and covered by the maximised terminal. Put everything back.
  const restore = (pageEvent: PageTransitionEvent) => {
    if (!pageEvent.persisted) return
    window.removeEventListener('pageshow', restore)
    window.removeEventListener('keydown', skip)
    window.removeEventListener('pointerdown', skip)
    term.remove()
    document.querySelectorAll('.egg-zap').forEach(el => el.classList.remove('egg-zap'))
    root.classList.remove('egg-running', 'egg-shake')
  }
  window.addEventListener('pageshow', restore)

  void (async () => {
    await wait(30); term.classList.add('is-on'); await wait(380)
    await type('sudo rm -rf /portfolio')
    const steps: [string, string][] = [
      ['nav/', '.site-header nav, .menu-toggle'],
      ['headline.tsx', 'main h1, main h2, main h3'],
      ['copy/*.md', 'main p, main li, main figcaption, main dt, main dd'],
      ['media/', 'main img, main svg, main canvas, main video, .stagger-grid'],
      ['sections/', 'main a, main button, main [class*="tile"], main [class*="card"], main section'],
      ['brand/logo.svg', '.wordmark'],
      ['footer.tsx', '.site-footer'],
    ]
    for (const [file, selector] of steps) { if (skipped) return; add(`<span class="egg-x">removed</span> '/portfolio/${file}'`); zap(selector); await wait(270) }
    if (skipped) return
    add(`<span class="egg-x">removed directory</span> '/portfolio'`); root.classList.add('egg-shake'); await wait(220); root.classList.remove('egg-shake')
    add('<span class="egg-x">portfolio deleted.</span>'); await wait(950)
    if (skipped) return
    add('<span class="egg-ok">&gt; …just kidding. nothing was deleted.</span>'); await wait(900)
    await type('ls -a /')
    add('.&nbsp;&nbsp;&nbsp;..&nbsp;&nbsp;&nbsp;portfolio/&nbsp;&nbsp;&nbsp;<span class="egg-c">.rig/</span>'); await wait(800)
    if (skipped) return
    await type('cd .rig && ./boot')
    add('<span class="egg-c">booting HYPERION…</span>'); await wait(500)
    if (skipped) return
    term.classList.add('is-max'); await wait(480)
    term.innerHTML = '<div class="egg-hyp">HYPERION<span>.</span></div>'; await wait(600)
    skip()
  })()
}

/** Trigger 1: click the glitch-F logo five times in quick succession. Each click charges the glitch a little more. */
export function useLogoEgg(clicks = 5, windowMs = 1800) {
  const times = useRef<number[]>([])
  const reset = useRef<number | undefined>(undefined)
  return (event: MouseEvent<HTMLElement>) => {
    const el = event.currentTarget
    const now = performance.now()
    times.current = [...times.current.filter(t => now - t < windowMs), now]
    const charge = times.current.length
    el.dataset.charge = String(Math.min(charge, clicks))
    el.classList.remove('is-charging'); void el.offsetWidth; el.classList.add('is-charging')
    window.clearTimeout(reset.current)
    reset.current = window.setTimeout(() => { times.current = []; delete el.dataset.charge; el.classList.remove('is-charging') }, windowMs)
    if (charge >= clicks) { times.current = []; delete el.dataset.charge; enterRig(event) }
  }
}

const icon = (title: string, path: string) => ({ title, slug: 'rig', hex: '05DBE9', source: '', svg: '', path }) as unknown as SimpleIcon

/** Trigger 3: a PC tower glyph for one hero tech-grid tile. */
export const CASE_ICON = icon('The rig', [
  'M5 1h14v2H5z', 'M5 20h14v2H5z', 'M5 1h2v21H5z', 'M17 1h2v21h-2z', // frame
  'M9 7.5a3 3 0 1 1 6 0a3 3 0 1 1-6 0zM10.8 7.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0z', // top fan (ring)
  'M9 14a3 3 0 1 1 6 0a3 3 0 1 1-6 0zM10.8 14a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0z', // bottom fan (ring)
  'M9 18h6v1H9z', // light strip
  'M6 22h3v2H6z', 'M15 22h3v2h-3z', // feet
].join(''))

/** What the big focus grid shows while the PC tile is hovered: a pixel question mark. */
export const QUESTION_ICON = icon('???', 'M7 2h10v3H7zM4 4h4v4H4zM16 4h4v6h-4zM13 9h5v3h-5zM10 11h4v5h-4zM10 18h4v4h-4z')
