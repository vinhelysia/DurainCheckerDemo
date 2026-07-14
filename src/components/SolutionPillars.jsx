import { useLanguage } from './LanguageContext'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

const base = import.meta.env.BASE_URL

function asset(file) {
  return `${base}images/${file}`
}

function SolutionPillars() {
  const { copy } = useLanguage()
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 })

  return (
    <section
      className={`section reveal-on-scroll ${isVisible ? 'revealed' : ''}`}
      id="solution"
      aria-labelledby="solution-title"
      ref={ref}
    >
      <div className="section-shell">
        <div className="section-heading">
          {copy.solution.kicker ? (
            <p className="section-kicker">{copy.solution.kicker}</p>
          ) : null}
          <h2 id="solution-title">
            {copy.solution.title}
          </h2>
        </div>

        <div className="pillar-grid">
          {copy.solution.pillars.map((pillar) => {
            const webp = pillar.image
            const jpg = webp ? webp.replace(/\.webp$/i, '.jpg') : null
            return (
              <article className="pillar-card pillar-card-with-media" key={pillar.title}>
                {webp ? (
                  <div className="pillar-media">
                    <picture>
                      <source srcSet={asset(webp)} type="image/webp" />
                      <img
                        src={asset(jpg)}
                        alt=""
                        width={480}
                        height={320}
                        loading="lazy"
                      />
                    </picture>
                  </div>
                ) : null}
                <div className="pillar-body">
                  <h3>{pillar.title}</h3>
                  <p className="pillar-subtitle">{pillar.subtitle}</p>
                  <p>{pillar.body}</p>
                  {pillar.tags && (
                    <p className="pillar-tags">
                      {pillar.tags.map((tag) => (
                        <span className="pillar-tag" key={tag}>{tag}</span>
                      ))}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default SolutionPillars
