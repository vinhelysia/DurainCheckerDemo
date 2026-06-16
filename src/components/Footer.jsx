import { ExternalLink } from 'lucide-react'
import { useLanguage } from './LanguageContext'

const sources = [
  {
    label: 'VietnamPlus',
    href: 'https://en.vietnamplus.vn/vietnam-steps-up-quality-control-of-durian-exports-to-retain-billion-dollar-market-post321595.vnp',
  },
  {
    label: 'MOIT/VNTR',
    href: 'https://vntr.moit.gov.vn/news/china-tightens-import-rules-on-vietnamese-durians',
  },
  {
    label: 'Tuổi Trẻ',
    href: 'https://tuoitre.vn/sau-rieng-xuat-khau-sang-trung-quoc-giam-sau-bo-truong-do-duc-duy-chi-dao-loat-giai-phap-20250508164730467.htm',
  },
  {
    label: 'SGGP',
    href: 'https://en.sggp.org.vn/vietnams-durian-industry-reeling-as-china-rejects-shipments-over-contaminants-post117622.html',
  },
]

function Footer() {
  const { copy } = useLanguage()

  return (
    <footer className="site-footer">
      <div className="section-shell footer-shell">
        <div>
          <strong>DurianTrust</strong>
          <p>
            {copy.footer.demoText}
          </p>
        </div>

        <div className="source-links" aria-label={copy.footer.sourcesLabel}>
          <span>{copy.footer.sourcesLabel}</span>
          {sources.map((source) => (
            <a
              key={source.label}
              href={source.href}
              target="_blank"
              rel="noreferrer"
            >
              {source.label}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
