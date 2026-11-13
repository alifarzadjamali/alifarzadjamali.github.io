import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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

const quickNavItems = [
  ...navigation.map(([label, href]) => ({ label, href, searchText: label.toLowerCase() })),
  ...content.projects.map(project => ({
    label: project.title,
    href: `#project-${project.number}`,
    searchText: [project.title, project.category, ...project.tags].join(' ').toLowerCase(),
  })),
]

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function SectionHeading({ id, number, eyebrow, title, description }: { id: string; number: string; eyebrow: string; title: string; description?: string }) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div className="section-heading" initial={reducedMotion ? false : { opacity: 0, y: 18 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.45 }} transition={{ duration: 0.45 }}>
      <div className="section-kicker"><span>{number}</span><span>{eyebrow}</span></div>
      <h2 id={id}>{title}</h2>
      {description && <p>{description}</p>}
    </motion.div>
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
        <div className="project-stages" aria-label={`${project.title} workflow`}><div className="stage-buttons">{project.stages.map((stage, stageNumber) => <button key={stage.label} type="button" aria-pressed={stageIndex === stageNumber} onClick={() => setStageIndex(stageNumber)} onKeyDown={event => { let next: number; if (event.key === 'Home') next = 0; else if (event.key === 'End') next = project.stages.length - 1; else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = (stageNumber + (event.key === 'ArrowRight' ? 1 : -1) + project.stages.length) % project.stages.length; else return; event.preventDefault(); setStageIndex(next); event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus() }}>{stageNumber + 1}. {stage.label}</button>)}</div><div className="stage-progress" aria-hidden="true"><span style={{ width: `${((stageIndex + 1) / project.stages.length) * 100}%` }} /></div><p role="status">{project.stages[stageIndex]?.description}</p></div>
        <ul className="tag-list" aria-label={`${project.title} technologies`}>{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} repository (opens in a new tab)`}>View repository <Arrow diagonal /></a>
        <button className="project-copy" type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#project-${project.number}`); setLinkStatus('Project link copied') } catch { setLinkStatus('Copy unavailable') } }}>Copy project link <span aria-hidden="true">↗</span></button><span className="inline-status" role="status">{linkStatus}</span>
      </div>
    </motion.article>
  )
}

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [localTime, setLocalTime] = useState('')
  const [focusIndex, setFocusIndex] = useState(0)
  const [focusPaused, setFocusPaused] = useState(false)
  const [projectFilter, setProjectFilter] = useState('All')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contactTopic, setContactTopic] = useState('AI collaboration')
  const [shareStatus, setShareStatus] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const searchReturnFocusRef = useRef<HTMLElement | null>(null)
  const reducedMotion = useReducedMotion()
  const matchingQuickNavItems = quickNavItems.filter(item => item.searchText.includes(searchQuery.trim().toLowerCase()))

  const openSearch = useCallback(() => {
    searchReturnFocusRef.current = menuOpen ? menuButtonRef.current : document.activeElement instanceof HTMLElement ? document.activeElement : null
    setMenuOpen(false)
    setSearchOpen(true)
  }, [menuOpen])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    window.requestAnimationFrame(() => searchReturnFocusRef.current?.focus())
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (searchOpen) closeSearch(); else openSearch() }
      if (event.key === 'Escape' && searchOpen) closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, openSearch, closeSearch])

  useEffect(() => {
    if (!searchOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const background = Array.from(document.querySelectorAll<HTMLElement>('.site-header, main, .section-rail, .back-to-top, .site-footer'))
    const previous = background.map(element => element.inert)
    background.forEach(element => { element.inert = true })
    return () => background.forEach((element, index) => { element.inert = previous[index] ?? false })
  }, [searchOpen])

  useEffect(() => {
    if (reducedMotion || focusPaused) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setFocusIndex(index => (index + 1) % content.focus.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [reducedMotion, focusPaused])

  useEffect(() => {
    const updateTime = () => setLocalTime(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
    updateTime()
    const timer = window.setInterval(updateTime, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let frame = 0
    const updateProgress = () => {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0)
    }
    const scheduleProgress = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress)
    }
    updateProgress()
    window.addEventListener('scroll', scheduleProgress, { passive: true })
    window.addEventListener('resize', scheduleProgress)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('scroll', scheduleProgress); window.removeEventListener('resize', scheduleProgress) }
  }, [])

  useEffect(() => {
    const revealLinkedProject = () => {
      const id = window.location.hash.slice(1)
      if (!content.projects.some(project => id === `project-${project.number}`)) return
      setProjectFilter('All')
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
    }
    window.addEventListener('hashchange', revealLinkedProject)
    revealLinkedProject()
    return () => window.removeEventListener('hashchange', revealLinkedProject)
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
          <button className="quick-nav-trigger" type="button" onClick={openSearch}>Jump to… <kbd>Ctrl / ⌘ K</kbd></button>
          <button ref={menuButtonRef} className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
          <nav id="site-navigation" className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Primary navigation">
            <button className="mobile-search" type="button" onClick={openSearch}>Search sections and projects <Arrow /></button>
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
              <div className="hero-focus-control"><p className="hero-focus" aria-live="off"><span>FOCUS / 0{focusIndex + 1}</span><AnimatePresence mode="wait" initial={false}><motion.span className="hero-focus-value" key={focusIndex} initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -7 }} transition={{ duration: 0.2 }}>{content.focus[focusIndex]?.label}</motion.span></AnimatePresence></p>{!reducedMotion && <button className="focus-pause" type="button" aria-label={focusPaused ? 'Play focus rotation' : 'Pause focus rotation'} aria-pressed={focusPaused} onClick={() => setFocusPaused(paused => !paused)}>{focusPaused ? '▶' : 'Ⅱ'}</button>}</div>
              <div className="focus-selectors" role="group" aria-label="Choose a focus area">{content.focus.map((focus, index) => <button key={focus.label} type="button" className={focusIndex === index ? 'is-active' : ''} aria-label={`Show ${focus.label}`} aria-pressed={focusIndex === index} onClick={() => { setFocusIndex(index); setFocusPaused(true) }} />)}</div>
              <p className="hero-intro">{content.intro}</p>
              <div className="hero-actions"><a className="button button-primary" href="#projects">Explore projects <Arrow /></a><a className="button button-outline" href="#contact">Get in touch <Arrow diagonal /></a><button className="button button-share" type="button" onClick={async () => { try { if (navigator.share) { await navigator.share({ title: document.title, url: window.location.href }) } else { await navigator.clipboard.writeText(window.location.href); setShareStatus('Portfolio link copied') } } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; setShareStatus('Sharing unavailable') } }}>Share ↗</button></div><span className="inline-status" role="status">{shareStatus}</span>
            </motion.div>
            <div className="hero-aside" aria-label="Portfolio focus areas">
              <div className="hero-aside-top"><span>01 / {String(content.focus.length).padStart(2, '0')}</span><span>AREAS OF FOCUS</span></div>
              {content.focus.map((item, index) => <a className="focus-row" href={item.href} key={item.label}><span>0{index + 1}</span><strong>{item.label}</strong><Arrow diagonal /></a>)}
              <div className="hero-aside-bottom"><span>BASED IN {content.location.toUpperCase()}{localTime && <span className="local-time"> · {localTime} LOCAL</span>}</span><span className="signal">● AVAILABLE FOR CONVERSATION</span></div>
            </div>
          </div>
          <div className="container hero-bottom"><a className="hero-scroll-link" href="#about">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a><span>PORTFOLIO / {new Date().getFullYear()}</span></div>
        </section>

        <section className="section about-section" id="about" aria-labelledby="about-title">
          <div className="container about-grid"><SectionHeading id="about-title" number="01" eyebrow="ABOUT" title="A practical mind for complex systems." /><div className="about-copy">{content.about.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="about-foot"><span className="small-square" /><span>Research-informed thinking. Engineering-led execution.</span></div></div></div>
        </section>

        <section className="section projects-section" id="projects" aria-labelledby="projects-title">
          <div className="container"><SectionHeading id="projects-title" number="02" eyebrow="FEATURED PROJECTS" title="Selected work." description="A closer look at systems, methods, and the boundaries of what each project can claim." /><div className="project-filters" role="group" aria-label="Filter projects">{['All', ...new Set(content.projects.map(project => project.category))].map(filter => <button key={filter} type="button" aria-pressed={projectFilter === filter} onClick={() => setProjectFilter(filter)} onKeyDown={event => { const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll('button') ?? []); const current = buttons.indexOf(event.currentTarget); let next: number; if (event.key === 'Home') next = 0; else if (event.key === 'End') next = buttons.length - 1; else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length; else return; event.preventDefault(); buttons[next]?.focus(); buttons[next]?.click() }}>{filter}</button>)}</div><div className="project-list">{content.projects.map((project, index) => <div key={project.number} hidden={projectFilter !== 'All' && project.category !== projectFilter}><ProjectCard project={project} index={index} /></div>)}</div></div>
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

        <section className="section contact-section" id="contact" aria-labelledby="contact-title"><div className="container contact-grid"><div><SectionHeading id="contact-title" number="07" eyebrow="CONTACT" title="Let’s make something useful." /><p className="contact-intro">Interested in applied AI, computer vision, or research collaboration? Reach out directly.</p><a className="contact-email" href={content.links.email}>{content.emailAddress} <Arrow diagonal /></a><div className="contact-topic"><label htmlFor="contact-topic">Start with a topic</label><select id="contact-topic" value={contactTopic} onChange={event => setContactTopic(event.target.value)}><option>AI collaboration</option><option>Computer vision project</option><option>Research conversation</option><option>Something else</option></select><a href={`${content.links.email}?subject=${encodeURIComponent(contactTopic)}`}>Compose email <Arrow diagonal /></a></div><div className="copy-email-row"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(content.emailAddress); setCopyStatus('Email address copied.') } catch { setCopyStatus('Copy unavailable. Use the email link above.') } }}>Copy email address</button><span role="status" aria-live="polite">{copyStatus}</span></div></div><div className="contact-links"><span className="mini-label">FIND ME ELSEWHERE</span><a href={content.links.github} target="_blank" rel="noopener noreferrer">GitHub <Arrow diagonal /></a><a href={content.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a><a href="/farzad-jamali.vcf" download>Save contact <Arrow diagonal /></a><span className="location">{content.location}</span></div></div></section>
      </main>
      <nav className={`section-rail ${scrollProgress > 5 ? 'is-visible' : ''}`} aria-label="Page sections">{navigation.map(([label, href]) => <a key={href} href={href} aria-label={label} aria-current={activeSection === href ? 'location' : undefined} title={label}><span /></a>)}</nav>
       {searchOpen && <div className="quick-nav-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) closeSearch() }}><div className="quick-nav" role="dialog" aria-modal="true" aria-label="Quick navigation" onKeyDown={event => { if (event.key !== 'Tab') return; const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, button, a')); const first = items[0]; const last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } }}><div className="quick-nav-input"><input autoFocus aria-label="Find a section or project" placeholder="Find a section or project…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /><button type="button" onClick={closeSearch} aria-label="Close quick navigation">Esc</button></div><div className="quick-nav-results">{matchingQuickNavItems.map(item => <a key={item.href} href={item.href} onClick={() => { if (item.href.startsWith('#project-')) setProjectFilter('All'); setSearchOpen(false); setSearchQuery('') }}>{item.label}<Arrow /></a>)}{matchingQuickNavItems.length === 0 && <p className="quick-nav-empty">No matching sections or projects.</p>}</div></div></div>}
      <a className={`back-to-top ${scrollProgress > 18 ? 'is-visible' : ''}`} href="#top" aria-label="Back to top" tabIndex={scrollProgress > 18 ? 0 : -1}>↑</a>
      <footer className="site-footer"><div className="container footer-inner"><span>© {new Date().getFullYear()} {content.name}</span><span>Built with care and clear evidence.</span><a href="#top">Back to top ↑</a></div></footer>
    </div>
  )
}

export default App
