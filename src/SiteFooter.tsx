import { content } from './content'
import { RIG_PATH, enterRig } from './rig/egg'

export function SiteFooter({ year = '', top = '/#top' }: { year?: string; top?: string }) {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        {/* the blinking block is an easter egg: it boots the hidden /rig/ page */}
        <span>© {year} {content.name}<a className="footer-cursor" href={RIG_PATH} aria-label="Enter the rig" title="" onClick={enterRig} /></span>
        <a href={top}>Back to top</a>
      </div>
    </footer>
  )
}
