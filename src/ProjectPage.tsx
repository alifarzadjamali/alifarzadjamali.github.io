import { content, type Project } from './content'
import { SiteFooter } from './SiteFooter'

export function ProjectPage({ project }: { project: Project }) {
  return <div className="site-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="container header-inner"><a className="wordmark" href="/"><span className="wordmark-icon">F</span><span>FARZAD JAMALI</span></a><a className="text-link" href="/#projects">← All projects</a></div></header>
    <main className="section" id="main"><article className="container project-page">
      <p className="mini-label">{project.category}</p><h1>{project.title}</h1><p>By <a href="/">{content.name}</a></p>
      <h2>Overview</h2><p className="project-summary">{project.summary}</p>
      <h2>Approach</h2><p className="project-detail">{project.detail}</p><ol className="project-workflow">{project.stages.map(stage => <li key={stage.label}><strong>{stage.label}</strong> — {stage.description}</li>)}</ol>
      <h2>Results</h2><p>{project.results}</p>
      {project.image && <figure className="project-figure"><img src={project.image} alt={project.visual === 'fabric' ? `${project.title}: fabric images with predicted defect areas and reference outlines` : `${project.title}: floor plan with segmentation prediction and reference mask`} loading="lazy" /><figcaption>Example from the project repository; source dataset terms apply.</figcaption></figure>}
      <h2>Limitations</h2><p>{project.limitations}</p>
      <h2>Tech</h2><ul className="tag-list">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      <a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer">View repository ↗</a>
      <section className="more-projects"><h2>More projects</h2><ul>{content.projects.filter(item => item.repository !== project.repository).map(item => <li key={item.repository}><a href={`/projects/${item.repository.split('/').pop()}/`}>{item.title} →</a></li>)}</ul></section>
    </article></main><SiteFooter />
  </div>
}

export function projectForPath(path: string) {
  return content.projects.find(project => `/projects/${project.repository.split('/').pop()}/` === path.replace(/\/?$/, '/'))
}
