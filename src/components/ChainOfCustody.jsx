import { ArrowRight, ShieldCheck, Clock3 } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { formatDate } from '../data/batches'

const shortKey = (pk) => (pk ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : '')

const explorerUrl = (pk) => `https://explorer.solana.com/address/${pk}?cluster=devnet`

function ChainOfCustody({ custody, owner, pendingOwner, loading, source }) {
  const { language, copy } = useLanguage()

  // Custody exists only on-chain. The simulated ledger has no owner to prove, so
  // rather than render a fake chain we render nothing.
  if (source !== 'chain' || !custody) return null

  return (
    <article
      className={`ledger-panel ${loading ? 'skeleton' : ''}`}
      aria-labelledby="custody-title"
      aria-busy={loading}
    >
      <div className="panel-heading panel-heading-inline">
        <div>
          <h3 id="custody-title">{copy.custody.title}</h3>
        </div>
        <span className="source-badge source-badge--chain">
          {copy.aiResult.sourceChain}
        </span>
      </div>

      {custody.length === 0 && !pendingOwner ? (
        <p className="custody-empty">{copy.custody.empty}</p>
      ) : (
        <ol className="timeline" aria-label={copy.custody.ariaLabel}>
          {custody.map((hop, idx) => (
            <li className="timeline-step complete" key={`${hop.to}-${idx}`}>
              <span className="timeline-marker" aria-hidden="true">
                <ShieldCheck size={18} strokeWidth={2.4} />
              </span>
              <div>
                <h4>{copy.custody.roles[hop.role] ?? hop.role}</h4>
                <p>{hop.location}</p>
                <small className="custody-keys">
                  <a href={explorerUrl(hop.from)} target="_blank" rel="noreferrer">{shortKey(hop.from)}</a>
                  <ArrowRight size={12} aria-hidden="true" />
                  <a href={explorerUrl(hop.to)} target="_blank" rel="noreferrer">{shortKey(hop.to)}</a>
                </small>
                <span className="timeline-status">
                  {formatDate(new Date(hop.timestamp * 1000).toISOString().slice(0, 10), language)}
                </span>
              </div>
            </li>
          ))}

          {pendingOwner && (
            <li className="timeline-step pending" key="pending">
              <span className="timeline-marker" aria-hidden="true">
                <Clock3 size={18} strokeWidth={2.4} />
              </span>
              <div>
                <h4>{copy.custody.pendingTitle}</h4>
                <p>{copy.custody.pendingHint}</p>
                <small className="custody-keys">
                  <a href={explorerUrl(pendingOwner)} target="_blank" rel="noreferrer">{shortKey(pendingOwner)}</a>
                </small>
                <span className="timeline-status">{copy.custody.pendingStatus}</span>
              </div>
            </li>
          )}
        </ol>
      )}

      {owner && (
        <p className="custody-owner">
          {copy.custody.currentHolder}{' '}
          <a href={explorerUrl(owner)} target="_blank" rel="noreferrer">
            <code>{shortKey(owner)}</code>
          </a>
        </p>
      )}
    </article>
  )
}

export default ChainOfCustody
