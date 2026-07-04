import { useLanguage } from './LanguageContext'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

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
          <p className="section-kicker">{copy.solution.kicker}</p>
          <h2 id="solution-title">
            {copy.solution.title}
          </h2>
        </div>

        <div className="pillar-grid">
          {copy.solution.pillars.map((pillar) => (
            <article className="pillar-card" key={pillar.title}>
              <h3>{pillar.title}</h3>
              <p className="pillar-subtitle">{pillar.subtitle}</p>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SolutionPillars
