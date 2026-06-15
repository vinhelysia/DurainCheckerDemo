import { ArrowRight, CheckCircle2, FileCheck2 } from 'lucide-react'
import HeroIllustration from './HeroIllustration'
import { useLanguage } from './LanguageContext'

function Hero() {
  const { copy } = useLanguage()

  return (
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
          <HeroIllustration />
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
  )
}

export default Hero
