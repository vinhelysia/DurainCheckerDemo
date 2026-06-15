import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import LanguageSwitch from './LanguageSwitch'

const landingItems = [
  { href: '#problem', key: 'problem' },
  { href: '#solution', key: 'solution' },
  { href: '#demo', key: 'demo' },
  { href: '#impact', key: 'impact' },
]

const primaryNavItems = [
  { href: 'nft.html', key: 'nft' },
  { href: 'slides.html', key: 'slides' },
]

function Header() {
  const { language, copy } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const closeMobileMenu = () => setIsMenuOpen(false)

  return (
    <header className={`site-header ${isMenuOpen ? 'menu-open' : ''}`}>
      <div className="header-shell">
        <a className="brand" href="#top" aria-label="DurianTrust home">
          <span className="brand-mark" aria-hidden="true">
            <img src="durian-logo.svg" alt="" width="46" height="46" />
          </span>
          <span>
            <strong>DurianTrust</strong>
            <small>{language === 'vi' ? 'Sổ cái & Kiểm định Sầu riêng' : 'Secured Supply Chain Ledger'}</small>
          </span>
        </a>

        <nav className="header-nav" aria-label={copy.header.ariaLabel}>
          <div className="nav-cluster">
            <a className="nav-link nav-link-primary" href="#top">
              <span className="nav-link-copy">
                <span>{copy.header.nav.landing}</span>
                <small>{copy.header.nav.landingMeta}</small>
              </span>
              <ChevronDown className="nav-chevron" size={16} aria-hidden="true" />
            </a>

            <div className="landing-menu" aria-label={copy.header.landingMenuAria}>
              {landingItems.map((item, index) => (
                <a key={item.href} href={item.href}>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  <span>{copy.header.nav[item.key]}</span>
                </a>
              ))}
            </div>
          </div>

          {primaryNavItems.map((item) => (
            <a className="nav-link" key={item.href} href={item.href}>
              <span>{copy.header.nav[item.key]}</span>
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <LanguageSwitch />
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={
              isMenuOpen ? copy.header.mobileMenuClose : copy.header.mobileMenuOpen
            }
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label={copy.header.mobileNavAria}
      >
        <a className="mobile-nav-feature" href="#top" onClick={closeMobileMenu}>
          <span>{copy.header.nav.landing}</span>
          <small>{copy.header.nav.landingMeta}</small>
        </a>

        <div className="mobile-nav-section" aria-label={copy.header.landingMenuAria}>
          {landingItems.map((item, index) => (
            <a key={item.href} href={item.href} onClick={closeMobileMenu}>
              <small>{String(index + 1).padStart(2, '0')}</small>
              <span>{copy.header.nav[item.key]}</span>
            </a>
          ))}
        </div>

        <div className="mobile-nav-primary">
          {primaryNavItems.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMobileMenu}>
              <span>{copy.header.nav[item.key]}</span>
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}

export default Header
