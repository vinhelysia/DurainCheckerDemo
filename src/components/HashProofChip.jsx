import { Fingerprint } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useState, useEffect } from 'react'
import { BrowserProvider, JsonRpcProvider } from 'ethers'

function HashProofChip({ hash, tokenId, loading }) {
  const { copy, language } = useLanguage()
  const [chainId, setChainId] = useState(null)

  useEffect(() => {
    let active = true
    async function detectChain() {
      try {
        const configRes = await fetch(`${import.meta.env.BASE_URL}contracts/DurianTrust.json`)
        if (configRes.ok) {
          const contractConfig = await configRes.json()
          if (contractConfig.address) {
            let provider
            if (window.ethereum) {
              provider = new BrowserProvider(window.ethereum)
            } else {
              const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'
              provider = new JsonRpcProvider(rpcUrl)
            }
            const network = await provider.getNetwork()
            if (active) {
              setChainId(Number(network.chainId))
            }
          }
        }
      } catch (e) {
        console.warn('Error detecting chainId in HashProofChip', e)
      }
    }
    detectChain()
    return () => { active = false }
  }, [])

  const certificateHref = `${import.meta.env.BASE_URL}nft.html${tokenId ? `?q=${tokenId}` : ''}`
  
  const isChain = hash && hash !== 'simulated, not on-chain' && hash.startsWith('0x')
  const showEtherscan = isChain && chainId === 11155111
  const etherscanHref = showEtherscan ? `https://sepolia.etherscan.io/tx/${hash}` : null

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
        {etherscanHref && (
          <a
            href={etherscanHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-gold)', fontWeight: 600, textDecoration: 'underline' }}
          >
            {language === 'vi' ? 'Xem giao dịch Sepolia' : 'View on Sepolia'}
          </a>
        )}
      </div>
    </div>
  )
}

export default HashProofChip
