import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Cpu } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { localized } from '../data/batches'

function AIResultCard({ batch, loading, source }) {
  const { language, copy } = useLanguage()
  const confidence = Math.round(batch.confidence * 100)
  const isLowRisk = batch.riskLevel === 'low'
  const StatusIcon = isLowRisk ? CheckCircle2 : AlertTriangle

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
              {language === 'vi' ? 'Lô #' : 'Seq #'}{batch.tokenId}
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
          <span style={{ width: `${meterWidth}%` }} />
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

      {batch.labReports && batch.labReports.length > 1 && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px dashed rgba(94, 142, 134, 0.3)'
        }}>
          <h4 style={{
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-ink-soft)',
            marginBottom: '8px',
            fontWeight: 700
          }}>
            {language === 'vi' ? 'Lịch sử kiểm định' : 'Audit History'}
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {batch.labReports.map((report, idx) => (
              <li key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--color-ink)',
                background: 'rgba(94, 142, 134, 0.05)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(94, 142, 134, 0.1)'
              }}>
                <span>
                  <strong>#{idx + 1}:</strong> {report.cadmiumPpm.toFixed(3)} ppm ({report.riskLevel === 'low' ? (language === 'vi' ? 'Đạt' : 'Safe') : report.riskLevel === 'medium' ? (language === 'vi' ? 'Cần khám' : 'Review') : (language === 'vi' ? 'Giữ lô' : 'Hold')})
                </span>
                <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.7rem' }}>
                  {new Date(report.timestamp * 1000).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

export default AIResultCard
