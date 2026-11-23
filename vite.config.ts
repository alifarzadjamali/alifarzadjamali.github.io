import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/**
 * Dev only: the dev server serves an empty #root, so a page would be revealed before React builds it and the
 * cross-page view transition (home → project detail) would find nothing to morph into. Holding the first render
 * until the app script has run fixes that. The production build ships prerendered HTML and doesn't need it.
 */
const devRenderBlock = (): Plugin => ({
  name: 'dev-render-block',
  apply: 'serve',
  // render-blocking only counts in <head>, so the entry script moves there (module scripts still run after parsing)
  transformIndexHtml: {
    order: 'post',
    handler: html => {
      const entry = /<script type="module" src="(\/src\/main\.tsx[^"]*)"><\/script>/
      const src = html.match(entry)?.[1]
      return src ? html.replace(entry, '').replace('</head>', `<script type="module" src="${src}" blocking="render"></script></head>`) : html
    },
  },
})

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), devRenderBlock()],
})
