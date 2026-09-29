import { ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export default function SolutionPillars() {
  const { copy } = useLanguage()
  return (
    <section className="section solution-section compact-intro" id="solution" aria-labelledby="solution-title">
      <div className="section-shell">
        <div className="section-heading"><h2 id="solution-title">{copy.solution.title}</h2></div>
        <div className="intro-overview">
          <div><p>{copy.solution.lead}</p><div className="service-actions"><a className="button button-primary" href="#/manage/cloud">{copy.solution.action}<ArrowRight size={18} aria-hidden="true" /></a></div></div>
          <figure className="intro-photo"><img src={`${import.meta.env.BASE_URL}images/port.webp`} alt={copy.units.photoAlts.export} width={480} height={320} /><figcaption>{copy.problem.photoCaption}</figcaption></figure>
        </div>
        <div className="service-grid">
          {copy.solution.pillars.map((pillar, index) => (
            <article className="service-card" key={pillar.title}>
              <span className="service-step" aria-hidden="true">0{index + 1}</span>
              <h3>{pillar.title}</h3><p>{pillar.subtitle}</p>
              <details className="technical-details"><summary>{copy.solution.detailsLabel}</summary><p>{pillar.body}</p></details>
            </article>
          ))}
        </div>
        <details className="technical-details"><summary>{copy.solution.technologyTitle}</summary><p>{copy.solution.technologyBody}</p></details>
      </div>
    </section>
  )
}
