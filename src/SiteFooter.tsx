import { content } from './content'

export function SiteFooter({ year = '', top = '/#top' }: { year?: string; top?: string }) {
  return <footer className="site-footer"><div className="container footer-inner"><span>© {year} {content.name}</span><a href={top}>Back to top</a></div></footer>
}
