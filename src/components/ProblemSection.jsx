import { AlertTriangle, Search } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

function ProblemSection() {
  const { copy } = useLanguage()
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 })

  return (
    <section
      className={`section problem-section reveal-on-scroll ${isVisible ? 'revealed' : ''}`}
      id="problem"
      aria-labelledby="problem-title"
      ref={ref}
    >
      <div className="section-shell problem-grid">
        <div>
          <p className="section-kicker">{copy.problem.kicker}</p>
          <h2 id="problem-title">
            {copy.problem.title}
          </h2>
        </div>

        <div className="problem-copy">
          <p>
            {copy.problem.body1}
          </p>
          <p className="disclaimer">
            {copy.problem.disclaimer}
          </p>
        </div>

        <div className="problem-points" aria-label={copy.problem.points.ariaLabel}>
          <div className="problem-point">
            <AlertTriangle size={24} aria-hidden="true" />
            <span>
              <strong>{copy.problem.points.riskTitle}</strong>
              <small>{copy.problem.points.riskDesc}</small>
            </span>
          </div>
          <div className="problem-point">
            <Search size={24} aria-hidden="true" />
            <span>
              <strong>{copy.problem.points.recordsTitle}</strong>
              <small>{copy.problem.points.recordsDesc}</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProblemSection
