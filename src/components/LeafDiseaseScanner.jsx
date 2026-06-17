import { useState, useRef, useEffect } from 'react'
import { Camera, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export default function LeafDiseaseScanner() {
  const { language, copy } = useLanguage()
  const scannerCopy = copy.leafScanner

  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [errorState, setErrorState] = useState(null)
  const [badgeSource, setBadgeSource] = useState(null) // 'ai' | 'error'

  const canvasRef = useRef(null)

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Revoke previous URL if exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setPrediction(null)
    setErrorState(null)
    setBadgeSource(null)
    setLoading(true)

    const img = new Image()
    img.onload = () => {
      try {
        const canvas = canvasRef.current
        if (!canvas) {
          throw new Error('Canvas ref not available')
        }
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Could not get 2D canvas context')
        }

        // Stretch resize to exactly 224x224 to match the training pipeline
        ctx.drawImage(img, 0, 0, 224, 224)

        const imgData = ctx.getImageData(0, 0, 224, 224)
        const pixels = []

        // Extract RGB channels row-major (ignoring alpha channel)
        for (let i = 0; i < imgData.data.length; i += 4) {
          pixels.push(imgData.data[i])     // Red
          pixels.push(imgData.data[i + 1]) // Green
          pixels.push(imgData.data[i + 2]) // Blue
        }

        sendInferenceRequest(pixels)
      } catch (err) {
        console.error('Error preprocessing image:', err)
        setErrorState(err.message || 'Image processing failed')
        setBadgeSource('error')
        setLoading(false)
      }
    }
    img.onerror = () => {
      setErrorState(language === 'vi' ? 'Lỗi tải hình ảnh' : 'Error loading image')
      setBadgeSource('error')
      setLoading(false)
    }
    img.src = previewUrl
  }

  const sendInferenceRequest = async (pixels) => {
    try {
      const response = await fetch('/api/predict_leaf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pixels }),
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
            <span>{scannerCopy.analyzing}</span>
          </div>
        )}
      </div>

      {/* Hidden canvas for image resizing */}
      <canvas
        ref={canvasRef}
        width="224"
        height="224"
        style={{ display: 'none' }}
      />

      {/* Error state */}
      {errorState && (
        <div className="scanner-error-message" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertCircle size={20} />
            <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {language === 'vi' ? 'LỖI HỆ THỐNG / OFFLINE' : 'SYSTEM ERROR / OFFLINE'}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{errorState}</p>
          <div style={{ marginTop: '12px' }}>
            <span className="scanner-badge scanner-badge-error">
              {scannerCopy.sourceOffline}
            </span>
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
