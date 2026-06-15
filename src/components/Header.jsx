import { useLanguage } from './LanguageContext'
import LanguageSwitch from './LanguageSwitch'

const navItems = [
  { href: '#problem', key: 'problem' },
  { href: '#solution', key: 'solution' },
  { href: '#demo', key: 'demo' },
  { href: '#impact', key: 'impact' },
  { href: 'nft.html', key: 'nft' },
  { href: 'slides.html', key: 'slides' },
]

function Header() {
  const { language, copy } = useLanguage()

  return (
    <header className="site-header">
      <div className="header-shell">
        <a className="brand" href="#top" aria-label="DurianTrust home">
          <span className="brand-mark" aria-hidden="true">
            <img src="/durian-logo.svg" alt="" width="46" height="46" />
          </span>
          <span>
            <strong>DurianTrust</strong>
            <small>{language === 'vi' ? 'Sổ cái & Kiểm định Sầu riêng' : 'Secured Supply Chain Ledger'}</small>
          </span>
        </a>

        <nav className="header-nav" aria-label={copy.header.ariaLabel}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              <span>{copy.header.nav[item.key]}</span>
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}

export default Header
