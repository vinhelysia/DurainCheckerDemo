import { useState, useEffect } from 'react'
import { Camera, Sparkles, AlertCircle, RotateCcw } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useSlowLoading } from '../hooks/useSlowLoading'

const SAMPLE_IMAGES = [
  { key: 'healthy', src: `${import.meta.env.BASE_URL}samples/healthy.jpg` },
  { key: 'algal_leaf_spot', src: `${import.meta.env.BASE_URL}samples/algal_leaf_spot.jpg` },
  { key: 'leaf_blight', src: `${import.meta.env.BASE_URL}samples/leaf_blight.jpg` },
  { key: 'phomopsis_leaf_spot', src: `${import.meta.env.BASE_URL}samples/phomopsis_leaf_spot.jpg` },
]

export default function LeafDiseaseScanner() {
  const { language, copy } = useLanguage()
  const scannerCopy = copy.leafScanner

  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [errorState, setErrorState] = useState(null)
  const [badgeSource, setBadgeSource] = useState(null) // 'ai' | 'error'
  const [lastRequest, setLastRequest] = useState(null) // Blob/File to retry with

  const isSlow = useSlowLoading(loading, 3000)

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Revoke previous URL if exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setPrediction(null)
    setErrorState(null)
    setBadgeSource(null)
    setLastRequest(file)
    setLoading(true)

    sendInferenceRequest(file)
  }

  const handleSampleClick = async (sample) => {
    if (loading) return

    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    setImagePreview(sample.src)
    setPrediction(null)
    setErrorState(null)
    setBadgeSource(null)
    setLoading(true)

    try {
      const response = await fetch(sample.src)
      const blob = await response.blob()
      setLastRequest(blob)
      sendInferenceRequest(blob)
    } catch (err) {
      console.error('Failed to load sample image:', err)
      setErrorState(err.message || 'Sample load failed')
      setBadgeSource('error')
      setLoading(false)
    }
  }

  const sendInferenceRequest = async (file) => {
    try {
      const formData = new FormData()
      // TODO: Backend /api/predict_leaf endpoint must accept FormData containing the raw image file (key 'image'),
      // resize it to 224x224, and perform model inference.
      formData.append('image', file)

      const response = await fetch('/api/predict_leaf', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }
        setPrediction(data)
        setBadgeSource('ai')
      } else {
        const errData = await response.json().catch(() => ({}))
        const serverError = errData.error || `HTTP ${response.status}`
        throw new Error(serverError)
      }
    } catch (err) {
      console.error('Inference request failed:', err)
      setErrorState(err.message || 'Inference failed')
      setBadgeSource('error')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    if (!lastRequest) return
    setPrediction(null)
    setErrorState(null)
    setBadgeSource(null)
    setLoading(true)
    sendInferenceRequest(lastRequest)
  }

  // Get translated disease class name
  const getDiseaseLabel = (diseaseKey) => {
    if (!scannerCopy.diseases) return diseaseKey
    return scannerCopy.diseases[diseaseKey] || diseaseKey
  }

  // Get translated generic care advice
  const getTreatmentText = (diseaseKey) => {
    if (!scannerCopy.treatments) return ''
    return scannerCopy.treatments[diseaseKey] || ''
  }

  return (
    <div className="leaf-scanner-card">
      <div className="leaf-scanner-header">
        <span className="leaf-scanner-kicker">{scannerCopy.kicker}</span>
        <h2 className="leaf-scanner-title">{scannerCopy.title}</h2>
        <p className="leaf-scanner-desc">{scannerCopy.desc}</p>
      </div>

      <div className="leaf-scanner-controls">
        <label className="scanner-upload-label" htmlFor="leaf-image-input">
          <Camera size={20} aria-hidden="true" />
          <span>{scannerCopy.button}</span>
          <input
            id="leaf-image-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: 'none' }}
            disabled={loading}
          />
        </label>

        {loading && (
          <div className="scanner-loading-state" role="status" aria-live="polite">
            <div className="scanner-loading-spinner"></div>
            <span>{isSlow ? copy.common.warmingUpModel : scannerCopy.analyzing}</span>
          </div>
        )}
      </div>

      <div className="leaf-scanner-samples">
        <p className="leaf-scanner-samples-heading">{scannerCopy.sampleHeading}</p>
        <p className="leaf-scanner-samples-hint">{scannerCopy.sampleHint}</p>
        <div className="leaf-scanner-samples-grid">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.key}
              type="button"
              className="leaf-sample-thumb"
              onClick={() => handleSampleClick(sample)}
              disabled={loading}
            >
              <img src={sample.src} alt={getDiseaseLabel(sample.key)} />
              <span>{getDiseaseLabel(sample.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorState && (
        <div className="scanner-error-message" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertCircle size={20} />
            <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {scannerCopy.sourceOffline}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{copy.common.aiUnavailable}</p>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="scanner-badge scanner-badge-error">
              {scannerCopy.sourceOffline}
            </span>
            <button
              type="button"
              className="button button-secondary scanner-retry-btn"
              onClick={handleRetry}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>{copy.common.retry}</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Display */}
      {prediction && !loading && !errorState && (
        <div className="leaf-scanner-results">
          <div className="scanner-preview-wrapper">
            {imagePreview && (
              <img
                src={imagePreview}
                alt={language === 'vi' ? 'Xem trước lá' : 'Leaf preview'}
                className="scanner-preview-image"
              />
            )}
            <div>
              {badgeSource === 'ai' && (
                <span className="scanner-badge scanner-badge-ai">
                  {scannerCopy.sourceAi}
                </span>
              )}
            </div>
          </div>

          <div className="scanner-result-details">
            <h3 className="scanner-result-title" style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-ledger)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              {scannerCopy.resultHeader}
            </h3>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', display: 'block' }}>
                {scannerCopy.diseaseLabel}
              </span>
              <h2 className="scanner-disease-name" style={{ fontSize: '1.75rem', marginTop: '4px' }}>
                {getDiseaseLabel(prediction.disease)}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-gold)' }} />
              <span>
                <strong>{scannerCopy.probabilityLabel}:</strong> {(prediction.probability * 100).toFixed(1)}%
              </span>
            </div>

            {getTreatmentText(prediction.disease) && (
              <div className="scanner-remedy-box">
                <span className="scanner-remedy-title">
                  {scannerCopy.treatmentHeader}
                </span>
                <p className="scanner-remedy-text">
                  {getTreatmentText(prediction.disease)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
