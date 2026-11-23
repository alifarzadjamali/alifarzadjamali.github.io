import { useState, type CSSProperties } from 'react'
import { PixelLogo } from './PixelLogo'
import { content, type Project } from './content'
import { navigation } from './navigation'
import { SiteFooter } from './SiteFooter'

const slugOf = (project: Project) => project.repository.split('/').pop()!
const pathOf = (project: Project) => `/projects/${slugOf(project)}/`
const figureAlt = (project: Project) => project.visual === 'fabric'
  ? `${project.title}: fabric images with predicted defect areas and reference outlines`
  : `${project.title}: floor plan with segmentation prediction and reference mask`

/** Same header as the home page; links jump back into the home page's sections. */
function DetailHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="wordmark" href="/" aria-label="Farzad Jamali, home"><PixelLogo className="wordmark-icon" /><span className="wordmark-text">ARZAD JAMALI</span></a>
        <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}><span /><span /></button>
        <nav id="site-navigation" className={open ? 'nav nav-open' : 'nav'} aria-label="Primary navigation">
          {navigation.map(([label, href]) => <a key={href} href={`/${href}`} aria-current={href === '#projects' ? 'location' : undefined} onClick={() => setOpen(false)}>{label}</a>)}
          <a className="nav-cv" href={content.cv.href} download onClick={() => setOpen(false)}>CV</a>
        </nav>
      </div>
    </header>
  )
}

/** 01–05 pills, as on the home page's project stories; here they switch between detail pages. */
function ProjectPills({ current }: { current: Project }) {
  return (
    <nav className="project-story-index" aria-label="Projects">
      {content.projects.map(item => <a key={item.number} href={pathOf(item)} aria-current={item === current ? 'page' : undefined} title={item.title}>{item.number}</a>)}
    </nav>
  )
}

/** Opening: pills, title and summary; the Project notes bento follows straight after. */
function DetailHero({ project }: { project: Project }) {
  return (
    <section className="detail-hero" aria-labelledby="project-title">
      <div className="container">
        <ProjectPills current={project} />
        <span className="project-story-meta">{project.number} / {project.category}</span>
        <h1 id="project-title" className="detail-title">{project.title}</h1>
        <p className="detail-lead">{project.summary}</p>
      </div>
    </section>
  )
}

export function ProjectPage({ project }: { project: Project }) {
  const index = content.projects.indexOf(project)
  const count = content.projects.length
  const prev = content.projects[(index - 1 + count) % count]!
  const next = content.projects[(index + 1) % count]!

  return <div className="site-shell detail-page">
    <a className="skip-link" href="#main">Skip to content</a>
    <DetailHeader />
    <main id="main" tabIndex={-1}>
      <DetailHero project={project} />

      <section className="detail-notes" id="notes" aria-labelledby="notes-title">
        <div className="container">
          <h2 id="notes-title" className="record-title">Project <span>notes.</span></h2>
          <div className="record-grid detail-grid">
            <div className="record-col">
              {project.metric && <div className="record-tile record-stat detail-metric"><b>{project.metric.value}</b><span>{project.metric.label}</span></div>}
              <div className="record-tile record-grow">
                <h3 className="record-kicker"><span>01</span>OVERVIEW</h3>
                <p className="detail-strong">{project.summary}</p>
                <p className="detail-text">{project.detail}</p>
              </div>
            </div>
            <div className="record-col">
              <div className="record-tile record-research">
                <h3 className="record-kicker"><span>02</span>APPROACH</h3>
                {project.stages.map((stage, stageIndex) => <div className="record-row" key={stage.label}><em>STEP {String(stageIndex + 1).padStart(2, '0')}</em><b>{stage.label}</b><i>{stage.description}</i></div>)}
              </div>
              <div className="record-tile record-grow">
                <h3 className="record-kicker"><span>03</span>RESULTS</h3>
                <p className="detail-text">{project.results}</p>
              </div>
            </div>
            <div className="record-col">
              <div className="record-tile record-grow detail-limits">
                <h3 className="record-kicker"><span>04</span>LIMITATIONS</h3>
                <span className="record-tag is-cyan">Honest about limits</span>
                <p className="detail-text">{project.limitations}</p>
              </div>
              <div className="record-tile">
                <h3 className="record-kicker"><span>05</span>STACK</h3>
                <ul className="tag-list detail-tags">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
              </div>
              <a className="record-tile detail-repo" href={project.repository} target="_blank" rel="noopener noreferrer">
                <span>Code &amp; evaluation</span><b>View repository</b>
              </a>
            </div>
          </div>

          {project.image && (
            <figure className="cv-panel detail-figure">
              <p className="mini-label">FROM THE REPOSITORY</p>
              <img src={project.image} width={project.imageWidth} height={project.imageHeight} alt={figureAlt(project)} loading="lazy" />
              <figcaption>Example from the project repository; source dataset terms apply.</figcaption>
            </figure>
          )}

          <nav className="detail-more" aria-label="More projects">
            <a className="record-tile detail-step" href={pathOf(prev)}><em>PREVIOUS · {prev.number}</em><b>{prev.title}</b></a>
            <a className="record-tile detail-step is-next" href={pathOf(next)} style={{ '--accent': 'var(--brand-red)' } as CSSProperties}><em>NEXT PROJECT · {next.number}</em><b>{next.title}</b></a>
          </nav>
          <a className="text-link detail-all" href="/#projects">All projects on the home page</a>
        </div>
      </section>
    </main>
    <SiteFooter top="#main" />
  </div>
}

export function projectForPath(path: string) {
  return content.projects.find(project => pathOf(project) === path.replace(/\/?$/, '/'))
}
