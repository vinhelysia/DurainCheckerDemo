import { validateEvidenceFile } from './cloudClient'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Classic workers and importScripts require raw assets, without Vite's module transforms.
const ocrWorkerUrl = `${import.meta.env.BASE_URL}ocr/tesseract-7.0.0-worker.min.js`
const ocrCoreUrl = `${import.meta.env.BASE_URL}ocr/tesseract-7.0.0-core-lstm.wasm.js`

export const DOCUMENT_LIMITS = { pages: 5, pixels: 20_000_000, characters: 50_000 }
// Both pretrained languages share a pinned upstream folder; use Tesseract's documented string API.
export const OCR_MODEL_PATH = 'https://cdn.jsdelivr.net/gh/naptha/tessdata@806cd9adc8c6e8abc11c782db1818c990576bebc/4.0.0_best_int'
// ponytail: one pending Tesseract initializer; reload a stalled boot, isolate bootstrap if startup cancellation is needed.
let initializationPending = false

function failure(code) { return Object.assign(new Error(code), { code }) }
function abortError() { return new DOMException('Document reading cancelled', 'AbortError') }
function checkAbort(signal) { if (signal?.aborted) throw abortError() }
function abortable(promise, signal) {
  if (!signal) return promise
  checkAbort(signal)
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortError())
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

function validDate(value) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function parseDocumentDate(value) {
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return validDate(raw) ? raw : ''
  const match = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!match) return ''
  const [, day, month, year] = match
  // Without a declared format, only a day above 12 is accepted as day/month/year.
  if (Number(day) <= 12 || Number(month) > 12) return ''
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return validDate(date) ? date : ''
}

export function parseDocumentText(input) {
  const text = String(input || '').slice(0, DOCUMENT_LIMITS.characters).replace(/\r/g, '').replace(/\p{Cc}/gu, character => '\n\t'.includes(character) ? character : '')
  const result = { status: 'needs_review', text, source: '', documentDate: '', sourceExcerpt: '', dateExcerpt: '', issues: [] }
  if ((text.match(/[\p{L}\p{N}]/gu) || []).length < 20) {
    result.issues.push('unreadable')
    return result
  }
  const sources = []
  const dates = []
  for (const line of text.split('\n')) {
    const normalized = line.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim()
    const sourceMatch = normalized.match(/^(?:nguon(?: khai bao)?|don vi phat hanh|phong (?:thi|thu) nghiem|source|issued by|issuing (?:organization|organisation)|laboratory|lab name)\s*[:：]\s*(.+)$/i)
    const dateMatch = normalized.match(/^(?:ngay(?: tai lieu| bao cao| phat hanh| cap)?|date|document date|report date|issue date|issued on)\s*[:：]\s*(.+)$/i)
    if (sourceMatch) {
      const value = line.slice(line.search(/[:：]/) + 1).trim()
      sources.push({ value: value.length <= 160 && !/[<>]/.test(value) ? value : '', excerpt: line.trim() })
    }
    if (dateMatch) dates.push({ value: parseDocumentDate(dateMatch[1]), excerpt: line.trim() })
  }
  const sourceValues = [...new Set(sources.map(item => item.value))]
  const dateValues = [...new Set(dates.map(item => item.value))]
  if (sourceValues.length === 1 && sourceValues[0]) {
    result.source = sourceValues[0]
    result.sourceExcerpt = sources[0].excerpt
  } else result.issues.push(sources.length ? 'source_ambiguous' : 'source_missing')
  if (dateValues.length === 1 && dateValues[0]) {
    result.documentDate = dateValues[0]
    result.dateExcerpt = dates[0].excerpt
  } else result.issues.push(dates.length ? 'date_ambiguous' : 'date_missing')
  return result
}

