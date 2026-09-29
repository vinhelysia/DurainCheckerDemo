import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export default function ProblemSection() {
  const { copy } = useLanguage()
  return (
    <section className="section problem-section compact-intro" id="problem" aria-labelledby="problem-title">
      <div className="section-shell">
        <div className="intro-overview">
          <div className="section-heading"><h2 id="problem-title">{copy.problem.title}</h2><p>{copy.problem.body2}</p></div>
          <figure className="intro-photo"><img src={`${import.meta.env.BASE_URL}images/${copy.problem.photo}`} alt={copy.problem.photoCaption} width={480} height={320} /><figcaption>{copy.problem.photoCaption}</figcaption></figure>
        </div>
        <div className="service-grid" aria-label={copy.problem.pointsAriaLabel}>
          {copy.problem.points.map((point) => <article className="service-card" key={point.title}><h3>{point.title}</h3><p>{point.desc}</p></article>)}
        </div>
        <div className="service-actions"><a className="button button-primary" href="#/intro/solution">{copy.problem.bridgeButton}<ArrowRight size={18} aria-hidden="true" /></a></div>
        <details className="technical-details">
          <summary>{copy.problem.newsTitle}</summary><p>{copy.problem.body1}</p>
          <div className="impact-grid problem-figures">{copy.problem.figures.map((figure) => <article className="impact-tile" key={figure.value}><strong>{figure.value}</strong><p>{figure.label}</p></article>)}</div>
          <div className="news-grid" aria-label={copy.problem.newsAria}>{copy.problem.news.map((item) => <a className="news-card" key={item.href} href={item.href} target="_blank" rel="noreferrer"><span className="news-source">{item.source}</span><span className="news-title">{item.title}</span><ArrowUpRight size={16} aria-hidden="true" /></a>)}</div>
        </details>
        <p className="disclaimer">{copy.problem.disclaimer}</p>
      </div>
    </section>
  )
}
