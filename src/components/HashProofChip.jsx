import { Fingerprint } from 'lucide-react'
import { useLanguage } from './LanguageContext'

function HashProofChip({ hash, batchId, loading }) {
  const { copy, language } = useLanguage()

  const certificateHref = `${import.meta.env.BASE_URL}#/unit/demo?batchId=${batchId || ''}`
  
  const isChain = hash && 
                  hash !== 'simulated, not on-chain' && 
                  hash !== 'on-chain (Solana)' && 
                  hash !== 'on-chain (signature not cached)' &&
                  !hash.startsWith('simulated')
                  
  const explorerHref = isChain ? `https://explorer.solana.com/tx/${hash}?cluster=devnet` : null

  return (
    <div className={`hash-proof ${loading ? 'skeleton' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', minHeight: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Fingerprint size={20} aria-hidden="true" style={{ color: 'var(--color-ledger)', flexShrink: 0 }} />
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <small style={{ display: 'block', color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}>{copy.hashProof.label}</small>
          <code style={{ display: 'block', marginTop: '4px', overflowWrap: 'anywhere', color: 'var(--color-green-deep)', fontSize: '0.85rem', fontWeight: 700 }}>{hash}</code>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.8rem', borderTop: '1px solid rgba(94, 142, 134, 0.15)', paddingTop: '8px' }}>
        <a 
          href={certificateHref}
          style={{ color: 'var(--color-green-deep)', fontWeight: 600, textDecoration: 'underline' }}
        >
          {language === 'vi' ? 'Xem Chứng Thư' : 'View Certificate'}
        </a>
        {explorerHref && (
          <a
            href={explorerHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-gold)', fontWeight: 600, textDecoration: 'underline' }}
          >
            {language === 'vi' ? 'Xem giao dịch Solana' : 'View on Solana Explorer'}
          </a>
        )}
      </div>
    </div>
  )
}

export default HashProofChip
