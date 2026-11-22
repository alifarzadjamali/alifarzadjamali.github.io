import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { ProjectPage, projectForPath } from './ProjectPage'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/jetbrains-mono'
import './styles.css'

const root = document.getElementById('root')!
const project = projectForPath(window.location.pathname)
const app = <React.StrictMode>{project ? <ProjectPage project={project} /> : <App />}</React.StrictMode>
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
