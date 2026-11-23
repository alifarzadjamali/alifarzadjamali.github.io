import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { ProjectPage, projectForPath } from './ProjectPage'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/caveat'
import './styles.css'

const root = document.getElementById('root')!
const project = projectForPath(window.location.pathname)
const app = <React.StrictMode>{project ? <ProjectPage project={project} /> : <App />}</React.StrictMode>
// prerendered pages (production) carry real elements; the dev server serves an empty root
if (root.firstElementChild) hydrateRoot(root, app)
// render synchronously so the page exists before the browser reveals it (view transitions need the target elements)
else { const client = createRoot(root); flushSync(() => client.render(app)) }
