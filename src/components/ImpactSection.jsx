import { ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

const base = import.meta.env.BASE_URL

function asset(file) {
  return `${base}images/${file}`
}

function ImpactSection() {
  const { copy } = useLanguage()
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 })
  const photos = copy.impact.photos || []

  return (
    <section
      className={`section impact-section reveal-on-scroll ${isVisible ? 'revealed' : ''}`}
      id="impact"
      aria-labelledby="impact-title"
      ref={ref}
    >
      <div className="section-shell">
        <div className="section-heading">
          {copy.impact.kicker ? (
            <p className="section-kicker">{copy.impact.kicker}</p>
          ) : null}
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

        {photos.length > 0 ? (
          <div className="impact-photo-row" aria-hidden={false}>
            {photos.map((photo) => {
              const webp = photo.src
              const jpg = webp.replace(/\.webp$/i, '.jpg')
              return (
                <figure className="impact-photo" key={webp}>
                  <picture>
                    <source srcSet={asset(webp)} type="image/webp" />
                    <img
                      src={asset(jpg)}
                      alt={photo.alt}
                      width={720}
                      height={480}
                      loading="lazy"
                    />
                  </picture>
                  <figcaption>{photo.alt}</figcaption>
                </figure>
              )
            })}
          </div>
        ) : null}

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
