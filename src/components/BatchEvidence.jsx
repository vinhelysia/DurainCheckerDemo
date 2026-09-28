import { useState } from 'react'
import { FileText, Image, Download, Upload } from 'lucide-react'
import { cloudError, downloadEvidence, uploadEvidence } from '../lib/cloudClient'

export default function BatchEvidence({ batchId, records, more, onMore, onSaved, publicView, t }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [kind, setKind] = useState('all')
  const kindName = kind => kind === 'photo' ? t('Ảnh lô hàng', 'Batch photo') : kind === 'lab_report' ? t('Phiếu kiểm nghiệm', 'Lab document') : t('Tài liệu khác', 'Other document')
  const visibleRecords = kind === 'all' ? records : records.filter(record => record.kind === kind)

  async function upload(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true); setError(''); setNotice('')
    try {
      await uploadEvidence(batchId, data.get('file'), {
        kind: data.get('kind'), source: data.get('source'), document_date: data.get('document_date'),
      })
      form.reset()
      setNotice(t('Đã đính kèm bằng chứng.', 'Evidence attached.'))
      onSaved()
    } catch (err) { setError(`${cloudError(err)} ${t('Tải lại hồ sơ để kiểm tra trước khi thử lại.', 'Reload the record before retrying.')}`) }
    finally { setBusy(false) }
  }

  async function download(record) {
    setBusy(true); setError('')
    try { await downloadEvidence(record, publicView) }
    catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  return <section id="cloud-evidence" className="dashboard-card cloud-form cloud-evidence" aria-labelledby="evidence-title">
    <div className="cloud-evidence-heading"><div><p className="section-kicker">02 / {t('Bằng chứng', 'Evidence')}</p><h2 id="evidence-title">{t('Ảnh & tài liệu của lô', 'Batch photos & documents')}</h2></div><span>{records.length}{more ? '+' : ''} {t('tệp', 'files')}</span></div>
    <p className="cloud-muted">{t('Tệp do chủ hồ sơ cung cấp. Nguồn và ngày là thông tin khai báo; chưa được xác minh với đơn vị phát hành.', 'Files supplied by the record owner. Sources and dates are declared and have not been verified with the issuer.')}</p>
    {error && <p role="alert" className="lookup-notice">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {records.length > 0 && <div className="evidence-filters" role="group" aria-label={t('Lọc tệp đã tải', 'Filter loaded files')}>
      {['all', 'photo', 'lab_report', 'other'].map(value => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{value === 'all' ? t('Tất cả', 'All') : kindName(value)}</button>)}
    </div>}
    {!records.length ? <div className="cloud-empty"><FileText size={28} aria-hidden="true" /><p>{t('Chưa có bằng chứng đính kèm.', 'No evidence attached yet.')}</p><small>{t('Chưa thể đối chiếu hồ sơ với ảnh lô hoặc phiếu kiểm nghiệm.', 'The record cannot yet be compared with batch photos or lab documents.')}</small></div> : !visibleRecords.length ? <p className="cloud-muted" role="status">{t('Chưa có tệp thuộc loại này trong danh sách đã tải.', 'No files of this type in the loaded list.')}</p> :
      <ul className="evidence-list">{visibleRecords.map(record => <li key={record.id}>
        <span className="evidence-file-icon">{record.kind === 'photo' ? <Image size={22} aria-hidden="true" /> : <FileText size={22} aria-hidden="true" />}</span>
        <div><strong>{record.filename}</strong><p className="evidence-file-meta">{kindName(record.kind)} · {record.document_date}</p><small>{t('Nguồn khai báo', 'Declared source')}: {record.source}</small></div>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => download(record)} aria-label={`${t('Tải', 'Download')} ${record.filename}`}><Download size={16} aria-hidden="true" />{t('Tải tệp', 'Download')}</button>
      </li>)}</ul>}
    {more && <button className="button button-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await onMore() } finally { setBusy(false) } }}>{t('Xem thêm tài liệu', 'Load more documents')}</button>}
    {!publicView && <details className="cloud-disclosure"><summary><Upload size={18} aria-hidden="true" />{t('Đính kèm bằng chứng', 'Attach evidence')}</summary>
      <form className="cloud-form" onSubmit={upload}>
        <label>{t('Loại bằng chứng', 'Evidence type')}<select name="kind"><option value="photo">{kindName('photo')}</option><option value="lab_report">{kindName('lab_report')}</option><option value="other">{kindName('other')}</option></select></label>
        <label>{t('Người chụp / đơn vị phát hành (khai báo)', 'Photographer / issuing organization (declared)')}<input name="source" required maxLength={160} /></label>
        <label>{t('Ngày chụp / ngày tài liệu', 'Photo / document date')}<input type="date" name="document_date" required /></label>
        <label>{t('Tệp JPG, PNG hoặc PDF · tối đa 5 MB', 'JPG, PNG or PDF · up to 5 MB')}<input name="file" type="file" accept="image/jpeg,image/png,application/pdf" required /></label>
        <p className="cloud-muted">{t('Khi công khai hồ sơ, các tệp này cũng được chia sẻ. Che thông tin cá nhân trước khi tải lên. Tệp đã gắn vào hồ sơ không sửa hoặc xóa trong ứng dụng; thêm tệp mới để đính chính.', 'Publishing the record also shares these files. Redact personal information first. Attached files cannot be changed or deleted in the app; add a new file for a correction.')}</p>
        <button className="button button-primary" disabled={busy}>{busy ? t('Đang tải lên…', 'Uploading…') : t('Lưu bằng chứng', 'Save evidence')}</button>
      </form>
    </details>}
  </section>
}
