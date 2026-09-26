import { useEffect, useState, useRef, useMemo, lazy, Suspense } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import Lenis from 'lenis'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import ImpactSection from './components/ImpactSection'
import ProblemSection from './components/ProblemSection'
import SolutionPillars from './components/SolutionPillars'
import { useLanguage } from './components/LanguageContext'
import 'lenis/dist/lenis.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const DemoSection = lazy(() => import('./components/DemoSection'))
const UnitDetails = lazy(() => import('./components/UnitDetails'))
const ManagementPortal = lazy(() => import('./components/ManagementPortal'))
const CloudPortal = lazy(() => import('./components/CloudPortal'))

function App() {
  const { language, copy } = useLanguage()

  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash || '#/'
  })

  // Mount once for the whole app so #/manage remounts do not re-fire autoConnect.
  const endpoint = useMemo(() => import.meta.env.VITE_RPC_URL || clusterApiUrl('devnet'), [])
  // Phantom (and other Wallet Standard wallets) auto-register; no adapters needed.
  const wallets = useMemo(() => [], [])

  const lenisRef = useRef(null)

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      lenisRef.current = null
      return
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    })

    lenisRef.current = lenis

    let rafId = 0
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
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
      case '#/manage/cloud':
        return <CloudPortal />
      case '#/cloud':
        return <CloudPortal publicId={new URLSearchParams(currentRoute.split('?')[1]).get('batchId') || ''} publicView />
      default:
        return <Hero />
    }
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app">
            <a className="skip-link" href="#main">
              {copy.skipLink}
            </a>
            <div className="main-content-wrapper">
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
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App
