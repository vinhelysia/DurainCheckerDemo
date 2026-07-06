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
      <div className="section-shell">
        <div className="section-heading">
          <p className="section-kicker">{copy.problem.kicker}</p>
          <h2 id="problem-title">
            {copy.problem.title}
          </h2>
        </div>

        <div className="problem-copy">
          <p>{copy.problem.body1}</p>
          <p>{copy.problem.body2}</p>
        </div>

        <div className="impact-grid problem-figures">
          {copy.problem.figures.map((figure) => (
            <article className="impact-tile" key={figure.value}>
              <strong>{figure.value}</strong>
              <p>{figure.label}</p>
            </article>
          ))}
        </div>

        <div className="problem-points" aria-label={copy.problem.pointsAriaLabel}>
          {copy.problem.points.map((point, index) => {
            const IconComponent = iconMap[point.icon] || ShieldAlert
            return (
              <div className="problem-point" key={index}>
                <span className="point-icon" aria-hidden="true">
                  <IconComponent size={22} />
                </span>
                <span>
                  <strong>{point.title}</strong>
                  <small>{point.desc}</small>
                </span>
              </div>
            )
          })}
        </div>

        <p className="disclaimer">
          {copy.problem.disclaimer}
        </p>
      </div>
    </section>
  )
}

export default ProblemSection
