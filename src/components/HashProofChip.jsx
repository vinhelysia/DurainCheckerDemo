import { Fingerprint } from 'lucide-react'
import { useLanguage } from './LanguageContext'

function HashProofChip({ hash, tokenId, loading }) {
  const { copy } = useLanguage()

  return (
    <a 
      href={tokenId ? `/nft.html?q=${tokenId}` : '/nft.html'}
      className={`hash-proof ${loading ? 'skeleton' : ''}`} 
      aria-label={copy.hashProof.ariaLabel}
      aria-busy={loading}
    >
      <Fingerprint size={20} aria-hidden="true" />
      <span>
        <small>{copy.hashProof.label}</small>
        <code>{hash}</code>
      </span>
    </a>
  )
}

export default HashProofChip
