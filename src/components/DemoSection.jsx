import { useState, useEffect } from 'react'
import { BadgeCheck, CalendarDays, MapPin, QrCode, Sprout } from 'lucide-react'
import { defaultBatchId, localized, formatDate } from '../data/batches'
import { useLanguage } from './LanguageContext'
import { useBlockchainBatches } from '../hooks/useBlockchainBatches'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import AIResultCard from './AIResultCard'
import BlockchainTimeline from './BlockchainTimeline'
import HashProofChip from './HashProofChip'
import QRScannerModal from './QRScannerModal'
import BatchQRLabel from './BatchQRLabel'

function DemoSection() {
  const { language, copy } = useLanguage()

  const getBatchIdFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.has('batchId')) {
      return searchParams.get('batchId')
    }
    const hashParts = window.location.hash.split('?')
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1])
      if (hashParams.has('batchId')) {
        return hashParams.get('batchId')
      }
    }
    return defaultBatchId
  }

  const [selectedBatchId, setSelectedBatchId] = useState(getBatchIdFromUrl)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })

  const { batches, activeBatch, loading, source } = useBlockchainBatches(selectedBatchId)

  useEffect(() => {
    const handleUrlChange = () => {
      const paramId = getBatchIdFromUrl()
      if (paramId !== selectedBatchId) {
        setSelectedBatchId(paramId)
      }
    }
    window.addEventListener('popstate', handleUrlChange)
    window.addEventListener('hashchange', handleUrlChange)
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      window.removeEventListener('hashchange', handleUrlChange)
    }
  }, [selectedBatchId])

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
  }

  function handleScan() {
    setIsScannerOpen(true)
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
            value={currentBatch.id}
            readOnly
          />
          <button
            className="button button-primary scan-button"
            type="button"
            onClick={handleScan}
          >
            <QrCode size={18} aria-hidden="true" />
            {copy.demo.scanQr}
          </button>
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

        <div className="demo-result-grid-wrapper">
          <div className="demo-result-grid">
            <BlockchainTimeline timeline={currentBatch.timeline} loading={loading} source={source} />
            <div className="ai-result-stack">
              <AIResultCard batch={currentBatch} loading={loading} source={source} />
              <BatchQRLabel batchId={currentBatch.id} language={language} loading={loading} />
              <HashProofChip hash={currentBatch.blockchainHash} tokenId={currentBatch.tokenId} loading={loading} />
            </div>
          </div>
        </div>

        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          batches={batches}
          onScanSuccess={handleSelect}
          language={language}
        />
      </div>
    </section>
  )
}

export default DemoSection
