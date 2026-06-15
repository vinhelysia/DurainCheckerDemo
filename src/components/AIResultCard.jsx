import { AlertTriangle, CheckCircle2, Cpu } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { localized } from '../data/batches'

function AIResultCard({ batch, loading, source }) {
  const { language, copy } = useLanguage()
  const confidence = Math.round(batch.confidence * 100)
  const isLowRisk = batch.riskLevel === 'low'
  const StatusIcon = isLowRisk ? CheckCircle2 : AlertTriangle

  return (
    <article 
      className={`ai-card risk-${batch.riskLevel} ${loading ? 'skeleton' : ''}`} 
      aria-labelledby="ai-title"
      aria-busy={loading}
    >
      <div className="panel-heading panel-heading-inline">
        <div>
          <p className="section-kicker">{copy.aiResult.kicker}</p>
          <h3 id="ai-title">{copy.aiResult.title}</h3>
        </div>
        <div className="panel-heading-badges">
          <span className={`source-badge ${source === 'chain' ? 'source-badge--chain' : 'source-badge--fallback'}`}>
            {source === 'chain' ? copy.aiResult.sourceChain : copy.aiResult.sourceFallback}
          </span>
          {batch.tokenId ? (
            <span className="source-badge source-badge--token">
              {language === 'vi' ? 'Chứng thư' : 'Cert'}: #{batch.tokenId}
            </span>
          ) : null}
          <span className={`risk-pill risk-${batch.riskLevel}`}>
            <StatusIcon size={13} aria-hidden="true" />
            {copy.aiResult.riskLabels[batch.riskLevel]}
          </span>
        </div>
      </div>

      <div className="ai-result-main">
        <Cpu size={26} aria-hidden="true" />
        <span>
          <strong>{localized(batch.aiResult, language)}</strong>
          <small>{localized(batch.riskCause, language)}</small>
        </span>
      </div>

      <div
        className="confidence-meter"
        role="meter"
        aria-label={`${copy.aiResult.confidence} ${confidence}%`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={confidence}
      >
        <div className="meter-label">
          <span>{copy.aiResult.confidence}</span>
          <strong>{confidence}%</strong>
        </div>
        <div className="meter-track">
          <span style={{ width: `${confidence}%` }} />
        </div>
      </div>

      <dl className="contaminant-grid">
        <div>
          <dt>{copy.aiResult.cadmium}</dt>
          <dd>{batch.cadmiumPpm.toFixed(3)} ppm</dd>
        </div>
        <div>
          <dt>{copy.aiResult.threshold}</dt>
          <dd>{batch.thresholdPpm.toFixed(2)} ppm</dd>
        </div>
        <div>
          <dt>{copy.aiResult.yellowO}</dt>
          <dd>{copy.aiResult.notDetected}</dd>
        </div>
      </dl>
    </article>
  )
}

export default AIResultCard
