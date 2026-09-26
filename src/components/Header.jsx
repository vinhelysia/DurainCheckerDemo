import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import LanguageSwitch from './LanguageSwitch'

const pages = [
  { key: 'problem', href: '#/intro/problem' },
  { key: 'solution', href: '#/intro/solution' },
  { key: 'impact', href: '#/intro/impact' },
  { key: 'farm', href: '#/unit/farm' },
  { key: 'testing', href: '#/unit/testing' },
  { key: 'transport', href: '#/unit/transport' },
  { key: 'export', href: '#/unit/export' },
]

function Header() {
  const { language, copy } = useLanguage()
  const [path, setPath] = useState(window.location.hash || '#/')
  const [menuOpen, setMenuOpen] = useState(false)
  const moreRef = useRef(null)

  useEffect(() => {
    const onNavigate = () => {
      setPath(window.location.hash || '#/')
      setMenuOpen(false)
      if (moreRef.current) moreRef.current.open = false
    }
    window.addEventListener('hashchange', onNavigate)
    return () => window.removeEventListener('hashchange', onNavigate)
  }, [])

  const nav = copy.header.nav
  const primary = [
    { href: '#/', label: nav.home, active: path === '#/' || path === '#/home' },
    { href: '#/unit/demo', label: nav.demo, active: path.startsWith('#/unit/demo') },
    { href: '#/manage', label: nav.manage, active: path.startsWith('#/manage') },
  ]

  return (
    <header className="site-header">
      <div className="header-shell">
        <a className="brand" href="#/" aria-label="DurianTrust home">
          <span className="brand-mark" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}durian-logo.svg`} alt="" width="36" height="36" />
          </span>
          <strong>DurianTrust</strong>
        </a>

        <nav className={`header-nav ${menuOpen ? 'is-open' : ''}`} aria-label={copy.header.ariaLabel}>
          {primary.map((item) => (
            <a
              key={item.href}
              className={`nav-link ${item.active ? 'active' : ''}`}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => { setMenuOpen(false); if (moreRef.current) moreRef.current.open = false }}
            >
              {item.label}
            </a>
          ))}
          <details className="nav-more" ref={moreRef}>
            <summary className="nav-link">
              {language === 'vi' ? 'Tìm hiểu thêm' : 'Explore'}
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="nav-more-panel">
              <p>{language === 'vi' ? 'Giới thiệu dự án' : 'About the project'}</p>
              {pages.slice(0, 3).map((item) => (
                <a key={item.href} href={item.href} onClick={(event) => { event.currentTarget.closest('details').open = false; setMenuOpen(false) }}>
                  {nav[item.key]}
                </a>
              ))}
              <p>{nav.units}</p>
              {pages.slice(3).map((item) => (
                <a key={item.href} href={item.href} onClick={(event) => { event.currentTarget.closest('details').open = false; setMenuOpen(false) }}>
                  {nav[item.key]}
                </a>
              ))}
            </div>
          </details>
        </nav>

        <div className="header-actions">
          <LanguageSwitch />
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={menuOpen ? copy.header.mobileMenuClose : copy.header.mobileMenuOpen}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
