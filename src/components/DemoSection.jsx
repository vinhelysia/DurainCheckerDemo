import { useState } from 'react'
import { BadgeCheck, CalendarDays, MapPin, QrCode, Sprout } from 'lucide-react'
import { defaultBatchId, localized, formatDate } from '../data/batches'
import { useLanguage } from './LanguageContext'
import { useBlockchainBatches } from '../hooks/useBlockchainBatches'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import AIResultCard from './AIResultCard'
import BlockchainTimeline from './BlockchainTimeline'
import HashProofChip from './HashProofChip'

function DemoSection() {
  const { language, copy } = useLanguage()
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })

  const { batches, activeBatch, loading, source } = useBlockchainBatches(selectedBatchId)

  // Use fallback if activeBatch is not loaded yet
  const currentBatch = activeBatch || {
    id: selectedBatchId,
    farm: { vi: '', en: '' },
    province: { vi: '', en: '' },
    harvestDate: '',
    cadmiumPpm: 0,
    thresholdPpm: 0.05,
    aiResult: { vi: '', en: '' },
    confidence: 0,
    riskLevel: 'low',
    riskCause: { vi: '', en: '' },
    timeline: [],
    blockchainHash: ''
  }

  function handleSelect(batchId) {
    setSelectedBatchId(batchId)
    setScanStatus('')
  }

  function handleScan() {
    setIsScanning(true)
    setScanStatus(source === 'chain' ? copy.demo.scanBlockchain : copy.demo.scanStatusProgress)

    window.setTimeout(() => {
      setIsScanning(false)
      setScanStatus(
        source === 'chain'
          ? `${copy.demo.scanConfirmed} - ${copy.demo.scanStatusComplete.replace('{id}', currentBatch.id)}`
          : copy.demo.scanStatusComplete.replace('{id}', currentBatch.id)
      )
    }, 650)
  }

  return (
    <section
      className={`section demo-section reveal-on-scroll ${isVisible ? 'revealed' : ''}`}
      id="demo"
      aria-labelledby="demo-title"
      ref={ref}
    >
      <div className="section-shell">
        <div className="section-heading demo-heading">
          <div>
            <p className="section-kicker">{copy.demo.kicker}</p>
            <h2 id="demo-title">{copy.demo.title}</h2>
          </div>
          <p className="demo-note">
            {copy.demo.note}
          </p>
        </div>

        <div className="demo-controls" aria-label={copy.demo.ariaLabelControls}>
          {batches.map((batch) => (
            <button
              className={`batch-tab risk-${batch.riskLevel}`}
              key={batch.id}
              type="button"
              aria-pressed={batch.id === currentBatch.id}
              onClick={() => handleSelect(batch.id)}
            >
              <span>{copy.demo.riskNames[batch.riskLevel]}</span>
              <small>{copy.demo.riskSubnames[batch.riskLevel]}</small>
            </button>
          ))}
        </div>

        <div className="lookup-bar">
          <label htmlFor="batch-id">{copy.demo.batchIdLabel}</label>
          <input
            id="batch-id"
            className={isScanning ? 'scanning-text-shimmer' : ''}
            value={currentBatch.id}
            readOnly
          />
          <button
            className="button button-primary scan-button"
            type="button"
            disabled={isScanning}
            onClick={handleScan}
          >
            <QrCode size={18} aria-hidden="true" />
            {isScanning ? copy.demo.scanning : copy.demo.scanQr}
          </button>
          <p className="sr-status" aria-live="polite">
            {scanStatus}
          </p>
        </div>

        <div
          className={`batch-summary ${loading ? 'skeleton' : ''}`}
          aria-label={loading ? copy.demo.skeletonLabel : copy.demo.ariaLabelSummary}
          aria-busy={loading}
        >
          <div>
            <Sprout size={20} aria-hidden="true" />
            <span>
              <small>{copy.demo.summary.farm}</small>
              <strong>{localized(currentBatch.farm, language)}</strong>
            </span>
          </div>
          <div>
            <MapPin size={20} aria-hidden="true" />
            <span>
              <small>{copy.demo.summary.province}</small>
              <strong>{localized(currentBatch.province, language)}</strong>
            </span>
          </div>
          <div>
            <CalendarDays size={20} aria-hidden="true" />
            <span>
              <small>{copy.demo.summary.harvestDate}</small>
              <strong>{formatDate(currentBatch.harvestDate, language)}</strong>
            </span>
          </div>
          <div>
            <BadgeCheck size={20} aria-hidden="true" />
            <span>
              <small>{copy.demo.summary.status}</small>
              <strong>{localized(currentBatch.aiResult, language)}</strong>
            </span>
          </div>
        </div>

        <div className={`demo-result-grid-wrapper ${isScanning ? 'is-scanning' : ''}`}>
          {isScanning && <div className="audit-beam" aria-hidden="true" />}
          <div className="demo-result-grid">
            <BlockchainTimeline timeline={currentBatch.timeline} loading={loading} source={source} />
            <div className="ai-result-stack">
              <AIResultCard batch={currentBatch} loading={loading} source={source} />
              <HashProofChip hash={currentBatch.blockchainHash} tokenId={currentBatch.tokenId} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DemoSection
