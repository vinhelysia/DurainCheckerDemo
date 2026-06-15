import { CheckCircle2, Clock3 } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { localized, formatDate } from '../data/batches'

function BlockchainTimeline({ timeline, loading, source }) {
  const { language, copy } = useLanguage()

  return (
    <article 
      className={`ledger-panel ${loading ? 'skeleton' : ''}`} 
      aria-labelledby="ledger-title"
      aria-busy={loading}
    >
      <div className="panel-heading panel-heading-inline">
        <div>
          <p className="section-kicker">{copy.timeline.kicker}</p>
          <h3 id="ledger-title">{copy.timeline.title}</h3>
        </div>
        <span className={`source-badge ${source === 'chain' ? 'source-badge--chain' : 'source-badge--fallback'}`}>
          {source === 'chain' ? copy.aiResult.sourceChain : copy.aiResult.sourceFallback}
        </span>
      </div>

      <ol className="timeline" aria-label={copy.timeline.ariaLabel}>
        {timeline.map((step, idx) => {
          const isComplete = step.status === 'complete'
          const Icon = isComplete ? CheckCircle2 : Clock3
          // use index as key to avoid object-as-key rendering or localized key mismatches
          const stageText = localized(step.stage, language)

          return (
            <li className={`timeline-step ${step.status}`} key={`${stageText}-${idx}`}>
              <span className="timeline-marker" aria-hidden="true">
                <Icon size={18} strokeWidth={2.4} />
              </span>
              <div>
                <h4>{stageText}</h4>
                <p>{localized(step.location, language)}</p>
                <small>{formatDate(step.date, language)}</small>
                <span className="timeline-status">
                  {isComplete ? copy.timeline.statusRecorded : copy.timeline.statusPending}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

export default BlockchainTimeline
