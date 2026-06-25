import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import Lenis from 'lenis'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import ImpactSection from './components/ImpactSection'
import ProblemSection from './components/ProblemSection'
import SolutionPillars from './components/SolutionPillars'
import { useLanguage } from './components/LanguageContext'
import Preloader from './components/Preloader'
import 'lenis/dist/lenis.css'

const DemoSection = lazy(() => import('./components/DemoSection'))
const UnitDetails = lazy(() => import('./components/UnitDetails'))
const ManagementPortal = lazy(() => import('./components/ManagementPortal'))

function App() {
  const { language, copy } = useLanguage()
  const [preloaderComplete, setPreloaderComplete] = useState(() => {
    return sessionStorage.getItem('duriantrust-preloader-seen') === 'true'
  })

  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash || '#/'
  })

  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential easing
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    })

    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || '#/'
      
      // Redirect legacy anchor hashes to clean routed views
      if (newHash === '#problem') {
        window.location.hash = '#/intro/problem'
        return
      }
      if (newHash === '#solution') {
        window.location.hash = '#/intro/solution'
        return
      }
      if (newHash === '#demo') {
        window.location.hash = '#/unit/demo'
        return
      }
      if (newHash === '#impact') {
        window.location.hash = '#/intro/impact'
        return
      }

      setCurrentRoute(newHash)
      
      // Reset scroll position immediately
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true })
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    
    // Trigger scroll sync on mount
    handleHashChange()

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const renderRouteView = () => {
    const routePath = currentRoute.split('?')[0]
    switch (routePath) {
      case '#/':
      case '#/home':
        return <Hero />
      case '#/intro/problem':
        return <ProblemSection />
      case '#/intro/solution':
        return <SolutionPillars />
      case '#/intro/impact':
        return <ImpactSection />
      case '#/unit/farm':
        return <UnitDetails unitType="farm" />
      case '#/unit/transport':
        return <UnitDetails unitType="transport" />
      case '#/unit/testing':
        return <UnitDetails unitType="testing" />
      case '#/unit/export':
        return <UnitDetails unitType="export" />
      case '#/unit/demo':
        return <DemoSection />
      case '#/manage':
        return <ManagementPortal />
      default:
        return <Hero />
    }
  }

  return (
    <div className={`app ${preloaderComplete ? 'preloader-done' : 'preloader-active'}`}>
      <Preloader onComplete={() => setPreloaderComplete(true)} />
      <a className="skip-link" href="#main">
        {copy.skipLink}
      </a>
      <div className="main-content-wrapper" aria-hidden={!preloaderComplete}>
        <Header />
        <main id="main">
          <Suspense fallback={
            <div className="route-loading" role="status" aria-live="polite">
              <div className="spinner"></div>
              <span>{language === 'vi' ? 'Đang tải...' : 'Loading...'}</span>
            </div>
          }>
            {renderRouteView()}
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default App
