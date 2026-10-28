import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { content, type Project } from './content'

const navigation = [
  ['About', '#about'],
  ['Projects', '#projects'],
  ['Research', '#research'],
  ['Experience', '#experience'],
  ['Teaching', '#teaching'],
  ['Skills', '#skills'],
  ['Contact', '#contact'],
] as const

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function SectionHeading({ id, number, eyebrow, title, description }: { id: string; number: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      <div className="section-kicker"><span>{number}</span><span>{eyebrow}</span></div>
      <h2 id={id}>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}

function ProjectVisual({ type }: { type: Project['visual'] }) {
  if (type === 'fashion') return (
    <div className="project-visual visual-fashion" aria-hidden="true">
      <div className="visual-label">IMAGE + TEXT</div>
      <div className="fashion-flow"><span className="fashion-node node-a">01<span>visual</span></span><span className="fashion-path" /><span className="fashion-node node-b">02<span>rules</span></span><span className="fashion-path" /><span className="fashion-node node-c">03<span>evidence</span></span></div>
      <div className="visual-footer">MULTIMODAL / GROUNDED</div>
    </div>
  )
  return (
    <div className="project-visual visual-floor" aria-hidden="true">
      <div className="visual-label">DOCUMENT → STRUCTURE</div>
      <div className="floor-grid"><span className="room room-a" /><span className="room room-b" /><span className="room room-c" /><span className="room room-d" /><span className="floor-cross">+</span></div>
      <div className="visual-footer">SEGMENTATION / OCR / JSON</div>
    </div>
  )
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.article className="project-card" initial={reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.45, delay: index * 0.07 }}>
      <ProjectVisual type={project.visual} />
      <div className="project-body">
        <div className="project-meta"><span>{project.number} / {project.category}</span><span>SELECTED WORK</span></div>
        <h3>{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <p className="project-detail">{project.detail}</p>
        <ul className="tag-list" aria-label={`${project.title} technologies`}>{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} repository (opens in a new tab)`}>View repository <Arrow diagonal /></a>
      </div>
    </motion.article>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="wordmark" href="#top" aria-label="Farzad Jamali, back to top"><span className="wordmark-icon">F<span>.</span></span><span>FARZAD JAMALI</span></a>
          <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
          <nav id="site-navigation" className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Primary navigation" onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false) }}>
            {navigation.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <a className="nav-cv" href={content.cv.href} download onClick={() => setMenuOpen(false)}>CV <Arrow diagonal /></a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="container hero-content">
            <motion.div className="hero-copy max-w-[680px]" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={reducedMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <p className="eyebrow"><span className="status-dot" /> AI / COMPUTER VISION / RESEARCH</p>
              <h1 id="hero-title">Building AI<br /><span>with clarity.</span></h1>
              <p className="hero-role">{content.role}</p>
              <p className="hero-intro">{content.intro}</p>
              <div className="hero-actions"><a className="button button-primary" href="#projects">Explore projects <Arrow /></a><a className="button button-outline" href="#contact">Get in touch <Arrow diagonal /></a></div>
            </motion.div>
            <div className="hero-aside" aria-label="Portfolio focus areas">
              <div className="hero-aside-top"><span>01 / 03</span><span>AREAS OF FOCUS</span></div>
              {content.focus.map((item, index) => <div className="focus-row" key={item}><span>0{index + 1}</span><strong>{item}</strong><Arrow diagonal /></div>)}
              <div className="hero-aside-bottom"><span>BASED IN {content.location.toUpperCase()}</span><span className="signal">● AVAILABLE FOR CONVERSATION</span></div>
            </div>
          </div>
          <div className="container hero-bottom"><span>SCROLL TO EXPLORE</span><span>PORTFOLIO / 2026</span></div>
        </section>

        <section className="section about-section" id="about" aria-labelledby="about-title">
          <div className="container about-grid"><SectionHeading id="about-title" number="01" eyebrow="ABOUT" title="A practical mind for complex systems." /><div className="about-copy">{content.about.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="about-foot"><span className="small-square" /><span>Research-informed thinking. Engineering-led execution.</span></div></div></div>
        </section>

        <section className="section projects-section" id="projects" aria-labelledby="projects-title">
          <div className="container"><SectionHeading id="projects-title" number="02" eyebrow="FEATURED PROJECTS" title="Selected work." description="A closer look at systems, methods, and the boundaries of what each project can claim." /><div className="project-list">{content.projects.map((project, index) => <ProjectCard key={project.number} project={project} index={index} />)}</div></div>
        </section>

        <section className="section research-section" id="research" aria-labelledby="research-title">
          <div className="container research-grid"><SectionHeading id="research-title" number="03" eyebrow="RESEARCH" title="Questions worth testing." /><div className="research-content"><span className="mini-label">CURRENT FOCUS</span><h3>{content.research.heading}</h3><p>{content.research.description}</p><div className="note-line">{content.research.note}</div></div></div>
        </section>

        <section className="section experience-section" id="experience" aria-labelledby="experience-title">
          <div className="container"><SectionHeading id="experience-title" number="04" eyebrow="EXPERIENCE" title="Work in practice." /><div className="timeline">{content.experience.map(item => <div className="timeline-item" key={item.title}><div><span className="timeline-dot" /><span className="mini-label">{item.organization}</span></div><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div></div>
        </section>

        <section className="section teaching-section" id="teaching" aria-labelledby="teaching-title">
          <div className="container teaching-grid"><SectionHeading id="teaching-title" number="05" eyebrow="TEACHING" title="Sharing the process." /><div className="teaching-card"><span className="mini-label">{content.teaching.organization}</span><h3>{content.teaching.title}</h3><p>{content.teaching.description}</p><span className="teaching-symbol" aria-hidden="true">↗</span></div></div>
        </section>

        <section className="section skills-section" id="skills" aria-labelledby="skills-title">
          <div className="container"><SectionHeading id="skills-title" number="06" eyebrow="TECHNICAL SKILLS" title="Tools, methods, judgement." /><div className="skills-grid">{content.skills.map((group, index) => <div className="skill-group" key={group.label}><span className="skill-number">0{index + 1}</span><h3>{group.label}</h3><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></div>
        </section>

        <section className="section cv-section" id="cv" aria-labelledby="cv-title"><div className="container cv-panel"><div><span className="mini-label">CURRICULUM VITAE</span><h2 id="cv-title">A concise record of the work.</h2><p>{content.cv.note}</p></div><a className="button button-primary" href={content.cv.href} download>{content.cv.label} <Arrow diagonal /></a></div></section>

        <section className="section contact-section" id="contact" aria-labelledby="contact-title"><div className="container contact-grid"><div><SectionHeading id="contact-title" number="07" eyebrow="CONTACT" title="Let’s make something useful." /><p className="contact-intro">Interested in applied AI, computer vision, or research collaboration? Reach out directly.</p><a className="contact-email" href={content.links.email}>ali292jamali@gmail.com <Arrow diagonal /></a></div><div className="contact-links"><span className="mini-label">FIND ME ELSEWHERE</span><a href={content.links.github} target="_blank" rel="noopener noreferrer">GitHub <Arrow diagonal /></a><a href={content.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a><span className="location">{content.location}</span></div></div></section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><span>© {new Date().getFullYear()} {content.name}</span><span>Built with care and clear evidence.</span><a href="#top">Back to top ↑</a></div></footer>
    </div>
  )
}

export default App
