import { ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

function ImpactSection() {
  const { copy } = useLanguage()
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 })

  return (
    <section
      className={`section impact-section reveal-on-scroll ${isVisible ? 'revealed' : ''}`}
      id="impact"
      aria-labelledby="impact-title"
      ref={ref}
    >
      <div className="section-shell">
        <div className="section-heading">
          <p className="section-kicker">{copy.impact.kicker}</p>
          <h2 id="impact-title">{copy.impact.title}</h2>
        </div>

        <div className="impact-grid">
          {copy.impact.metrics.map((metric) => (
            <article className="impact-tile" key={metric.value}>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
            </article>
          ))}
        </div>

        <div className="impact-outcomes">
          <h3>{copy.impact.outcomesTitle}</h3>
          <div className="impact-rows">
            {copy.impact.outcomes.map((outcome) => (
              <div className="impact-row" key={outcome.who}>
                <strong>{outcome.who}</strong>
                <p>{outcome.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="impact-cta">
          <h3>{copy.impact.cta.title}</h3>
          <a className="button button-primary" href="#/unit/demo">
            <span>{copy.impact.cta.button}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default ImpactSection
