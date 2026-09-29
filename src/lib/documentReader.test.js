import { describe, expect, it, vi } from 'vitest'
import { DOCUMENT_LIMITS, OCR_MODEL_PATH, parseDocumentDate, parseDocumentText, readDocument, validateDocumentBytes } from './documentReader'
const { createWorker } = vi.hoisted(() => ({ createWorker: vi.fn() }))
vi.mock('tesseract.js', () => ({ createWorker }))

describe('document suggestions remain bounded and need review', () => {
  it('only suggests explicit source/date lines and preserves their excerpts', () => {
    const result = parseDocumentText('PHIẾU KIỂM NGHIỆM\nNguồn: HTX Kiểm thử QA\nNgày tài liệu: 27/09/2026\nCadmium: 0.2 ppm')
    expect(result).toMatchObject({ status: 'needs_review', source: 'HTX Kiểm thử QA', documentDate: '2026-09-27', sourceExcerpt: 'Nguồn: HTX Kiểm thử QA', dateExcerpt: 'Ngày tài liệu: 27/09/2026' })
    expect(result).not.toHaveProperty('cadmium')
    expect(parseDocumentText('PHÒNG LAB HTX QA\nHarvest date: 2026-09-27\nCertificate approved for export')).toMatchObject({ source: '', documentDate: '' })
  })

  it('refuses ambiguous dates, conflicting values, impossible dates and unsafe source markup', () => {
    for (const date of ['02/03/2026', '04/05/2026', '2026-02-29', '31/09/2026', '29/09/26']) expect(parseDocumentDate(date)).toBe('')
    expect(parseDocumentDate('29/02/2024')).toBe('2024-02-29')
    expect(parseDocumentDate('2026-09-27')).toBe('2026-09-27')
    expect(parseDocumentText('Source: Lab QA\nSource: Other lab\nDocument date: 2026-09-27\nReport date: 2026-09-28')).toMatchObject({ source: '', documentDate: '' })
    expect(parseDocumentText('Source: <script>alert(1)</script>\nDocument date: 2026-09-27').source).toBe('')
    expect(parseDocumentText('Source: Lab QA\nDocument date: 02/03/2026').documentDate).toBe('')
    expect(parseDocumentText('').issues).toContain('unreadable')
  })

  it('rejects oversized/mislabeled files and image dimensions before any OCR or model load', async () => {
    await expect(readDocument({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).rejects.toThrow('5 MB')
    await expect(readDocument({ type: 'text/html', size: 30 })).rejects.toThrow('JPG')
    expect(() => validateDocumentBytes(new TextEncoder().encode('<html>test</html>'), 'application/pdf')).toThrow('invalid_file')
    const png = new Uint8Array(24)
    png.set([137, 80, 78, 71, 13, 10, 26, 10])
    png.set(new TextEncoder().encode('IHDR'), 12)
    const view = new DataView(png.buffer)
    view.setUint32(16, 10_000); view.setUint32(20, 10_000)
    expect(() => validateDocumentBytes(png, 'image/png')).toThrow('image_too_large')
    view.setUint32(16, 800); view.setUint32(20, 600)
    expect(() => validateDocumentBytes(png, 'image/png')).not.toThrow()
    expect(parseDocumentText('x'.repeat(DOCUMENT_LIMITS.characters + 1)).text.length).toBe(DOCUMENT_LIMITS.characters)
  })

  it('rejects initialization errors, blocks repeated orphan initializers, and disposes a late worker', async () => {
    const png = new Uint8Array(24)
    png.set([137, 80, 78, 71, 13, 10, 26, 10]); png.set(new TextEncoder().encode('IHDR'), 12)
    const view = new DataView(png.buffer)
    view.setUint32(16, 800); view.setUint32(20, 600)
    const file = { type: 'image/png', size: png.length, arrayBuffer: async () => png.buffer }
    vi.stubGlobal('createImageBitmap', async () => ({ width: 800, height: 600, close: () => {} }))
    let finishInitialization
    const lateWorker = { terminate: vi.fn().mockResolvedValue(), recognize: vi.fn() }
    createWorker.mockImplementation((_languages, _mode, options) => {
      queueMicrotask(() => options.errorHandler('Initialization failed'))
      return new Promise(resolve => { finishInitialization = resolve })
    })
    try {
      await expect(readDocument(file)).rejects.toThrow('ocr_failed')
      await expect(readDocument(file)).rejects.toThrow('reader_busy')
      expect(createWorker).toHaveBeenCalledTimes(1)
      expect(createWorker).toHaveBeenCalledWith('vie+eng', 1, expect.objectContaining({ langPath: OCR_MODEL_PATH, gzip: true, workerBlobURL: false }))
      expect(OCR_MODEL_PATH).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/naptha\/tessdata@[a-f0-9]{40}\/4\.0\.0_best_int$/)
      finishInitialization(lateWorker)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(lateWorker.terminate).toHaveBeenCalledOnce()
      expect(lateWorker.recognize).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })
})
