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
      </div>
    </section>
  )
}

export default ImpactSection
