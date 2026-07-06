import { ExternalLink } from 'lucide-react'
import { useLanguage } from './LanguageContext'

// CC BY / CC BY-SA licenses require author + license attribution
const photoCredits = [
  { label: 'Sodanie Chea (CC BY 2.0)', href: 'https://commons.wikimedia.org/w/index.php?curid=40618459' },
  { label: 'Mx. Granger (CC0)', href: 'https://commons.wikimedia.org/w/index.php?curid=87077521' },
  { label: 'U.S. FDA (PD)', href: 'https://commons.wikimedia.org/w/index.php?curid=48273411' },
  { label: 'Nathan.cima (CC BY-SA 4.0)', href: 'https://commons.wikimedia.org/w/index.php?curid=126373777' },
  { label: 'Andrea Puggioni (CC BY 2.0)', href: 'https://commons.wikimedia.org/wiki/File:Reefer_container_stacked.jpeg' },
]

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

        <div className="source-links footer-credits" aria-label={copy.footer.photosLabel}>
          <span>{copy.footer.photosLabel}</span>
          {photoCredits.map((credit) => (
            <a
              key={credit.label}
              href={credit.href}
              target="_blank"
              rel="noreferrer"
            >
              {credit.label}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
