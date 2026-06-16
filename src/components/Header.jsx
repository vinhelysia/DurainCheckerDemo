import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import LanguageSwitch from './LanguageSwitch'

const introItems = [
  { href: '#/intro/problem', key: 'problem' },
  { href: '#/intro/solution', key: 'solution' },
  { href: '#/intro/impact', key: 'impact' },
]

const unitItems = [
  { href: '#/unit/farm', key: 'farm' },
  { href: '#/unit/transport', key: 'transport' },
  { href: '#/unit/testing', key: 'testing' },
  { href: '#/unit/export', key: 'export' },
  { href: '#/unit/demo', key: 'demo' },
  { href: '#/manage', key: 'manage' },
  { href: 'nft.html', key: 'nft' },
]

function Header() {
  const { language, copy } = useLanguage()
  const getHref = (item) => {
    if (item.key === 'nft') {
      return `${import.meta.env.BASE_URL}nft.html`
    }
    return item.href
  }
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDrawer, setActiveDrawer] = useState(null) // 'intro' | 'units' | null
  const [slideKey, setSlideKey] = useState(0) // bumped every time we switch drawers to retrigger slide-in
  const [slideDirection, setSlideDirection] = useState('right')
  const prevDrawerRef = useRef(null)
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.hash || '#/'
  })
  const [pillStyle, setPillStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  })

  const prevFocusRef = useRef(null)
  const drawerCloseRef = useRef(null)

  useEffect(() => {
    if (activeDrawer) {
      prevFocusRef.current = document.activeElement
      const timer = setTimeout(() => {
        if (drawerCloseRef.current) {
          drawerCloseRef.current.focus({ preventScroll: true })
        }
      }, 50)
      return () => clearTimeout(timer)
    } else {
      if (prevFocusRef.current) {
        prevFocusRef.current.focus({ preventScroll: true })
        prevFocusRef.current = null
      }
    }
  }, [activeDrawer])

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleMouseEnter = (e) => {
    const target = e.currentTarget
    setPillStyle({
      left: target.offsetLeft,
      width: target.offsetWidth,
      opacity: 1,
    })
  }

  const handleMouseLeave = () => {
    setPillStyle((prev) => ({
      ...prev,
      opacity: 0,
    }))
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        setActiveDrawer(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  useEffect(() => {
    if (activeDrawer === null) {
      prevDrawerRef.current = null
    }
  }, [activeDrawer])

  useEffect(() => {
    if (activeDrawer || isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [activeDrawer, isMenuOpen])

  const closeMobileMenu = () => setIsMenuOpen(false)

  const isHomeActive = currentPath === '#/' || currentPath === '#/home'
  const isIntroActive = currentPath.startsWith('#/intro')
  const isUnitActive = currentPath.startsWith('#/unit')

  return (
    <header className={`site-header ${isMenuOpen ? 'menu-open' : ''}`}>
      <div className="header-shell">
        <a className="brand" href="#/" aria-label="DurianTrust home">
          <span className="brand-mark" aria-hidden="true">
            <img src="durian-logo.svg" alt="" width="32" height="32" />
          </span>
          <span className="brand-text">
            <strong>DurianTrust</strong>
          </span>
        </a>

        <nav
          className="header-nav"
          aria-label={copy.header.ariaLabel}
          onMouseLeave={handleMouseLeave}
        >
          {/* Sliding Hover Pill */}
          <div
            className="nav-hover-pill"
            style={{
              left: `${pillStyle.left}px`,
              width: `${pillStyle.width}px`,
              opacity: pillStyle.opacity,
            }}
            aria-hidden="true"
          />

          {/* Trang chủ link */}
          <a
            className={`nav-link ${isHomeActive ? 'active' : ''}`}
            href="#/"
            onMouseEnter={handleMouseEnter}
          >
            <span>{copy.header.nav.home}</span>
          </a>

          {/* Giới thiệu trigger */}
          <button
            type="button"
            className={`nav-link ${isIntroActive || activeDrawer === 'intro' ? 'active-red' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              setActiveDrawer((prev) => {
                const next = prev === 'intro' ? null : 'intro'
                if (next && prev !== next) {
                  prevDrawerRef.current = prev
                  setSlideKey((k) => k + 1)
                  setSlideDirection(prev === 'units' ? 'left' : 'right')
                }
                return next
              })
            }}
            onMouseEnter={handleMouseEnter}
          >
            {(isIntroActive || activeDrawer === 'intro') && <span className="nav-active-badge" aria-hidden="true" />}
            <span>{copy.header.nav.intro}</span>
            <ChevronDown className="nav-chevron" size={16} aria-hidden="true" />
          </button>

          {/* Các đơn vị trigger */}
          <button
            type="button"
            className={`nav-link ${isUnitActive || activeDrawer === 'units' ? 'active-red' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              setActiveDrawer((prev) => {
                const next = prev === 'units' ? null : 'units'
                if (next && prev !== next) {
                  prevDrawerRef.current = prev
                  setSlideKey((k) => k + 1)
                  setSlideDirection(prev === 'intro' ? 'right' : 'right')
                }
                return next
              })
            }}
            onMouseEnter={handleMouseEnter}
          >
            {(isUnitActive || activeDrawer === 'units') && <span className="nav-active-badge" aria-hidden="true" />}
            <span>{copy.header.nav.units}</span>
            <ChevronDown className="nav-chevron" size={16} aria-hidden="true" />
          </button>
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

      {/* Drawer Overlay */}
      {activeDrawer && (
        <div
          className="drawer-overlay"
          onClick={() => setActiveDrawer(null)}
          aria-hidden="true"
        />
      )}

      {/* Side Drawer */}
      <div className={`side-drawer ${activeDrawer ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <h2>
            {activeDrawer === 'intro' ? copy.header.nav.intro : copy.header.nav.units}
          </h2>
          <button
            ref={drawerCloseRef}
            type="button"
            className="drawer-close-btn"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Keyed so React remounts (and slide-in fires) on every drawer switch */}
        <div 
          key={`${activeDrawer}-${slideKey}`} 
          className={`drawer-content ${prevDrawerRef.current ? `drawer-slide-in-${slideDirection}` : ''}`}
          data-lenis-prevent
        >
          {activeDrawer === 'intro' && (
            <div className="drawer-section-list">
              {introItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="drawer-item-link"
                  onClick={() => setActiveDrawer(null)}
                >
                  <div className="drawer-item-info">
                    <strong>{copy.header.nav[item.key]}</strong>
                    <span className="drawer-item-desc">
                      {item.key === 'problem' && (language === 'vi' ? 'Phân tích thách thức, kiểm soát Cadimi & Auramine O' : 'Analysis of cadmium & dye challenges')}
                      {item.key === 'solution' && (language === 'vi' ? 'Hợp đồng thông minh & Bộ quy tắc kiểm định' : 'Smart contracts & Rule-Based validation model')}
                      {item.key === 'impact' && (language === 'vi' ? 'Niềm tin thị trường & thông quan nhanh' : 'Market trust & fast custom clearance')}
                      {item.key === 'slides' && (language === 'vi' ? 'Tài liệu thuyết trình chiến lược kinh doanh' : 'Strategic business deck presentation')}
                    </span>
                  </div>
                  <ChevronRight className="drawer-item-chevron" size={18} />
                </a>
              ))}
            </div>
          )}

          {activeDrawer === 'units' && (
            <div className="drawer-section-list">
              {unitItems.map((item) => (
                <a
                  key={item.key}
                  href={getHref(item)}
                  className="drawer-item-link"
                  onClick={() => setActiveDrawer(null)}
                >
                  <div className="drawer-item-info">
                    <strong>{copy.header.nav[item.key]}</strong>
                    <span className="drawer-item-desc">
                      {item.key === 'farm' && (language === 'vi' ? 'Nhật ký IoT đất trồng, tưới tiêu & bón phân' : 'IoT soil logs, irrigation & harvests')}
                      {item.key === 'transport' && (language === 'vi' ? 'Theo dõi xe lạnh, cảm biến nhiệt độ & GPS' : 'Cold chain telemetry, sensors & tracks')}
                      {item.key === 'testing' && (language === 'vi' ? 'Dữ liệu phân tích hóa chất & sàng lọc Cadimi' : 'Chemical assays & cadmium screening')}
                      {item.key === 'export' && (language === 'vi' ? 'Tờ khai hải quan & chứng thư số NFT' : 'Customs declarations & NFT certificates')}
                      {item.key === 'demo' && (language === 'vi' ? 'Tra cứu blockchain theo mã lô hàng' : 'Blockchain lookup by batch identifier')}
                      {item.key === 'manage' && (language === 'vi' ? 'Đăng ký lô hàng & ghi nhật ký kiểm định theo Bộ quy tắc' : 'Register batches & log rule-based quality audits')}
                      {item.key === 'nft' && (language === 'vi' ? 'Kiểm chứng chữ ký mã hóa Web3' : 'Verify Web3 cryptographic signature')}
                    </span>
                  </div>
                  <ChevronRight className="drawer-item-chevron" size={18} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label={copy.header.mobileNavAria}
      >
        <a className="mobile-nav-feature" href="#/" onClick={closeMobileMenu}>
          <span>{copy.header.nav.home}</span>
        </a>

        <div className="mobile-nav-header">{copy.header.nav.intro}</div>
        <div className="mobile-nav-section" aria-label={copy.header.landingMenuAria}>
          {introItems.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMobileMenu}>
              <span>{copy.header.nav[item.key]}</span>
            </a>
          ))}
        </div>

        <div className="mobile-nav-header">{copy.header.nav.units}</div>
        <div className="mobile-nav-section" aria-label={copy.header.landingMenuAria}>
          {unitItems.map((item) => (
            <a key={item.key} href={getHref(item)} onClick={closeMobileMenu}>
              <span>{copy.header.nav[item.key]}</span>
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}

export default Header
