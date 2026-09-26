import { ArrowRight, CheckCircle2, FileCheck2, Sprout, Route, FlaskConical, ScanLine } from 'lucide-react'
import { useLanguage } from './LanguageContext'

const base = import.meta.env.BASE_URL
const recordIcons = [Sprout, Route, FlaskConical, ScanLine]

function asset(file) {
  return `${base}images/${file}`
}

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
            <picture className="passport-art">
              <img
                className="hero-photo"
                src={asset('durian-digital-passport.webp')}
                alt={copy.hero.photoAlt}
                width={960}
                height={960}
                fetchPriority="high"
              />
            </picture>
            <p className="illustration-caption">{copy.hero.illustrationCaption}</p>
            <div className="hero-ledger-note" aria-label={copy.hero.ariaLabelLedger}>
              <div className="proof-icon" aria-hidden="true">
                <FileCheck2 size={22} />
              </div>
              <div className="proof-copy">
                <small>{copy.hero.batchProof}</small>
                <strong>DRN-2026-LD-0429</strong>
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
          <div className="journey-grid journey-grid-4" aria-label={landing.journeyAria}>
            {landing.steps.map((step, index) => {
              const webp = step.image || 'orchard.webp'
              const jpg = webp.replace(/\.webp$/i, '.jpg')
              return (
                <a
                  key={step.href}
                  className={`journey-card ${index === 1 ? 'journey-card-tall' : ''}`}
                  href={step.href}
                >
                  <picture>
                    <source srcSet={asset(webp)} type="image/webp" />
                    <img
                      className="journey-photo"
                      src={asset(jpg)}
                      alt={step.alt}
                      width={600}
                      height={400}
                      loading="lazy"
                    />
                  </picture>
                  <div className="journey-copy">
                    <span className="journey-step-number" aria-hidden="true">0{index + 1}</span>
                    <h3>
                      {step.title}
                      <ArrowRight size={16} aria-hidden="true" />
                    </h3>
                    <p>{step.text}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      <section className="landing-records" aria-labelledby="records-title">
        <div className="section-shell">
          <div className="section-heading">
            <h2 id="records-title">{landing.recordTitle}</h2>
            <p>{landing.recordLead}</p>
          </div>
          <ol className="record-flow">
            {landing.records.map((record, index) => {
              const Icon = recordIcons[index]
              return (
                <li key={record.name}>
                  <div className="record-flow-symbol" aria-hidden="true">
                    <Icon size={28} strokeWidth={1.7} />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{record.name}</h3>
                  <p>{record.detail}</p>
                </li>
              )
            })}
          </ol>
          <div className="scan-invitation">
            <a className="scan-invitation-code" href="#/unit/demo?batchId=DRN-2026-LD-0429" aria-label={landing.scanAction}>
              <img src={asset('demo-passport-qr.svg')} width={156} height={156} loading="lazy" alt={landing.scanAlt} />
            </a>
            <div className="scan-invitation-copy">
              <p className="section-kicker">DRN-2026-LD-0429</p>
              <h3>{landing.scanTitle}</h3>
              <p>{landing.scanLead}</p>
              <a href="#/unit/demo?batchId=DRN-2026-LD-0429" className="button button-primary">
                {landing.scanAction}<ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Hero
