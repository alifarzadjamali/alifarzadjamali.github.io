import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { content, type Project } from './content'
import { SiteFooter } from './SiteFooter'
import { HeroGrid } from './HeroGrid'
import { RecordSection } from './RecordSection'
import { PixelLogo } from './PixelLogo'
import { IntroTransition, useIntroEnabled } from './IntroTransition'
import { ProjectStories, useStoriesEnabled } from './ProjectStory'
import { navigation } from './navigation'
import { useLogoEgg } from './rig/egg'


const quickNavItems = [
  ...navigation.map(([label, href]) => ({
    label,
    href,
    searchText: [
      label,
      ...(href === '#research' ? [content.research.heading, content.research.description, 'work jobs degrees study'] : []),
      ...(href === '#contact' ? ['email', content.emailAddress] : []),
    ].join(' ').toLowerCase(),
  })),
  { label: 'View CV', href: content.cv.href, searchText: 'cv resume curriculum vitae' },
  ...content.projects.map(project => ({
    label: project.title,
    href: `#project-${project.number}`,
    searchText: [project.title, project.category, ...project.tags].join(' ').toLowerCase(),
  })),
]

function SectionHeading({ id, number, eyebrow, title, description }: { id: string; number: string; eyebrow: string; title: ReactNode; description?: ReactNode }) {
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
  return <div className="project-visual project-artwork" aria-hidden="true"><img src={`/projects/artwork/${type}.webp`} alt="" width="1000" height="1000" loading="lazy" /></div>
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
        <h3 id={`project-title-${project.number}`}><a className="project-permalink" href={`/projects/${project.repository.split('/').pop()}/`} aria-label={`Read about ${project.title}`}>{project.title}</a></h3>
        <p className="project-summary">{project.summary}</p>
        <p className="project-detail">{project.detail}</p><p className="project-detail">{project.results}</p>
        <div className="project-stages" aria-label={`${project.title} workflow`}><div className="stage-buttons">{project.stages.map((stage, stageNumber) => <button key={stage.label} type="button" aria-pressed={stageIndex === stageNumber} aria-controls={`stage-description-${project.number}`} onClick={() => setStageIndex(stageNumber)} onKeyDown={event => { let next: number; if (event.key === 'Home') next = 0; else if (event.key === 'End') next = project.stages.length - 1; else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = (stageNumber + (event.key === 'ArrowRight' ? 1 : -1) + project.stages.length) % project.stages.length; else return; event.preventDefault(); setStageIndex(next); event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus() }}>{stageNumber + 1}. {stage.label}</button>)}</div><div className="stage-progress" aria-hidden="true"><span style={{ width: `${((stageIndex + 1) / project.stages.length) * 100}%` }} /></div><p id={`stage-description-${project.number}`} role="status">{project.stages[stageIndex]?.description}</p></div>
        <ul className="tag-list" aria-label={`${project.title} technologies`}>{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <a className="text-link project-details-link" href={`/projects/${project.repository.split('/').pop()}/`}>Read project details</a><a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} repository (opens in a new tab)`}>View repository</a>
        <button className="project-copy" type="button" onClick={async () => { try { await navigator.clipboard.writeText(`https://alifarzadjamali.github.io/projects/${project.repository.split('/').pop()}/`); setLinkStatus('Project link copied') } catch { setLinkStatus('Copy unavailable') } }}>Copy project link</button><span className="inline-status" role="status">{linkStatus}</span>
      </div>
    </motion.article>
  )
}

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const onLogoClick = useLogoEgg()
  const [localTime, setLocalTime] = useState('')
  const [year, setYear] = useState('')
  const [focusIndex, setFocusIndex] = useState(0)
  const [focusPaused, setFocusPaused] = useState(false)
  const [asideHover, setAsideHover] = useState(false)
  const storiesEnabled = useStoriesEnabled()
  const introEnabled = useIntroEnabled()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contactTopic, setContactTopic] = useState('AI collaboration')
  const [shareStatus, setShareStatus] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSections, setActiveSections] = useState<string[]>([])
  const [copyStatus, setCopyStatus] = useState('')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const searchReturnFocusRef = useRef<HTMLElement | null>(null)
  const reducedMotion = useReducedMotion()
  const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matchingQuickNavItems = quickNavItems.filter(item => searchTerms.every(term => item.searchText.includes(term)))

  const openSearch = useCallback(() => {
    searchReturnFocusRef.current = menuOpen ? menuButtonRef.current : document.activeElement instanceof HTMLElement ? document.activeElement : null
    setMenuOpen(false)
    setSearchOpen(true)
  }, [menuOpen])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    window.requestAnimationFrame(() => searchReturnFocusRef.current?.focus())
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (searchOpen) closeSearch(); else openSearch() }
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
    const background = Array.from(document.querySelectorAll<HTMLElement>('.site-header, main, .section-rail, .site-footer'))
    const previous = background.map(element => element.inert)
    background.forEach(element => { element.inert = true })
    return () => background.forEach((element, index) => { element.inert = previous[index] ?? false })
  }, [searchOpen])

  useEffect(() => {
    if (reducedMotion || focusPaused || asideHover) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setFocusIndex(index => (index + 1) % content.focus.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [reducedMotion, focusPaused, asideHover])

  useEffect(() => {
    const updateTime = () => setLocalTime(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
    setYear(String(new Date().getFullYear()))
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
    const resizeObserver = new ResizeObserver(scheduleProgress)
    resizeObserver.observe(document.documentElement)
    return () => { window.cancelAnimationFrame(frame); resizeObserver.disconnect(); window.removeEventListener('scroll', scheduleProgress); window.removeEventListener('resize', scheduleProgress) }
  }, [])

  useEffect(() => {
    const revealLinkedProject = () => {
      const id = window.location.hash.slice(1)
      if (!content.projects.some(project => id === `project-${project.number}`)) return
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
    }
    window.addEventListener('hashchange', revealLinkedProject)
    revealLinkedProject()
    return () => window.removeEventListener('hashchange', revealLinkedProject)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const desktop = window.matchMedia('(min-width: 801px)')
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
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
      desktop.removeEventListener('change', closeOnDesktop)
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [menuOpen])

  // Active nav item(s) from scroll position. Each link's target is the exact scroll position its anchor jumps to
  // (anchor top − scroll-padding − scroll-margin), so the highlight and the click always agree, including inside the
  // pinned scenes. Research, Experience and Education share one screen, so they light up together.
  useEffect(() => {
    let frame = 0
    const padding = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const targets = navigation.flatMap(([, href]) => {
        const el = document.querySelector<HTMLElement>(href)
        if (!el) return []
        const top = el.getBoundingClientRect().top + window.scrollY - padding() - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)
        return [{ href, top: Math.min(max, Math.max(0, top)) }]
      })
      const probe = window.scrollY + window.innerHeight * 0.4
      const reached = targets.filter(target => target.top <= probe)
      const last = reached.length ? Math.max(...reached.map(target => target.top)) : -1
      const next = last < 0 ? [] : reached.filter(target => Math.abs(target.top - last) < 4).map(target => target.href)
      setActiveSections(current => (current.join() === next.join() ? current : next))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="reading-progress" role="progressbar" aria-label="Page reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(scrollProgress)} style={{ width: `${scrollProgress}%` }} />
        <div className="container header-inner">
          <a className="wordmark" href="#top" aria-label="Farzad Jamali, back to top" onClick={onLogoClick}><PixelLogo className="wordmark-icon" /><span className="wordmark-text">ARZAD JAMALI</span></a>
          <button ref={menuButtonRef} className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
          <nav id="site-navigation" className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Primary navigation">
            <button className="mobile-search" type="button" onClick={openSearch}>Search sections and projects</button>
            {navigation.map(([label, href]) => <a key={href} href={href} aria-current={activeSections.includes(href) ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <a className="nav-cv" href={content.cv.href} download onClick={() => setMenuOpen(false)}>CV</a>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={[introEnabled && storiesEnabled ? 'intro-joined' : '', storiesEnabled ? 'stories-on' : ''].filter(Boolean).join(' ') || undefined}>
        <IntroTransition enabled={introEnabled} hero={<section className="hero" id={introEnabled ? undefined : 'top'} aria-labelledby="hero-title" onPointerMove={event => { if (reducedMotion || event.pointerType === 'touch') return; const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`); event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`) }}>
          <div className="container hero-content">
            <HeroGrid onHover={setAsideHover} />
            <motion.div className="hero-copy">
              <p className="eyebrow"><span className="status-dot" /> AI / COMPUTER VISION / RESEARCH</p>
              <h1 id="hero-title" className="hero-headline"><span className="sr-only">{content.name}: </span>Building AI<br /><span className="hero-accent">with clarity.</span></h1>
              <p className="hero-role">{content.role}</p>
              <div className="hero-focus-control" onFocusCapture={() => setFocusPaused(true)}><p className="hero-focus" aria-live="off"><span>FOCUS / 0{focusIndex + 1}</span><AnimatePresence mode="wait" initial={false}><motion.span className="hero-focus-value" key={focusIndex} initial={false} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -7 }} transition={{ duration: 0.2 }}>{content.focus[focusIndex]?.label}</motion.span></AnimatePresence></p>{!reducedMotion && <button className="focus-pause" type="button" aria-label={focusPaused ? 'Play focus rotation' : 'Pause focus rotation'} aria-pressed={focusPaused} onClick={() => setFocusPaused(paused => !paused)}>{focusPaused ? '▶' : 'Ⅱ'}</button>}</div>
              <div className="focus-selectors" role="group" aria-label="Choose a focus area">{content.focus.map((focus, index) => <button key={focus.label} type="button" className={focusIndex === index ? 'is-active' : ''} aria-label={`Show ${focus.label}`} aria-pressed={focusIndex === index} onClick={() => { setFocusIndex(index); setFocusPaused(true) }} />)}</div>
              <p className="hero-intro">{content.intro}</p>
              <div className="hero-actions"><a className="button button-primary" href="#projects">Explore projects</a><a className="button button-outline" href="#contact">Get in touch</a><button className="button button-share" type="button" onClick={async () => { setShareStatus(''); try { if (navigator.share) { await navigator.share({ title: document.title, url: window.location.href }); setShareStatus('Portfolio shared') } else { await navigator.clipboard.writeText(window.location.href); setShareStatus('Portfolio link copied') } } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; setShareStatus('Sharing unavailable') } }}>Share</button></div><span className="inline-status" role="status">{shareStatus}</span>
            </motion.div>
            <div className="hero-aside">
              <div className="hero-aside-bottom"><span>BASED IN {content.location.toUpperCase()}{localTime && <span className="local-time"> · {localTime} LOCAL</span>}</span><span className="signal">● AVAILABLE FOR CONVERSATION</span></div>
            </div>
          </div>
          <div className="container hero-bottom"><a className="hero-scroll-link" href="#about">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a></div>
        </section>} about={<section className="section about-section" id={introEnabled ? 'about-panel' : 'about'} aria-labelledby="about-title">
          <div className="container about-grid"><SectionHeading id="about-title" number="01" eyebrow="ABOUT" title={<><span className="nowrap">Built machines.</span> Now I teach them.</>} description={<>Started in <span className="name-accent">mechanical engineering</span>, ended up in neural networks.</>} /><div className="about-copy">{content.about.map(paragraph => { const [before, after] = paragraph.split('calls me Farzad'); return <p key={paragraph}>{after === undefined ? paragraph : <>{before}calls me <span className="name-accent">Farzad</span>{after}</>}</p> })}</div></div>
        <div className="container about-next"><a className="hero-scroll-link" href="#projects">LET'S HAVE A LOOK AT THE PROJECTS <span aria-hidden="true">↓</span></a></div></section>} />

        <section className="section projects-section" aria-labelledby="projects-title">
          {/* jump target: with the intro joined it sits just past the hand-off, where project 01 is fully revealed */}
          <span className="projects-anchor" id="projects" />
          <div className="container"><SectionHeading id="projects-title" number="02" eyebrow="FEATURED PROJECTS" title="Selected work." description="A closer look at systems, methods, and the boundaries of what each project can claim." /><nav className="project-index" aria-label="Project index">{content.projects.map(project => <a key={project.number} href={`#project-${project.number}`}><span>{project.number}</span>{project.title}</a>)}</nav><ProjectStories enabled={storiesEnabled} fallback={<div className="project-list">{content.projects.map((project, index) => <div key={project.number}><ProjectCard project={project} index={index} /></div>)}</div>} /></div>
        </section>

        <RecordSection stories={storiesEnabled} finale={inStage => <>
          <section className="section cv-section" id={inStage ? undefined : 'cv'} aria-labelledby="cv-title"><div className="container cv-panel"><div><span className="mini-label">CURRICULUM VITAE</span><h2 id="cv-title">A concise record of the work.</h2><p>{content.cv.note}</p></div><a className="button button-primary" href={content.cv.href} download>{content.cv.label}</a></div></section>
          <section className="section contact-section" id={inStage ? undefined : 'contact'} aria-labelledby="contact-title"><div className="container contact-grid"><div><SectionHeading id="contact-title" number="08" eyebrow="CONTACT" title="Let’s make something useful." /><p className="contact-intro">Interested in applied AI, computer vision, or research collaboration? Reach out directly.</p><a className="contact-email" href={content.links.email}>{content.emailAddress}</a><div className="contact-topic"><label htmlFor="contact-topic">Start with a topic</label><select id="contact-topic" value={contactTopic} onChange={event => setContactTopic(event.target.value)}><option>AI collaboration</option><option>Computer vision project</option><option>Research conversation</option><option>Something else</option></select><a href={`${content.links.email}?subject=${encodeURIComponent(contactTopic)}`}>Compose email</a></div><div className="copy-email-row"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(content.emailAddress); setCopyStatus('Email address copied.') } catch { setCopyStatus('Copy unavailable. Use the email link above.') } }}>Copy email address</button><span role="status" aria-live="polite">{copyStatus}</span></div></div><div className="contact-links"><span className="mini-label">FIND ME ELSEWHERE</span><a href={content.links.github} target="_blank" rel="me noopener noreferrer">GitHub</a><a href={content.links.linkedin} target="_blank" rel="me noopener noreferrer">LinkedIn</a><a href={content.links.googleScholar} target="_blank" rel="me noopener noreferrer">Google Scholar</a><a href={content.links.orcid} target="_blank" rel="me noopener noreferrer">ORCID</a><a href="/farzad-jamali.vcf" download>Save contact</a><span className="location">{content.location}</span></div></div></section>
          {inStage && <SiteFooter year={year} />}
        </>} />

      </main>
      <nav className={`section-rail ${scrollProgress > 5 ? 'is-visible' : ''}`} aria-label="Page sections" inert={scrollProgress <= 5}>{navigation.map(([label, href]) => <a key={href} href={href} aria-label={label} aria-current={activeSections.includes(href) ? 'location' : undefined} title={label}><span /></a>)}</nav>
       {searchOpen && <div className="quick-nav-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) closeSearch() }}><div className="quick-nav" role="dialog" aria-modal="true" aria-label="Quick navigation" onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('.quick-nav-results a')); if (!links.length) return; event.preventDefault(); const index = links.indexOf(document.activeElement as HTMLAnchorElement); links[index < 0 ? (event.key === 'ArrowDown' ? 0 : links.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus(); return } if (event.key !== 'Tab') return; const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, button, a')); const first = items[0]; const last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } }}><div className="quick-nav-input"><input autoFocus aria-label="Find a section or project" placeholder="Find a section or project…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.closest('.quick-nav')?.querySelector<HTMLAnchorElement>('.quick-nav-results a')?.click() } }} /><button type="button" onClick={closeSearch} aria-label="Close quick navigation">Esc</button></div><p className="quick-nav-count" role="status">{matchingQuickNavItems.length} {matchingQuickNavItems.length === 1 ? 'result' : 'results'}</p><div className="quick-nav-results">{matchingQuickNavItems.map(item => <a key={item.href} href={item.href} onClick={() => { setSearchOpen(false); setSearchQuery('') }}>{item.label}</a>)}{matchingQuickNavItems.length === 0 && <p className="quick-nav-empty">No matching sections or projects.</p>}</div></div></div>}
      <SiteFooter year={year} />
    </div>
  )
}

export default App
