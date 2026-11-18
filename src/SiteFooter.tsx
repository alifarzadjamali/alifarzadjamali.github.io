import { content } from './content'

export function SiteFooter({ year = '' }: { year?: string }) {
  return <footer className="site-footer"><div className="container footer-inner"><span>© {year} {content.name}</span><span className="footer-profiles">{([['GitHub', content.links.github], ['LinkedIn', content.links.linkedin], ['Google Scholar', content.links.googleScholar], ['ORCID', content.links.orcid]] as const).map(([label, href]) => <a key={label} href={href} target="_blank" rel="me noopener noreferrer">{label}</a>)}</span><a href="/#top">Back to top ↑</a></div></footer>
}
