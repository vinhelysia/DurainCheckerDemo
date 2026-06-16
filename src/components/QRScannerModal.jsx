import { useState, useEffect, useRef } from 'react'
import { X, QrCode, ShieldCheck, Camera, Sparkles, AlertCircle, ArrowRight } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScannerModal({ isOpen, onClose, batches, onScanSuccess, language }) {
  const [scanState, setScanState] = useState('idle') // 'idle' | 'scanning' | 'success' | 'failed'
  const [scannedBatchId, setScannedBatchId] = useState('')
  const [hasCamera, setHasCamera] = useState(null) // null = checking, true = has camera + permission, false = no camera or denied
  const [manualInput, setManualInput] = useState('')
  const [manualError, setManualError] = useState('')

  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  
  const scannerId = 'qr-reader-preview-area'

  // Track prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleMotionChange)
    return () => mediaQuery.removeEventListener('change', handleMotionChange)
  }, [])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      const timer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    } else {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
        previousFocusRef.current = null
      }
    }
  }, [isOpen])

  // Key press listeners
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Camera initialization and lifecycle
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    let scannerInstance = null
    let isScanning = false

    const initScanner = async () => {
      try {
        setScanState('scanning')
        scannerInstance = new Html5Qrcode(scannerId)
        html5QrCodeRef.current = scannerInstance

        const successCallback = async (decodedText) => {
          let batchId = ''
          try {
            // Attempt to parse deep link format: ...?batchId=ID
            if (decodedText.includes('?')) {
              const urlParts = decodedText.split('?')
              const searchParams = new URLSearchParams(urlParts[1].split('#')[0])
              if (searchParams.has('batchId')) {
                batchId = searchParams.get('batchId')
              } else {
                // Check hash query params
                const hashParts = decodedText.split('#')
                if (hashParts.length > 1) {
                  const hashParams = new URLSearchParams(hashParts[1].split('?')[1] || '')
                  if (hashParams.has('batchId')) {
                    batchId = hashParams.get('batchId')
                  }
                }
              }
            }
          } catch (e) {
            console.warn('URL parsing error, using raw decoded text:', e)
          }

          if (!batchId) {
            // Tolerate a raw batch ID scanned directly
            batchId = decodedText.trim()
          }

          if (batchId && isMounted) {
            setScannedBatchId(batchId)
            setScanState('success')
            
            // Stop and clear immediately
            isScanning = false
            try {
              await scannerInstance.stop()
              scannerInstance.clear()
            } catch (err) {
              console.warn('Failed to stop scanner upon success:', err)
            }

            // Wait brief moment to show success feedback animation
            setTimeout(() => {
              if (isMounted) {
                onScanSuccess(batchId)
                onClose()
              }
            }, 800)
          }
        }

        const config = {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.65
            return { width: size, height: size }
          }
        }

        await scannerInstance.start(
          { facingMode: 'environment' },
          config,
          successCallback,
          () => {
            // Frame scan failure - suppress console spam
          }
        )

        isScanning = true
        if (isMounted) {
          setHasCamera(true)
        }
      } catch (err) {
        console.warn('Failed to start camera:', err)
        if (isMounted) {
          setHasCamera(false)
          setScanState('failed')
        }
      }
    }

    // Short delay to ensure target div is rendered in the DOM
    const timer = setTimeout(() => {
      initScanner()
    }, 150)

    return () => {
      isMounted = false
      clearTimeout(timer)
      
      const cleanupScanner = async () => {
        if (scannerInstance) {
          try {
            if (isScanning) {
              await scannerInstance.stop()
            }
          } catch (e) {
            console.warn('Error during scanner shutdown:', e)
          } finally {
            try {
              scannerInstance.clear()
            } catch (e) {
              console.warn('Error during scanner clear:', e)
            }
          }
        }
      }
      cleanupScanner()
      html5QrCodeRef.current = null
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = async () => {
    const scanner = html5QrCodeRef.current
    if (scanner) {
      try {
        await scanner.stop()
      } catch (e) {
        console.warn('Failed to stop scanner on manual close:', e)
      } finally {
        try {
          scanner.clear()
        } catch (e) {
          console.warn('Failed to clear scanner on manual close:', e)
        }
        html5QrCodeRef.current = null
      }
    }
    setScanState('idle')
    setScannedBatchId('')
    setManualInput('')
    setManualError('')
    onClose()
  }

  const handleManualVerify = (e) => {
    e.preventDefault()
    const cleanInput = manualInput.trim().toUpperCase()
    if (!cleanInput) {
      setManualError(language === 'vi' ? 'Vui lòng điền mã lô!' : 'Please enter a batch ID!')
      return
    }

    // Match against known batch IDs or allow anyway for sandbox
    const matched = batches.find(b => b.id.toUpperCase() === cleanInput)
    if (matched) {
      onScanSuccess(matched.id)
      handleClose()
    } else {
      // Allow any batch ID to be loaded to support dynamic/unregistered ones
      onScanSuccess(cleanInput)
      handleClose()
    }
  }

  const handleSelectSimulated = (batchId) => {
    setScanState('scanning')
    setScannedBatchId(batchId)

    setTimeout(() => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => html5QrCodeRef.current.clear())
        } catch (e) {}
      }
      setScanState('success')
      setTimeout(() => {
        onScanSuccess(batchId)
        handleClose()
      }, 800)
    }, 400)
  }

  return (
    <div className="scanner-modal-overlay" role="dialog" aria-modal="true" data-lenis-prevent>
      <div className="scanner-modal-card">
        {/* Header */}
        <div className="scanner-modal-header">
          <div className="flex items-center gap-2">
            <QrCode className="text-green-mid" size={20} />
            <h2 className="text-lg font-bold">
              {language === 'vi' ? 'Trình quét mã QR sầu riêng' : 'Durian QR Code Scanner'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="close-button"
            onClick={handleClose}
            aria-label="Close scanner"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="scanner-viewfinder-container">
          <div className={`scanner-viewfinder ${scanState}`}>
            {/* Viewfinder corner guides */}
            <div className="corner corner-tl" />
            <div className="corner corner-tr" />
            <div className="corner corner-bl" />
            <div className="corner corner-br" />

            {/* Laser scanning beam (disabled if prefersReducedMotion is true) */}
            {scanState === 'scanning' && !prefersReducedMotion && <div className="laser-beam" />}

            {/* Live camera stream container */}
            <div 
              id={scannerId} 
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
                display: hasCamera ? 'block' : 'none'
              }}
            />

            {/* Static overlays/feedbacks */}
            <div className="camera-feed-bg" style={{ zIndex: hasCamera ? 0 : 2 }}>
              {!hasCamera && scanState === 'scanning' && (
                <div className="feed-instruction">
                  <Camera size={36} className={`mb-2 opacity-60 ${!prefersReducedMotion ? 'animate-pulse' : ''}`} />
                  <p>{language === 'vi' ? 'Đang khởi chạy camera...' : 'Initializing device camera...'}</p>
                </div>
              )}
              {hasCamera && scanState === 'scanning' && (
                <div className="feed-instruction scanning-text" style={{ pointerEvents: 'none', background: 'transparent' }}>
                  {/* Keep text clean and transparent over the camera stream */}
                </div>
              )}
              {scanState === 'failed' && (
                <div className="feed-instruction text-red-400" style={{ padding: '20px' }}>
                  <AlertCircle size={36} className="mb-2 opacity-80" />
                  <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {language === 'vi' ? 'Không thể truy cập Camera' : 'Camera Access Failed'}
                  </p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                    {language === 'vi' 
                      ? 'Vui lòng kiểm tra quyền camera hoặc nhập mã bên dưới' 
                      : 'Please check browser permissions or type the batch ID below'}
                  </p>
                </div>
              )}
              {scanState === 'success' && (
                <div className="feed-instruction success-text text-green-mid" style={{ zIndex: 10 }}>
                  <ShieldCheck size={40} className="mb-2" />
                  <p className="font-bold">{language === 'vi' ? 'ĐÃ XÁC THỰC LÔ HÀNG' : 'BATCH VERIFIED'}</p>
                  <code style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{scannedBatchId}</code>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Input Panel */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(31,71,52,0.08)' }}>
          <form onSubmit={handleManualVerify} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="manual-batch-input" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-ink)' }}>
              {language === 'vi' ? 'Nhập mã lô hàng thủ công:' : 'Or enter batch ID manually:'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="manual-batch-input"
                type="text"
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value)
                  setManualError('')
                }}
                placeholder="Ví dụ: DRN-2026-TG-0115"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid rgba(31,71,52,0.2)',
                  fontSize: '0.85rem'
                }}
              />
              <button
                className="button button-primary"
                type="submit"
                style={{ minHeight: '38px', padding: '0 16px', fontSize: '0.85rem' }}
              >
                <span>{language === 'vi' ? 'Xác thực' : 'Verify'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
            {manualError && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0 }}>{manualError}</p>
            )}
          </form>
        </div>

        {/* Fallback Selection Panel */}
        <div className="scanner-labels-panel">
          <h3>
            {language === 'vi' ? 'Chọn nhanh lô hàng mẫu:' : 'Or select a demo batch to simulate:'}
          </h3>
          <div className="qr-labels-grid">
            {batches.map((batch) => (
              <button
                key={batch.id}
                type="button"
                disabled={scanState === 'success'}
                onClick={() => handleSelectSimulated(batch.id)}
                className={`qr-label-card risk-${batch.riskLevel || 'low'}`}
              >
                <div className="qr-mock-code">
                  <QrCode size={32} strokeWidth={1.2} />
                </div>
                <div className="qr-label-info">
                  <strong>{batch.id}</strong>
                  <span className="risk-indicator">
                    {language === 'vi'
                      ? (batch.riskLevel === 'low' ? 'Đạt chuẩn' : batch.riskLevel === 'medium' ? 'Cần khám' : 'Giữ lô')
                      : (batch.riskLevel === 'low' ? 'Export Ready' : batch.riskLevel === 'medium' ? 'Needs Review' : 'Hold Batch')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="scanner-modal-footer">
          <Sparkles size={14} className="text-gold" />
          <p className="text-xs italic opacity-85">
            {language === 'vi'
              ? 'Mã QR liên kết trực tiếp với Smart Contract trên blockchain'
              : 'QR code links directly to Smart Contract records on the blockchain'}
          </p>
        </div>
      </div>
    </div>
  )
}
