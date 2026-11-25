import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { render, content } from '../.ssr/entry-server.js'

const base = 'https://alifarzadjamali.github.io'
const template = await readFile('dist/index.html', 'utf8')
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const inject = (html, markup) => html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`)
await writeFile('dist/index.html', inject(template, render()))
const paths = ['/']
for (const project of content.projects) {
  const slug = project.repository.split('/').pop()
  const path = `/projects/${slug}/`
  paths.push(path)
  const url = base + path
  const title = `${project.title} — Ali (Farzad) Jamali`
  const replaceMeta = (html, key, value) => html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*/>)`), (_, start, end) => start + escape(value) + end)
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`).replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
  for (const [key, value] of Object.entries({ description: project.summary, 'og:type': 'article', 'og:title': title, 'og:description': project.summary, 'og:url': url, 'twitter:title': title, 'twitter:description': project.summary })) html = replaceMeta(html, key, value)
  const schema = { '@context': 'https://schema.org', '@type': 'SoftwareSourceCode', name: project.title, description: project.summary, url, codeRepository: project.repository, author: { '@type': 'Person', '@id': `${base}/#person`, name: content.name, url: `${base}/` } }
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace('</head>', () => `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script></head>`)
  await mkdir(`dist/projects/${slug}`, { recursive: true })
  await writeFile(`dist/projects/${slug}/index.html`, inject(html, render(slug)))
}
// easter egg: /rig/ is built like any page but kept out of search engines and the sitemap
{
  const title = 'HYPERION — the rig'
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${base}/rig/"`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/\s*<meta (?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)" content="[^"]*"\s*\/>/g, '')
    .replace('</head>', '<meta name="robots" content="noindex, nofollow" /></head>')
  await mkdir('dist/rig', { recursive: true })
  await writeFile('dist/rig/index.html', inject(html, render('rig')))
}
const date = new Date().toISOString().slice(0, 10)
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `\n  <url><loc>${base}${path}</loc><lastmod>${date}</lastmod></url>`).join('')}\n</urlset>\n`)

async function validateHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await validateHtml(path)
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8')
      if (html.includes('\uFFFD') || html.includes(' ? ') || html.includes(' ?<')) throw new Error(`Broken character in ${path}`)
      for (const match of html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(match[1])
    }
  }
}
await validateHtml('dist')
