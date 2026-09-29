import { useState, useEffect, useRef } from 'react'
import { Camera, Sparkles, AlertCircle, RotateCcw } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { useSlowLoading } from '../hooks/useSlowLoading'
import { apiFetch } from '../lib/api'

const SAMPLE_IMAGES = [
  { key: 'healthy', src: `${import.meta.env.BASE_URL}samples/healthy.jpg` },
  { key: 'algal_leaf_spot', src: `${import.meta.env.BASE_URL}samples/algal_leaf_spot.jpg` },
  { key: 'leaf_blight', src: `${import.meta.env.BASE_URL}samples/leaf_blight.jpg` },
  { key: 'phomopsis_leaf_spot', src: `${import.meta.env.BASE_URL}samples/phomopsis_leaf_spot.jpg` },
]

export default function LeafDiseaseScanner() {
  const { language, copy } = useLanguage()
  const scannerCopy = copy.leafScanner
  const t = (vi, en) => language === 'vi' ? vi : en

  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [errorState, setErrorState] = useState(null)
  const [badgeSource, setBadgeSource] = useState(null) // 'ai' | 'error'
  const [lastRequest, setLastRequest] = useState(null) // Blob/File to retry with
  const [manualNote, setManualNote] = useState('')

  const abortControllerRef = useRef(null)
  const isSlow = useSlowLoading(loading, 3000)

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Abort in-flight inference on unmount so stale responses are ignored
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024 || file.size === 0) {
      setPrediction(null)
      setImagePreview(null)
      setManualNote('')
      setLastRequest(null)
      setErrorState('Invalid file size')
      setBadgeSource('error')
      return
    }

    // Revoke previous URL if exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setPrediction(null)
    setManualNote('')
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
    setManualNote('')
    setErrorState(null)
    setBadgeSource(null)
    setLoading(true)

    try {
      const response = await fetch(sample.src)
      if (!response.ok) throw new Error('Sample unavailable')
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
    // Abort any previous in-flight request so stale responses are ignored
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await apiFetch('/api/predict_leaf', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
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
      if (err.name === 'AbortError') {
        // Stale / cancelled request — ignore
        return
      }
      console.error('Inference request failed:', err)
      setErrorState(err.message || 'Inference failed')
      setBadgeSource('error')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
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

  const unclear = prediction && ((prediction.review_reasons || []).some(reason =>
    ['low_model_score', 'similar_scores', 'low_image_contrast'].includes(reason)) || prediction.probability < 0.8)
  const errorLabel = errorState === 'Invalid file size' ? t('Tệp không hợp lệ', 'Invalid file') : scannerCopy.sourceOffline

  return (
    <div className="leaf-scanner-card">
      <div className="leaf-scanner-header">
        <span className="leaf-scanner-kicker">{scannerCopy.kicker}</span>
        <h2 className="leaf-scanner-title">{scannerCopy.title}</h2>
        <p className="leaf-scanner-desc">{scannerCopy.desc}</p>
        <p className="leaf-scanner-desc">{t('Model thử nghiệm với 5 nhóm lá. Kết quả cần người có chuyên môn đối chiếu; ảnh ngoài các nhóm này vẫn có thể bị nhận nhầm.', 'Experimental model covering five leaf classes. A specialist must review suggestions; images outside these classes may still be misclassified.')}</p>
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
              {errorLabel}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{errorState === 'Invalid file size' ? t('Chọn ảnh có dung lượng từ 1 byte đến 5 MB.', 'Choose an image between 1 byte and 5 MB.') : copy.common.aiUnavailable}</p>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="scanner-badge scanner-badge-error">
              {errorLabel}
            </span>
            {lastRequest && <button
              type="button"
              className="button button-secondary scanner-retry-btn"
              onClick={handleRetry}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>{copy.common.retry}</span>
            </button>}
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
                {t('Gợi ý cần kiểm tra', 'Suggestion requiring review')}
            </h3>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', display: 'block' }}>
                {t('Nhóm model đang nghiêng về — chưa phải chẩn đoán', 'Leading model class — not a diagnosis')}
              </span>
              <h2 className="scanner-disease-name" style={{ fontSize: '1.75rem', marginTop: '4px' }}>
                {getDiseaseLabel(prediction.disease)}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-gold)' }} />
              <span>
                <strong>{t('Điểm model (chưa hiệu chuẩn)', 'Model score (uncalibrated)')}:</strong> {(prediction.probability * 100).toFixed(1)}%
              </span>
            </div>

            <div className="scanner-remedy-box" role="status">
              <strong>{unclear ? t('Chưa đủ tin cậy để kết luận', 'Insufficient confidence to conclude') : t('Cần kiểm tra thủ công', 'Manual review required')}</strong>
              <p className="scanner-remedy-text">{t('Điểm này không phải độ chính xác của chẩn đoán. Chụp rõ cả hai mặt lá, đối chiếu triệu chứng ngoài vườn và nhờ cán bộ kỹ thuật kiểm tra trước khi xử lý.', 'This score is not diagnostic accuracy. Photograph both sides of the leaf, compare field symptoms and ask an agricultural specialist to review before treatment.')}</p>
              <label>{t('Ghi chú kiểm tra của bạn (chỉ giữ trên màn hình này)', 'Your review notes (kept only on this screen)')}
                <textarea rows={3} maxLength={1000} value={manualNote} onChange={event => setManualNote(event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8 }} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
