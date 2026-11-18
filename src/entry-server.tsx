import { renderToString } from 'react-dom/server'
import App from './App'
import { ProjectPage } from './ProjectPage'
import { content } from './content'

export { content }
export function render(slug?: string) {
  const project = content.projects.find(item => item.repository.split('/').pop() === slug)
  return renderToString(project ? <ProjectPage project={project} /> : <App />)
}
