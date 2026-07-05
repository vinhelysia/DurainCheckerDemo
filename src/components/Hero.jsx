import { ArrowRight, CheckCircle2, FileCheck2 } from 'lucide-react'
import { useLanguage } from './LanguageContext'

const base = import.meta.env.BASE_URL
const journeyPhotos = [
  `${base}images/orchard.jpg`,
  `${base}images/lab.jpg`,
  `${base}images/port.jpg`,
]

function Hero() {
  const { copy } = useLanguage()
  const landing = copy.landing

  return (
    <>
      <section className="hero-section" id="top" aria-labelledby="hero-title">
        <div className="section-shell hero-shell">
          <div className="hero-copy">
            <p className="eyebrow">{copy.hero.eyebrow}</p>
            <h1 id="hero-title">{copy.hero.title}</h1>
            <p className="hero-lead">{copy.hero.lead}</p>
            <div className="hero-actions" aria-label={copy.hero.ariaLabelActions}>
              <a className="button button-primary" href="#/unit/demo">
                <span>{copy.hero.ctaDemo}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button button-secondary" href="#/intro/problem">
                {copy.hero.ctaProblem}
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <img
              className="hero-photo"
              src={`${base}images/hero-durian.jpg`}
              alt={copy.hero.photoAlt}
              fetchPriority="high"
            />
            <div className="hero-ledger-note" aria-label={copy.hero.ariaLabelLedger}>
              <div className="proof-icon" aria-hidden="true">
                <FileCheck2 size={22} />
              </div>
              <div className="proof-copy">
                <small>{copy.hero.batchProof}</small>
                <strong>DRN-2026-LD-0428</strong>
                <span>{copy.hero.ledgerEvents}</span>
              </div>
              <div className="proof-status">
                <CheckCircle2 size={18} aria-hidden="true" />
                {copy.hero.verified}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-journey" aria-labelledby="journey-title">
        <div className="section-shell">
          <div className="section-heading">
            <h2 id="journey-title">{landing.journeyTitle}</h2>
            <p>{landing.journeyLead}</p>
          </div>
          <div className="journey-grid" aria-label={landing.journeyAria}>
            {landing.steps.map((step, index) => (
              <a
                key={step.href}
                className={`journey-card ${index === 1 ? 'journey-card-tall' : ''}`}
                href={step.href}
              >
                <img
                  className="journey-photo"
                  src={journeyPhotos[index]}
                  alt={step.alt}
                  loading="lazy"
                />
                <div className="journey-copy">
                  <h3>
                    {step.title}
                    <ArrowRight size={16} aria-hidden="true" />
                  </h3>
                  <p>{step.text}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-records" aria-labelledby="records-title">
        <div className="section-shell">
          <div className="section-heading">
            <h2 id="records-title">{landing.recordTitle}</h2>
            <p>{landing.recordLead}</p>
          </div>
          <div className="chain-records">
            {landing.records.map((record) => (
              <div key={record.name} className="chain-record">
                <code>{record.name}</code>
                <p>{record.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default Hero