export function validateDocumentBytes(bytes, type) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (type === 'application/pdf') {
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw failure('invalid_file')
    return
  }
  let width = 0
  let height = 0
  if (type === 'image/png') {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    if (bytes.length < 24 || !signature.every((byte, index) => bytes[index] === byte) || new TextDecoder().decode(bytes.subarray(12, 16)) !== 'IHDR') throw failure('invalid_file')
    width = data.getUint32(16)
    height = data.getUint32(20)
  } else if (type === 'image/jpeg') {
    if (bytes[0] !== 255 || bytes[1] !== 216) throw failure('invalid_file')
    let offset = 2
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 255) throw failure('invalid_file')
      while (bytes[offset] === 255) offset++
      const marker = bytes[offset++]
      if (marker === 217 || marker === 218) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      if (offset + 2 > bytes.length) throw failure('invalid_file')
      const length = data.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) throw failure('invalid_file')
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 7) throw failure('invalid_file')
        height = data.getUint16(offset + 3)
        width = data.getUint16(offset + 5)
        break
      }
      offset += length
    }
  } else throw failure('invalid_file')
  if (!width || !height) throw failure('invalid_file')
  if (width * height > DOCUMENT_LIMITS.pixels) throw failure('image_too_large')
}

async function readPdf(bytes, { signal, onProgress }) {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
  checkAbort(signal)
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, enableXfa: false, useWorkerFetch: false, useWasm: false, stopAtErrors: true, maxImageSize: DOCUMENT_LIMITS.pixels })
  const cancel = () => { task.destroy().catch(() => {}) }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    const pdf = await abortable(task.promise, signal)
    if (pdf.numPages > DOCUMENT_LIMITS.pages) throw failure('pdf_too_long')
    let text = ''
    let scannedPages = 0
    for (let index = 1; index <= pdf.numPages; index++) {
      checkAbort(signal)
      const page = await abortable(pdf.getPage(index), signal)
      try {
        const content = await abortable(page.getTextContent(), signal)
        let pageText = ''
        for (const item of content.items) {
          if (typeof item.str === 'string') pageText += item.str + (item.hasEOL ? '\n' : ' ')
          if (text.length + pageText.length > DOCUMENT_LIMITS.characters) throw failure('text_too_long')
        }
        if (!pageText.trim()) scannedPages++
        text += pageText + '\n'
        onProgress?.(index / pdf.numPages)
      } finally { page.cleanup() }
    }
    return { ...parseDocumentText(text), method: 'pdf_text', pages: pdf.numPages, scannedPages }
  } finally {
    signal?.removeEventListener('abort', cancel)
    await task.destroy()
  }
}

async function readImage(file, { signal, onProgress }) {
  if (initializationPending) throw failure('reader_busy')
  await abortable(createImageBitmap(file).then(bitmap => {
    try {
      if (!bitmap.width || !bitmap.height) throw failure('invalid_file')
      if (bitmap.width * bitmap.height > DOCUMENT_LIMITS.pixels) throw failure('image_too_large')
    } finally { bitmap.close() }
  }), signal)
  checkAbort(signal)
  const { createWorker } = await import('tesseract.js')
  checkAbort(signal)
  let worker
  let abandoned = false
  const cancel = () => { worker?.terminate() }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    if (initializationPending) throw failure('reader_busy')
    let rejectInitialization
    const initializationError = new Promise((_resolve, reject) => { rejectInitialization = reject })
    // ponytail: portable LSTM core; bundle SIMD variants if OCR profiling warrants them.
    initializationPending = true
    const initializing = createWorker('vie+eng', 1, {
      workerPath: ocrWorkerUrl, corePath: ocrCoreUrl, workerBlobURL: false, cacheMethod: 'none',
      langPath: OCR_MODEL_PATH, gzip: true,
      logger: event => { if (event.status === 'recognizing text') onProgress?.(event.progress) },
      errorHandler: () => rejectInitialization(failure('ocr_failed')),
    }).then(created => {
      initializationPending = false
      if (abandoned || signal?.aborted) { created.terminate(); throw abortError() }
      worker = created
      return worker
    }, error => {
      initializationPending = false
      throw error
    })
    await abortable(Promise.race([initializing, initializationError]), signal)
    const { data } = await abortable(worker.recognize(file), signal)
    checkAbort(signal)
    return { ...parseDocumentText(data.text), method: 'image_ocr', pages: 1, scannedPages: 0 }
  } finally {
    abandoned = true
    signal?.removeEventListener('abort', cancel)
    await worker?.terminate()
  }
}

export async function readDocument(file, options = {}) {
  validateEvidenceFile(file)
  checkAbort(options.signal)
  const bytes = new Uint8Array(await abortable(file.arrayBuffer(), options.signal))
  validateDocumentBytes(bytes, file.type)
  return file.type === 'application/pdf' ? readPdf(bytes, options) : readImage(file, options)
}
