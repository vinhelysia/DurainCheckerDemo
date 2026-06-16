import { ShieldAlert, ThermometerSnowflake, FileWarning, Clock } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

const iconMap = {
  shield: ShieldAlert,
  temp: ThermometerSnowflake,
  file: FileWarning,
  clock: Clock
}

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

        <div className="problem-points" aria-label={copy.problem.pointsAriaLabel}>
          {copy.problem.points.map((point, index) => {
            const IconComponent = iconMap[point.icon] || ShieldAlert
            return (
              <div className="problem-point" key={index}>
                <IconComponent size={24} aria-hidden="true" />
                <span>
                  <strong>{point.title}</strong>
                  <small>{point.desc}</small>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ProblemSection
