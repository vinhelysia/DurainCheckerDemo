import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleHelp, Cpu } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { localized } from '../data/batches'
import { runRuleAuditor } from '../lib/ruleAuditor'

function AIResultCard({ batch, loading, source }) {
  const { language, copy } = useLanguage()
  const isUnknown = !['low', 'medium', 'high'].includes(batch.riskLevel)
  const riskLevel = isUnknown ? 'unknown' : batch.riskLevel
  const confidence = isUnknown ? 0 : Math.round(batch.confidence * 100)
  const isLowRisk = batch.riskLevel === 'low'
  const StatusIcon = isUnknown ? CircleHelp : isLowRisk ? CheckCircle2 : AlertTriangle

  const [meterWidth, setMeterWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setMeterWidth(confidence)
    }, 50)
    return () => {
      clearTimeout(t)
      setMeterWidth(0)
    }
  }, [confidence])

  return (
    <article
      className={`ai-card risk-${riskLevel} ${loading ? 'skeleton' : ''}`}
      aria-labelledby="ai-title"
      aria-busy={loading}
    >
      <div className="panel-heading panel-heading-inline">
        <div>
          <h3 id="ai-title">{copy.aiResult.title}</h3>
        </div>
        <div className="panel-heading-badges">
          <span className={`source-badge ${source === 'chain' ? 'source-badge--chain' : 'source-badge--fallback'}`}>
            {source === 'chain' ? copy.aiResult.measurementSourceChain : copy.aiResult.sourceFallback}
          </span>
          {batch.tokenId ? (
            <span className="source-badge source-badge--token">
              {language === 'vi' ? 'Lô #' : 'Seq #'}{batch.tokenId}
            </span>
          ) : null}
          <span className={`risk-pill risk-${riskLevel}`}>
            <StatusIcon size={13} aria-hidden="true" />
            {copy.aiResult.riskLabels[riskLevel]}
          </span>
        </div>
      </div>

      <div className="ai-result-main">
        <Cpu size={26} aria-hidden="true" />
        <span>
          <strong>{isUnknown ? copy.aiResult.riskLabels.unknown : localized(batch.aiResult, language)}</strong>
          <small>{isUnknown ? copy.aiResult.unknownHint : localized(batch.riskCause, language)}</small>
        </span>
      </div>

      {confidence > 0 && <div
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
          <span style={{ width: `${meterWidth}%` }} />
        </div>
      </div>}

      <dl className="contaminant-grid">
        <div>
          <dt>{copy.aiResult.cadmium}</dt>
          <dd>{!isUnknown && Number.isFinite(batch.cadmiumPpm) ? `${batch.cadmiumPpm.toFixed(4)} ppm` : copy.aiResult.noData}</dd>
        </div>
        <div>
          <dt>{copy.aiResult.threshold}</dt>
          <dd>{!isUnknown && Number.isFinite(batch.thresholdPpm) ? `${batch.thresholdPpm.toFixed(4)} ppm` : copy.aiResult.noData}</dd>
        </div>
        <div>
          <dt>{copy.aiResult.yellowO}</dt>
          <dd>{language === 'vi' ? 'Chưa có dữ liệu kiểm nghiệm' : 'No assay data'}</dd>
        </div>
      </dl>

      {batch.labReports && batch.labReports.length > 1 && (
        <div className="lab-history">
          <h4>{copy.aiResult.history}</h4>
          <ul>
            {batch.labReports.map((report, idx) => {
              const audit = runRuleAuditor(report.cadmiumPpm, report.thresholdPpm)
              return (
                <li key={idx}>
                  <span>
                    <strong>#{idx + 1}:</strong> <code>{audit.valid ? `${report.cadmiumPpm.toFixed(4)} ppm` : copy.aiResult.noData}</code> ({copy.aiResult.riskLabels[audit.valid ? audit.riskLevel : 'unknown']})
                  </span>
                  <span className="lab-history-date">
                    {new Date(report.timestamp * 1000).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </article>
  )
}

export default AIResultCard
