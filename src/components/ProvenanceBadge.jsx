import { ExternalLink } from 'lucide-react'
import { useLanguage } from './LanguageContext'

function ProvenanceBadge({ source, hash, loading }) {
  const { copy } = useLanguage()

  if (loading) {
    return <div className="provenance-badge skeleton" aria-hidden="true" />
  }

  const isChain = source === 'chain'

  const isValidHash = hash &&
    hash !== 'simulated, not on-chain' &&
    hash !== 'on-chain (Solana)' &&
    hash !== 'on-chain (signature not cached)' &&
    !hash.startsWith('simulated')

  const explorerHref = isChain && isValidHash
    ? `https://explorer.solana.com/tx/${hash}?cluster=devnet`
    : null

  const label = isChain ? copy.demo.provenance.live : copy.demo.provenance.demo

  if (explorerHref) {
    return (
      <a
        className="provenance-badge provenance-badge--live"
        href={explorerHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="provenance-badge-status">{label}</span>
        <span className="provenance-badge-link">
          {copy.demo.provenance.viewExplorer}
          <ExternalLink size={13} aria-hidden="true" />
        </span>
      </a>
    )
  }

  return (
    <div
      className={`provenance-badge ${isChain ? 'provenance-badge--live' : 'provenance-badge--demo'}`}
      role="status"
    >
      <span className="provenance-badge-status">{label}</span>
    </div>
  )
}

export default ProvenanceBadge
