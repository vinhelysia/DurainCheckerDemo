import { useEffect, useId, useRef, useState } from 'react'
import { FileSearch, SquarePen } from 'lucide-react'
import { readDocument } from '../lib/documentReader'
import '../document-assistant.css'

export default function DocumentAssistant({ file, kind, t, disabled, onApply }) {
  const id = useId()
  const request = useRef(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [source, setSource] = useState('')
  const [date, setDate] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => { request.current?.abort(); request.current = null }, [])

  async function read() {
    if (!file || busy || disabled) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError(''); setResult(null); setProgress(0); setConfirmed(false); setApplied(false)
    const timeout = setTimeout(() => controller.abort('timeout'), 60_000)
    try {
      const extracted = await readDocument(file, { signal: controller.signal, onProgress: value => { if (!controller.signal.aborted) setProgress(value) } })
      if (!controller.signal.aborted) { setResult(extracted); setSource(extracted.source); setDate(extracted.documentDate) }
    } catch (err) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return
      const messages = {
        invalid_file: t('Tệp không đúng định dạng hoặc không đọc được. Hãy nhập thông tin thủ công.', 'The file is invalid or unreadable. Enter the details manually.'),
        image_too_large: t('Ảnh vượt 20 triệu pixel. Dùng ảnh nhỏ hơn hoặc nhập thủ công.', 'The image exceeds 20 million pixels. Use a smaller image or enter details manually.'),
        pdf_too_long: t('PDF vượt 5 trang. Trình đọc này chỉ hỗ trợ tối đa 5 trang; hãy nhập thủ công.', 'This reader supports PDFs of up to 5 pages. Enter details manually for this document.'),
        text_too_long: t('Văn bản quá dài để đọc trong giới hạn hiện tại. Hãy nhập thủ công.', 'The text exceeds this reader’s limit. Enter the details manually.'),
        reader_busy: t('Trình đọc còn khởi tạo. Thử lại sau hoặc nhập thủ công; nếu vẫn không được, tải lại trang.', 'The reader is still initializing. Try later or enter details manually; reload the page if it remains unavailable.'),
      }
      setError(controller.signal.reason === 'timeout' ? t('Đã dừng sau 60 giây. Hãy dùng tệp nhỏ hơn hoặc nhập thủ công.', 'Reading stopped after 60 seconds. Use a smaller file or enter details manually.') : messages[err.code] || t('Không đọc được tài liệu. Có thể tệp bị lỗi, khóa mật khẩu hoặc model chưa tải được. Hãy nhập thủ công.', 'The document could not be read. It may be damaged, password-protected, or the model could not load. Enter the details manually.'))
    } finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setBusy(false) } }
  }

  function cancel() { request.current?.abort(); setBusy(false); setProgress(0) }
  function apply() {
    if (!confirmed || disabled || busy || (!source.trim() && !date)) return
    onApply({ source: source.trim(), document_date: date })
    setApplied(true)
  }

  return <section className="document-assistant" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <div className="document-assistant-heading"><FileSearch size={20} aria-hidden="true" /><div><h3 id={`${id}-title`}>{t('Trợ lý đọc tài liệu', 'Document reading assistant')}</h3><p>{t('Gợi ý để bạn kiểm tra và nhập nhanh hơn.', 'Suggestions for you to review and enter faster.')}</p></div></div>
    <p className="document-assistant-privacy">{t('Lần đầu cần mạng để tải model OCR; tệp được xử lý trên thiết bị. Nút đọc này không upload tệp hoặc gửi nội dung tài liệu đi.', 'The first image read needs a connection to download the OCR model; your file is processed on this device. This reading button does not upload the file or send document content.')}</p>
    <p className="document-assistant-limit">{t('Tối đa 5 MB, PDF 5 trang, ảnh 20 triệu pixel. PDF scan chưa hỗ trợ OCR: nhập thông tin thủ công. Kết quả không xác thực đơn vị phát hành hoặc điều kiện xuất khẩu.', 'Up to 5 MB, 5 PDF pages, or 20 million image pixels. Scanned PDFs do not support OCR yet: enter details manually. Results do not verify the issuer or export eligibility.')}</p>
    {kind === 'photo' && <p className="document-assistant-limit">{t('Ảnh lô hàng không được tự đọc. Chỉ bấm nếu ảnh có chữ cần trích xuất; trình đọc này không đánh giá bệnh hoặc chất lượng quả.', 'Batch photos are not read automatically. Only click if the image contains text to extract; this reader does not assess disease or fruit quality.')}</p>}
    <div className="document-assistant-actions"><button type="button" className="button button-secondary" disabled={!file || busy || disabled} onClick={read}><FileSearch size={16} aria-hidden="true" />{t('Đọc tài liệu đã chọn', 'Read selected document')}</button>{busy && <button type="button" className="button button-secondary" onClick={cancel}>{t('Dừng đọc', 'Stop reading')}</button>}</div>
    {!file && <p className="document-assistant-limit">{t('Chọn một tệp ở trên để bắt đầu.', 'Choose a file above to begin.')}</p>}
    {busy && <p className="document-assistant-status" role="status">{progress ? `${t('Đang đọc', 'Reading')} ${Math.round(progress * 100)}%` : t('Đang chuẩn bị trình đọc và model…', 'Preparing the reader and model…')}</p>}
    {error && <p className="document-assistant-error" role="alert">{error}</p>}
    {result && <div className="document-assistant-review">
      <p className="document-assistant-review-label"><SquarePen size={16} aria-hidden="true" />{t('Cần bạn kiểm tra', 'Needs your review')}</p>
      {result.scannedPages > 0 && <p className="document-assistant-warning" role="status">{t('Có trang PDF không có lớp chữ đọc được. Nội dung trong ảnh hoặc bản scan chưa được trích xuất; hãy đối chiếu và nhập thủ công.', 'Some PDF pages have no readable text layer. Image or scanned content was not extracted; review the document and enter details manually.')}</p>}
      {result.issues.includes('unreadable') && <p className="document-assistant-warning" role="status">{t('Không có đủ chữ đọc được để đưa ra gợi ý. Đây không phải kết quả xác minh; hãy nhập thông tin thủ công.', 'There is not enough readable text to suggest fields. This is not a verification result; enter the details manually.')}</p>}
      {result.issues.some(issue => issue.startsWith('source_')) && <p className="document-assistant-limit">{t('Không xác định được một dòng nguồn/đơn vị phát hành rõ ràng. Nhập nguồn thủ công.', 'No single explicit source or issuer line was found. Enter the source manually.')}</p>}
      {result.issues.some(issue => issue.startsWith('date_')) && <p className="document-assistant-limit">{t('Ngày bị thiếu, mâu thuẫn hoặc có thể hiểu nhiều cách (ví dụ 03/04). Trình đọc không đoán ngày; hãy nhập thủ công.', 'The date is missing, conflicting, or ambiguous (for example 03/04). The reader does not guess dates; enter it manually.')}</p>}
      {result.text && <details className="document-assistant-extracted"><summary>{t('Xem chữ đã trích xuất để đối chiếu', 'Review extracted text')}</summary><pre>{result.text}</pre></details>}
      <label htmlFor={`${id}-source`}>{t('Nguồn gợi ý — có thể sửa', 'Suggested source — editable')}<input id={`${id}-source`} value={source} maxLength={160} onChange={event => { setSource(event.target.value); setConfirmed(false); setApplied(false) }} /></label>
      {result.sourceExcerpt && <p className="document-assistant-excerpt">{t('Dòng đối chiếu', 'Reference line')}: {result.sourceExcerpt}</p>}
      <label htmlFor={`${id}-date`}>{t('Ngày gợi ý — có thể sửa', 'Suggested date — editable')}<input id={`${id}-date`} type="date" value={date} onChange={event => { setDate(event.target.value); setConfirmed(false); setApplied(false) }} /></label>
      {result.dateExcerpt && <p className="document-assistant-excerpt">{t('Dòng đối chiếu', 'Reference line')}: {result.dateExcerpt}</p>}
      <label className="document-assistant-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>{t('Tôi đã đối chiếu nguồn và ngày với tài liệu, và chịu trách nhiệm về thông tin khai báo.', 'I checked the source and date against the document and take responsibility for the declared details.')}</span></label>
      <button type="button" className="button button-secondary" disabled={!confirmed || disabled || busy || (!source.trim() && !date)} onClick={apply}>{t('Áp dụng thông tin đã kiểm tra', 'Apply reviewed details')}</button>
      <p className="document-assistant-limit">{t('Chỉ cập nhật các trường không trống trong form. Tệp chỉ được upload khi bạn bấm “Lưu bằng chứng”.', 'Only nonempty fields in the form are updated. The file is uploaded only when you click “Save evidence”.')}</p>
      {applied && <p className="document-assistant-status" role="status">{t('Đã áp dụng vào form; chưa upload hoặc lưu bằng chứng.', 'Applied to the form; no evidence was uploaded or saved.')}</p>}
    </div>}
  </section>
}
