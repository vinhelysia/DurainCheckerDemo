import { useEffect } from 'react'
import DemoSection from './components/DemoSection'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import ImpactSection from './components/ImpactSection'
import ProblemSection from './components/ProblemSection'
import SolutionPillars from './components/SolutionPillars'
import { useLanguage } from './components/LanguageContext'
import './App.css'

function App() {
  const { copy } = useLanguage()

  useEffect(() => {
    function smoothScrollTo(element, duration = 600) {
      const headerOffset = 90 // Height of sticky header + breathing room
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      const startPosition = window.pageYOffset
      const distance = offsetPosition - startPosition
      let startTime = null

      function animation(currentTime) {
        if (startTime === null) startTime = currentTime
        const timeElapsed = currentTime - startTime
        const run = ease(timeElapsed, startPosition, distance, duration)
        window.scrollTo(0, run)
        if (timeElapsed < duration) {
          requestAnimationFrame(animation)
        }
      }

      // Cubic easing out
      function ease(t, b, c, d) {
        t /= d
        t--
        return c * (t * t * t + 1) + b
      }

      requestAnimationFrame(animation)
    }

    function handleAnchorClick(e) {
      const clickTarget = e.target.closest('a')
      if (clickTarget) {
        const href = clickTarget.getAttribute('href')
        if (href && href.startsWith('#') && href !== '#') {
          const targetId = href.substring(1)
          const element = document.getElementById(targetId)
          if (element) {
            e.preventDefault()
            smoothScrollTo(element)
            // Update URL hash without jumping
            window.history.pushState(null, '', href)
          }
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {copy.skipLink}
      </a>
      <Header />
      <main id="main">
        <Hero />
        <ProblemSection />
        <SolutionPillars />
        <DemoSection />
        <ImpactSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
