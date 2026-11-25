import { renderToString } from 'react-dom/server'
import App from './App'
import { ProjectPage } from './ProjectPage'
import { RigPage } from './RigPage'
import { content } from './content'

export { content }
export function render(slug?: string) {
  if (slug === 'rig') return renderToString(<RigPage />)
  const project = content.projects.find(item => item.repository.split('/').pop() === slug)
  return renderToString(project ? <ProjectPage project={project} /> : <App />)
}
