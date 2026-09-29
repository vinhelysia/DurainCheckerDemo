import { ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export default function ImpactSection() {
  const { copy } = useLanguage()
  return (
    <section className="section impact-section compact-intro" id="impact" aria-labelledby="impact-title">
      <div className="section-shell">
        <div className="section-heading"><h2 id="impact-title">{copy.impact.title}</h2><p>{copy.impact.lead}</p></div>
        <div className="service-grid">{copy.impact.outcomes.map((outcome) => <article className="service-card" key={outcome.who}><h3>{outcome.who}</h3><p>{outcome.text}</p></article>)}</div>
        <div className="service-actions"><a className="button button-primary" href="#/manage/cloud">{copy.impact.cta.button}<ArrowRight size={18} aria-hidden="true" /></a></div>
        <details className="technical-details"><summary>{copy.impact.detailsTitle}</summary><p>{copy.impact.detailsBody}</p></details>
      </div>
    </section>
  )
}
