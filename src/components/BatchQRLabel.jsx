import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'

export default function BatchQRLabel({ batchId, language, loading }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (loading || !batchId || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // QR URL formatting: `${window.location.origin}${import.meta.env.BASE_URL}#/unit/demo?batchId=<ID>`
    const baseUrl = import.meta.env.BASE_URL || '/'
    const qrUrl = `${window.location.origin}${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}#/unit/demo?batchId=${batchId}`

    QRCode.toCanvas(
      canvas,
      qrUrl,
      {
        width: 180,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1f4734', // Brand deep green
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) {
          console.error('Failed to generate QR Code:', error)
          return
        }

        // Draw centered logo (durian-logo.svg)
        const logo = new Image()
        logo.src = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}durian-logo.svg`
        logo.onload = () => {
          // Logo dimensions (36x36 for a 180x180 canvas, occupying exactly 4% of the QR area, well below 20%)
          const logoSize = 36
          const x = (canvas.width - logoSize) / 2
          const y = (canvas.height - logoSize) / 2

          // Draw a clean white background backing block for contrast
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.roundRect(x - 3, y - 3, logoSize + 6, logoSize + 6, 4)
          ctx.fill()

          // Draw the actual logo
          ctx.drawImage(logo, x, y, logoSize, logoSize)
        }
      }
    )
  }, [batchId, loading])

  const handlePrint = (e) => {
    e.preventDefault()
    window.print()
  }

  if (loading) {
    return <div className="qr-label-card-display skeleton" style={{ height: '240px' }} />
  }

  return (
    <article className="qr-label-card-display printable-qr-label" aria-label="Product QR label code">
      <div className="qr-image-wrapper" style={{ display: 'flex', justifyContent: 'center', margin: '0 auto' }}>
        <canvas ref={canvasRef} width="180" height="180" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
      </div>
      <div className="qr-label-text" style={{ marginTop: '12px', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-ink)' }}>
          {language === 'vi' ? 'Nhãn QR Sầu Riêng' : 'Durian QR Label'}
        </h4>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--color-ink-soft)', lineHeight: '1.4' }}>
          {language === 'vi'
            ? 'Quét bằng camera điện thoại để truy vết trên Blockchain'
            : 'Scan with phone camera to trace origin on the Blockchain'}
        </p>
        <code className="text-xs" style={{ display: 'inline-block', padding: '3px 8px', background: 'rgba(31,71,52,0.06)', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
          {batchId}
        </code>
      </div>
      
      <button
        onClick={handlePrint}
        className="button button-secondary no-print"
        style={{
          marginTop: '16px',
          width: '100%',
          minHeight: '36px',
          padding: '8px 16px',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
        type="button"
      >
        <Printer size={14} />
        <span>{language === 'vi' ? 'In nhãn dán' : 'Print label'}</span>
      </button>
    </article>
  )
}
