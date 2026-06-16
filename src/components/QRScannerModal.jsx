import { useState, useEffect, useRef } from 'react'
import { X, QrCode, ShieldCheck, Camera, Sparkles } from 'lucide-react'

export default function QRScannerModal({ isOpen, onClose, batches, onScanSuccess, language }) {
  const [scanState, setScanState] = useState('idle') // 'idle' | 'scanning' | 'success'
  const [scannedBatchId, setScannedBatchId] = useState('')

  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

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

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setScanState('idle')
        setScannedBatchId('')
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleClose = () => {
    setScanState('idle')
    setScannedBatchId('')
    onClose()
  }

  const handleSimulateScan = (batchId) => {
    setScanState('scanning')
    setScannedBatchId(batchId)

    // Simulate scanning and decoding delay
    setTimeout(() => {
      setScanState('success')
      
      // Complete scan and return data
      setTimeout(() => {
        onScanSuccess(batchId)
        handleClose()
      }, 800)
    }, 1200)
  }

  return (
    <div className="scanner-modal-overlay" role="dialog" aria-modal="true">
      <div className="scanner-modal-card">
        {/* Header */}
        <div className="scanner-modal-header">
          <div className="flex items-center gap-2">
            <QrCode className="text-green-mid" size={20} />
            <h2 className="text-lg font-bold">
              {language === 'vi' ? 'Trình giả lập quét mã QR' : 'Interactive QR Scanner'}
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

            {/* Laser scanning beam */}
            {scanState === 'scanning' && <div className="laser-beam" />}

            {/* Video overlay / Static feedback */}
            <div className="camera-feed-bg">
              {scanState === 'idle' && (
                <div className="feed-instruction">
                  <Camera size={36} className="animate-pulse mb-2 opacity-60" />
                  <p>{language === 'vi' ? 'Chọn nhãn QR bên dưới để quét' : 'Select a QR label below to scan'}</p>
                </div>
              )}
              {scanState === 'scanning' && (
                <div className="feed-instruction scanning-text text-gold">
                  <p className="font-mono text-xs mb-1">DECODING CRYPTO HASH...</p>
                  <strong className="text-sm font-semibold">{scannedBatchId}</strong>
                </div>
              )}
              {scanState === 'success' && (
                <div className="feed-instruction success-text text-green-500">
                  <ShieldCheck size={40} className="mb-2" />
                  <p className="font-bold">{language === 'vi' ? 'ĐÃ XÁC THỰC SỔ CÁI' : 'LEDGER VERIFIED'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Panel / QR Labels */}
        <div className="scanner-labels-panel">
          <h3>
            {language === 'vi' ? 'Chọn nhãn sản phẩm để quét:' : 'Click to scan product QR label:'}
          </h3>
          <div className="qr-labels-grid">
            {batches.map((batch) => (
              <button
                key={batch.id}
                type="button"
                disabled={scanState !== 'idle'}
                onClick={() => handleSimulateScan(batch.id)}
                className={`qr-label-card risk-${batch.riskLevel || 'low'}`}
              >
                <div className="qr-mock-code">
                  <QrCode size={44} strokeWidth={1.2} />
                  <div className="qr-center-logo">
                    <img src="durian-logo.svg" alt="" width="10" height="10" />
                  </div>
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
