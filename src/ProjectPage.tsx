import { content, type Project } from './content'

export function ProjectPage({ project }: { project: Project }) {
  return <div className="site-shell"><header className="site-header"><div className="container header-inner"><a className="wordmark" href="/">FARZAD JAMALI</a></div></header><main className="section"><article className="container project-page"><p className="mini-label">{project.category}</p><h1>{project.title}</h1><p>By <a href="/">{content.name}</a></p><p className="project-summary">{project.summary}</p><p className="project-detail">{project.detail}</p><h2>Workflow</h2><ol>{project.stages.map(stage => <li key={stage.label}><strong>{stage.label}</strong> ? {stage.description}</li>)}</ol><ul className="tag-list">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul><a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer">View repository ?</a></article></main></div>
}

export function projectForPath(path: string) {
  return content.projects.find(project => `/projects/${project.repository.split('/').pop()}/` === path.replace(/\/?$/, '/'))
}
