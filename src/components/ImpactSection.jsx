import { useLanguage } from './LanguageContext'

function ImpactSection() {
  const { copy } = useLanguage()

  return (
    <section className="section impact-section" id="impact" aria-labelledby="impact-title">
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
