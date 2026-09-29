import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export default function UnitDetails({ unitType }) {
  const { copy } = useLanguage()
  const type = ['farm', 'transport', 'testing', 'export'].includes(unitType) ? unitType : 'farm'
  const content = copy.unitDetails.overview[type]
  return (
    <section className={`section compact-intro ${type}-theme`} aria-labelledby="unit-title">
      <div className="section-shell">
        <a href="#/" className="back-link"><ArrowLeft size={16} aria-hidden="true" />{copy.units.backToHome}</a>
        <div className="intro-overview">
          <div className="section-heading"><h1 id="unit-title">{copy.units[`${type}Title`]}</h1><p>{copy.units[`${type}Subtitle`]}</p></div>
          <figure className="intro-photo"><img src={`${import.meta.env.BASE_URL}images/${{ farm: 'orchard', transport: 'reefer', testing: 'lab', export: 'port' }[type]}.webp`} alt={copy.units.photoAlts[type]} width={480} height={320} /><figcaption>{copy.problem.photoCaption}</figcaption></figure>
        </div>
        <h2>{copy.unitDetails.recordTitle}</h2>
        <ul className="unit-record-list">{content.records.map((record) => <li key={record}>{record}</li>)}</ul>
        <div className="service-actions"><a className="button button-primary" href="#/manage/cloud">{copy.solution.action}<ArrowRight size={18} aria-hidden="true" /></a></div>
        <details className="technical-details"><summary>{copy.unitDetails.limitationsTitle}</summary><p>{content.limitations}</p><p>{copy.solution.technologyBody}</p></details>
      </div>
    </section>
  )
}
