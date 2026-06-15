import { useEffect, useState, useRef } from 'react'
import { useLanguage } from './LanguageContext'

function Preloader({ onComplete }) {
  const { copy } = useLanguage()
  const [progress, setProgress] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [shouldRender, setShouldRender] = useState(() => {
    return sessionStorage.getItem('duriantrust-preloader-seen') !== 'true'
  })
  const progressRef = useRef(null)

  useEffect(() => {
    if (!shouldRender) {
      const t = setTimeout(() => {
        onComplete()
      }, 0)
      return () => clearTimeout(t)
    }

    const duration = 500 // Total count-up duration in ms
    const startTime = performance.now()

    function animateProgress(now) {
      const elapsed = now - startTime
      const percent = Math.min((elapsed / duration) * 100, 100)
      setProgress(Math.round(percent))

      if (percent < 100) {
        requestAnimationFrame(animateProgress)
      } else {
        // Mark as completed, start fade out
        setTimeout(() => {
          setIsFading(true)
          sessionStorage.setItem('duriantrust-preloader-seen', 'true')
          
          // Complete and clean up after CSS transition ends (300ms)
          setTimeout(() => {
            onComplete()
            setShouldRender(false)
            
            // Shift focus to the skip link or main heading for keyboard accessibility
            const skipLink = document.querySelector('.skip-link')
            if (skipLink) {
              skipLink.focus()
            }
          }, 300)
        }, 150)
      }
    }

    requestAnimationFrame(animateProgress)
  }, [onComplete, shouldRender])

  if (!shouldRender) return null

  return (
    <div
      className={`preloader-overlay ${isFading ? 'preloader-fade-out' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={progress < 100}
      aria-label={copy?.hero?.eyebrow || 'Loading DurianTrust...'}
    >
      <div className="preloader-content">
        <div className="preloader-logo-wrapper">
          <img
            src="durian-logo.svg"
            alt=""
            className="preloader-logo"
            width="80"
            height="80"
          />
          <div className="preloader-spinner-ring" />
        </div>
        <div className="preloader-progress-text" ref={progressRef}>
          {progress}%
        </div>
        <div className="preloader-track">
          <div
            className="preloader-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default Preloader
