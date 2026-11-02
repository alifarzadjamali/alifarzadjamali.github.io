import { useEffect, useRef, useState } from 'react'
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
  const [stageIndex, setStageIndex] = useState(0)
  const [linkStatus, setLinkStatus] = useState('')
  return (
    <motion.article id={`project-${project.number}`} className="project-card" aria-labelledby={`project-title-${project.number}`} initial={reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.45, delay: index * 0.07 }}>
      <ProjectVisual type={project.visual} />
      <div className="project-body">
        <div className="project-meta"><span>{project.number} / {project.category}</span><span>SELECTED WORK</span></div>
        <h3 id={`project-title-${project.number}`}><a className="project-permalink" href={`#project-${project.number}`} aria-label={`Link to ${project.title}`}>{project.title}<span aria-hidden="true"> #</span></a></h3>
        <p className="project-summary">{project.summary}</p>
        <p className="project-detail">{project.detail}</p>
        <div className="project-stages" aria-label={`${project.title} workflow`}><div className="stage-buttons">{project.stages.map((stage, stageNumber) => <button key={stage.label} type="button" aria-pressed={stageIndex === stageNumber} onClick={() => setStageIndex(stageNumber)}>{stageNumber + 1}. {stage.label}</button>)}</div><p role="status">{project.stages[stageIndex].description}</p></div>
        <ul className="tag-list" aria-label={`${project.title} technologies`}>{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} repository (opens in a new tab)`}>View repository <Arrow diagonal /></a>
        <button className="project-copy" type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#project-${project.number}`); setLinkStatus('Project link copied') } catch { setLinkStatus('Copy unavailable') } }}>Copy project link <span aria-hidden="true">↗</span></button><span className="sr-only" role="status">{linkStatus}</span>
      </div>
    </motion.article>
  )
}

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [localTime, setLocalTime] = useState('')
  const [focusIndex, setFocusIndex] = useState(0)
  const [projectFilter, setProjectFilter] = useState('All')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(open => !open) }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(() => setFocusIndex(index => (index + 1) % content.focus.length), 3600)
    return () => window.clearInterval(timer)
  }, [reducedMotion])

  useEffect(() => {
    const updateTime = () => setLocalTime(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
    updateTime()
    const timer = window.setInterval(updateTime, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => { window.removeEventListener('scroll', updateProgress); window.removeEventListener('resize', updateProgress) }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || menuButtonRef.current?.contains(event.target) || document.getElementById('site-navigation')?.contains(event.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [menuOpen])

  useEffect(() => {
    const sections = navigation
      .map(([, href]) => document.querySelector<HTMLElement>(href))
      .filter((section): section is HTMLElement => section !== null)
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible[0]) setActiveSection(`#${visible[0].target.id}`)
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="reading-progress" role="progressbar" aria-label="Page reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(scrollProgress)} style={{ width: `${scrollProgress}%` }} />
        <div className="container header-inner">
          <a className="wordmark" href="#top" aria-label="Farzad Jamali, back to top"><span className="wordmark-icon">F<span>.</span></span><span>FARZAD JAMALI</span></a>
          <button className="quick-nav-trigger" type="button" onClick={() => setSearchOpen(true)}>Jump to… <kbd>⌘ K</kbd></button>
          <button ref={menuButtonRef} className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
          <nav id="site-navigation" className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Primary navigation">
            {navigation.map(([label, href]) => <a key={href} href={href} aria-current={activeSection === href ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <a className="nav-cv" href={content.cv.href} download onClick={() => setMenuOpen(false)}>CV <Arrow diagonal /></a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title" onPointerMove={event => { if (reducedMotion || event.pointerType === 'touch') return; const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`); event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`) }}>
          <div className="hero-grid" aria-hidden="true" />
          <div className="container hero-content">
            <motion.div className="hero-copy max-w-[680px]" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={reducedMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <p className="eyebrow"><span className="status-dot" /> AI / COMPUTER VISION / RESEARCH</p>
              <h1 id="hero-title">Building AI<br /><span>with clarity.</span></h1>
              <p className="hero-role">{content.role}</p>
              <p className="hero-focus" aria-live="off"><span>FOCUS / 0{focusIndex + 1}</span>{content.focus[focusIndex]}</p>
              <p className="hero-intro">{content.intro}</p>
              <div className="hero-actions"><a className="button button-primary" href="#projects">Explore projects <Arrow /></a><a className="button button-outline" href="#contact">Get in touch <Arrow diagonal /></a></div>
            </motion.div>
            <div className="hero-aside" aria-label="Portfolio focus areas">
              <div className="hero-aside-top"><span>01 / 03</span><span>AREAS OF FOCUS</span></div>
              {content.focus.map((item, index) => <a className="focus-row" href={['#project-02', '#project-01', '#research'][index]} key={item}><span>0{index + 1}</span><strong>{item}</strong><Arrow diagonal /></a>)}
              <div className="hero-aside-bottom"><span>BASED IN {content.location.toUpperCase()}{localTime && <span className="local-time"> · {localTime} LOCAL</span>}</span><span className="signal">● AVAILABLE FOR CONVERSATION</span></div>
            </div>
          </div>
          <div className="container hero-bottom"><span>SCROLL TO EXPLORE</span><span>PORTFOLIO / 2026</span></div>
        </section>

        <section className="section about-section" id="about" aria-labelledby="about-title">
          <div className="container about-grid"><SectionHeading id="about-title" number="01" eyebrow="ABOUT" title="A practical mind for complex systems." /><div className="about-copy">{content.about.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="about-foot"><span className="small-square" /><span>Research-informed thinking. Engineering-led execution.</span></div></div></div>
        </section>

        <section className="section projects-section" id="projects" aria-labelledby="projects-title">
          <div className="container"><SectionHeading id="projects-title" number="02" eyebrow="FEATURED PROJECTS" title="Selected work." description="A closer look at systems, methods, and the boundaries of what each project can claim." /><div className="project-filters" role="group" aria-label="Filter projects">{['All', ...content.projects.map(project => project.category)].map(filter => <button key={filter} type="button" aria-pressed={projectFilter === filter} onClick={() => setProjectFilter(filter)}>{filter}</button>)}</div><div className="project-list">{content.projects.filter(project => projectFilter === 'All' || project.category === projectFilter).map((project, index) => <ProjectCard key={project.number} project={project} index={index} />)}</div></div>
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

        <section className="section contact-section" id="contact" aria-labelledby="contact-title"><div className="container contact-grid"><div><SectionHeading id="contact-title" number="07" eyebrow="CONTACT" title="Let’s make something useful." /><p className="contact-intro">Interested in applied AI, computer vision, or research collaboration? Reach out directly.</p><a className="contact-email" href={content.links.email}>ali292jamali@gmail.com <Arrow diagonal /></a><div className="copy-email-row"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText('ali292jamali@gmail.com'); setCopyStatus('Email address copied.') } catch { setCopyStatus('Copy unavailable. Use the email link above.') } }}>Copy email address</button><span role="status" aria-live="polite">{copyStatus}</span></div></div><div className="contact-links"><span className="mini-label">FIND ME ELSEWHERE</span><a href={content.links.github} target="_blank" rel="noopener noreferrer">GitHub <Arrow diagonal /></a><a href={content.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a><a href="/farzad-jamali.vcf" download>Save contact <Arrow diagonal /></a><span className="location">{content.location}</span></div></div></section>
      </main>
      {searchOpen && <div className="quick-nav-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setSearchOpen(false) }}><div className="quick-nav" role="dialog" aria-modal="true" aria-label="Quick navigation"><div className="quick-nav-input"><input autoFocus aria-label="Find a section or project" placeholder="Find a section or project…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /><button type="button" onClick={() => setSearchOpen(false)} aria-label="Close quick navigation">Esc</button></div><div className="quick-nav-results">{[...navigation.map(([label, href]) => ({ label, href })), ...content.projects.map(project => ({ label: project.title, href: `#project-${project.number}` }))].filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase())).map(item => <a key={item.href} href={item.href} onClick={() => { setSearchOpen(false); setSearchQuery('') }}>{item.label}<Arrow /></a>)}</div></div></div>}
      <a className={`back-to-top ${scrollProgress > 18 ? 'is-visible' : ''}`} href="#top" aria-label="Back to top" tabIndex={scrollProgress > 18 ? 0 : -1}>↑</a>
      <footer className="site-footer"><div className="container footer-inner"><span>© {new Date().getFullYear()} {content.name}</span><span>Built with care and clear evidence.</span><a href="#top">Back to top ↑</a></div></footer>
    </div>
  )
}

export default App
