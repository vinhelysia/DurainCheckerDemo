import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Circle, ClipboardList, FileUp, LockKeyhole, LogIn, QrCode, Sprout } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import LanguageSwitch from './LanguageSwitch'
import { cloudRequest, cloudError, completeCloudSignIn, googleLoginEnabled, signInWithGoogle, supabase } from '../lib/cloudClient'
import { API_BASE_URL } from '../lib/api'
import BatchQRLabel from './BatchQRLabel'
import BatchEvidence from './BatchEvidence'

const exampleBatch = { id: 'example', code: 'MAU-2026-01', farm: 'Vườn minh họa', province: 'Lâm Đồng', harvest_date: '2026-09-27', variety: 'Ri6', weight_kg: 850, is_public: false }

function BatchFields({ batch = {}, t }) {
  return <>
    <label>{t('Tên vườn / hợp tác xã', 'Farm / cooperative')}<input name="farm" required maxLength={160} defaultValue={batch.farm} /></label>
    <label>{t('Tỉnh / vùng', 'Province / region')}<input name="province" required maxLength={160} defaultValue={batch.province} /></label>
    <div className="cloud-field-pair">
      <label>{t('Giống sầu riêng', 'Durian variety')}<input name="variety" required maxLength={100} placeholder="Ri6, Monthong…" defaultValue={batch.variety} /></label>
      <label>{t('Khối lượng (kg)', 'Weight (kg)')}<input name="weight_kg" type="number" min="0.01" max="1000000" step="0.01" required defaultValue={batch.weight_kg} /></label>
    </div>
    <label>{t('Ngày thu hoạch', 'Harvest date')}<input name="harvest_date" type="date" required defaultValue={batch.harvest_date} /></label>
  </>
}

function SignIn({ t }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retryAt, setRetryAt] = useState(() => {
    try { return Number(sessionStorage.getItem('durian-email-retry')) || 0 } catch { return 0 }
  })
  const [now, setNow] = useState(Date.now)
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000))
  useEffect(() => {
    if (!remaining) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [remaining])
  function cooldown(seconds) {
    const until = Date.now() + seconds * 1000
    setNow(Date.now()); setRetryAt(until)
    try { sessionStorage.setItem('durian-email-retry', String(until)) } catch { /* In-memory cooldown still works. */ }
  }

  async function submit(event) {
    event.preventDefault()
    if (busy || remaining) return
    setBusy(true)
    setError('')
    try {
      const result = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}?auth=callback` },
      })
      if (result.error) throw result.error
      setSent(true)
      cooldown(60)
    } catch (err) {
      if (err.code === 'over_email_send_rate_limit') cooldown(3600)
      else if (err.status === 429) cooldown(60)
      setError(cloudError(err))
    }
    finally { setBusy(false) }
  }

  async function googleSignIn() {
    if (busy) return
    setBusy(true); setError('')
    try { await signInWithGoogle() }
    catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  return <section className="cloud-signin" aria-labelledby="cloud-signin-title" aria-busy={busy}>
    <div className="cloud-auth-toolbar">
      <a className="cloud-auth-back" href="#/"><ArrowLeft size={16} aria-hidden="true" />{t('Trang chủ', 'Home')}</a>
      <LanguageSwitch />
    </div>
    <div className="cloud-auth-content">
      <a className="cloud-auth-brand" href="#/" aria-label="DurianTrust">
        <img src={`${import.meta.env.BASE_URL}durian-logo.svg`} alt="" width="40" height="40" />
        <strong>DurianTrust</strong>
      </a>
      <div className="cloud-auth-heading">
        <h1 id="cloud-signin-title">{t('Chào mừng bạn', 'Welcome to your workspace')}</h1>
        <p>{t('Quản lý hồ sơ lô hàng, tài liệu và lịch sử trong một nơi.', 'Keep batch records, documents and history together in one place.')}</p>
      </div>
    {googleLoginEnabled && <div className="cloud-google-entry"><button type="button" className="button button-primary" disabled={busy} onClick={googleSignIn}><LogIn size={20} aria-hidden="true" />{busy ? t('Đang xử lý…', 'Working…') : t('Tiếp tục với Google', 'Continue with Google')}<ArrowRight size={18} aria-hidden="true" /></button><p>{t('Lần đầu đăng nhập sẽ tạo tài khoản. Không cần mật khẩu riêng.', 'Your first sign-in creates an account. No separate password needed.')}</p></div>}
    {error && <p className="cloud-auth-message cloud-auth-error" role="alert">{error}</p>}
    <details className="cloud-email-entry" open={!googleLoginEnabled || undefined}>
      <summary>{t('Đăng nhập bằng liên kết email', 'Sign in with an email link')}</summary>
      <form className="cloud-form" onSubmit={submit}>
        <p className="cloud-muted">{googleLoginEnabled ? t('Hiện chỉ hỗ trợ email thành viên project. Nếu bạn mới bắt đầu, hãy dùng Google.', 'Currently available to project members only. New users should use Google.') : t('Hiện chỉ hỗ trợ email thành viên project. Đăng nhập cho người dùng bên ngoài chưa được bật.', 'Currently available to project members only. External sign-in is not enabled yet.')}</p>
        <label>{t('Địa chỉ email', 'Email address')}<input type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} disabled={sent || busy} onChange={e => setEmail(e.target.value)} /></label>
        {sent && <p className="cloud-auth-message" role="status">{t('Đã yêu cầu gửi link đến', 'Link requested for')} <strong>{email.trim()}</strong>. {t('Kiểm tra hộp thư và spam, rồi mở link bằng chính trình duyệt này.', 'Check your inbox and spam, then open the link in this same browser.')}</p>}
        {remaining > 0 && <p className="cloud-muted">{t('Có thể thử gửi lại sau', 'Try requesting again in')} {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}. {t('Quota máy chủ có thể cần chờ lâu hơn.', 'The server quota may take longer to reset.')}</p>}
        <button className="button button-secondary" disabled={busy || sent || remaining > 0}>{busy ? t('Đang xử lý…', 'Working…') : t('Gửi link đăng nhập', 'Send sign-in link')}</button>
        {sent && <button type="button" className="button button-secondary" disabled={busy} onClick={() => setSent(false)}>{t('Đổi email / gửi lại', 'Change email / resend')}</button>}
      </form>
    </details>
    <p className="cloud-auth-privacy"><LockKeyhole size={15} aria-hidden="true" /><span>{t('Hồ sơ mới mặc định riêng tư. Bạn quyết định khi nào chia sẻ cho bên mua.', 'New records are private by default. You decide when to share them with a buyer.')}</span></p>
    <a className="cloud-auth-sample" href="#/records/example">{t('Xem hồ sơ mẫu trước khi bắt đầu', 'Explore a sample record first')}<ArrowRight size={16} aria-hidden="true" /></a>
    </div>
    <footer className="cloud-auth-footer"><span>{t('DurianTrust · Bản thử nghiệm', 'DurianTrust · Prototype')}</span><a href="#/intro/problem">{t('Về dự án', 'About the project')}</a></footer>
  </section>
}

function BatchDetails({ id, publicView, t, language, example = false, onChange }) {
  const [batch, setBatch] = useState(null)
  const [events, setEvents] = useState([])
  const [more, setMore] = useState(false)
  const [evidence, setEvidence] = useState([])
  const [moreEvidence, setMoreEvidence] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const path = `/batches/${encodeURIComponent(id)}`

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      setBatch(null)
      setEvents([])
      setEvidence([])
      try {
        const [record, history, files] = example ? [exampleBatch, [], []] : await Promise.all([
          cloudRequest(path, { signal: controller.signal }, publicView),
          cloudRequest(`${path}/events`, { signal: controller.signal }, publicView),
          cloudRequest(`${path}/evidence`, { signal: controller.signal }, publicView),
        ])
        if (!controller.signal.aborted) {
          setBatch(record)
          setEvents(history)
          setMore(history.length === 50)
          setEvidence(files)
          setMoreEvidence(files.length === 50)
        }
      } catch (err) { if (!controller.signal.aborted) setError(cloudError(err)) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [path, publicView, revision, example])

  async function saveDetails(event) {
    event.preventDefault()
    setBusy(true); setError('')
    const data = Object.fromEntries(new FormData(event.currentTarget))
    data.weight_kg = Number(data.weight_kg)
    try {
      const updated = await cloudRequest(`${path}/details`, { method: 'PATCH', body: JSON.stringify(data) })
      setBatch(updated)
      onChange?.(updated)
      setEditing(false)
      setNotice(t('Đã cập nhật thông tin khai báo.', 'Declared details updated.'))
    } catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  async function loadMoreEvidence() {
    setBusy(true); setError('')
    try {
      const rows = await cloudRequest(`${path}/evidence?offset=${evidence.length}`, {}, publicView)
      setEvidence(previous => [...previous, ...rows]); setMoreEvidence(rows.length === 50)
    } catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  async function changeVisibility() {
    setBusy(true)
    setError('')
    try {
      const updated = await cloudRequest(path, { method: 'PATCH', body: JSON.stringify({ is_public: !batch.is_public }) })
      setBatch(updated)
      onChange?.(updated)
    } catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  async function append(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    data.cadmium_ppm = data.cadmium_ppm === '' ? null : Number(data.cadmium_ppm)
    data.threshold_ppm = data.threshold_ppm === '' ? null : Number(data.threshold_ppm)
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await cloudRequest(`${path}/events`, { method: 'POST', body: JSON.stringify(data) })
      form.reset()
      setNotice(t('Đã lưu mốc vào cloud.', 'Event saved to cloud.'))
      setRevision(value => value + 1)
    } catch (err) { setError(`${cloudError(err)} ${t('Tải lại lịch sử trước khi thử lưu lại.', 'Reload history before submitting again.')}`) }
    finally { setBusy(false) }
  }

  async function loadMore() {
    setBusy(true)
    setError('')
    try {
      const rows = await cloudRequest(`${path}/events?offset=${events.length}`, {}, publicView)
      setEvents(previous => [...previous, ...rows])
      setMore(rows.length === 50)
    } catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/cloud?batchId=${encodeURIComponent(id)}`
  const checks = batch ? [
    [Boolean(batch.variety && batch.weight_kg > 0), t('Thông tin lô và khối lượng', 'Batch details and weight')],
    [evidence.length > 0, t('Bằng chứng đính kèm', 'Attached evidence')],
    [events.length > 0, t('Mốc hành trình', 'Journey events')],
  ] : []
  return <div className="cloud-detail">
    {error && <p className="lookup-notice" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">{t('Đang tải hồ sơ… Lần đầu có thể cần chờ máy chủ khởi động.', 'Loading… The server may need time to wake up on the first request.')}</p>}
    {!example && <button type="button" className="button button-secondary cloud-reload" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}>{t('Tải lại hồ sơ', 'Reload record')}</button>}
    {!loading && batch && <>
      <article className="dashboard-card cloud-form">
        <div className="cloud-record-heading"><div><p className="section-kicker">01 / {t('Hồ sơ lô', 'Batch record')}</p><h2>{batch.code}</h2></div><span className="cloud-status">{example ? t('Dữ liệu mẫu', 'Sample data') : batch.is_public ? t('Đang công khai', 'Public') : t('Riêng tư', 'Private')}</span></div>
        <dl className="cloud-facts">
          {[[t('Vườn / HTX', 'Farm'), batch.farm], [t('Tỉnh / vùng', 'Region'), batch.province], [t('Giống', 'Variety'), batch.variety || '—'], [t('Khối lượng', 'Weight'), batch.weight_kg ? `${Number(batch.weight_kg).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB')} kg` : '—'], [t('Thu hoạch', 'Harvested'), batch.harvest_date]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <p className="cloud-muted">{t('Thông tin hiện tại do chủ hồ sơ khai báo và có thể cập nhật. Chưa xác minh thực địa, phiếu lab hoặc quyền sở hữu hàng hóa.', 'Current details are declared by the owner and may be updated. Physical origin, lab documents and ownership of goods have not been verified.')}</p>
        {!publicView && <><button className="button button-secondary" disabled={busy} onClick={() => setEditing(!editing)}>{editing ? t('Hủy chỉnh sửa', 'Cancel editing') : t('Sửa thông tin lô', 'Edit batch details')}</button>
          {editing && <form className="cloud-form" onSubmit={saveDetails}><BatchFields batch={batch} t={t} /><button className="button button-primary" disabled={busy}>{t('Lưu thông tin', 'Save details')}</button></form>}
        </>}
        <div className="cloud-checklist"><h3>{t('Mức đầy đủ của hồ sơ', 'Record completeness')}</h3><ul>{checks.map(([done, label]) => <li key={label}>{done ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}<span>{label}</span><small>{done ? t('Đã có', 'Present') : t('Còn thiếu', 'Missing')}</small></li>)}</ul><p>{t('Chỉ kiểm tra có thông tin; không đánh giá độ thật, chất lượng hoặc điều kiện xuất khẩu.', 'Checks presence only, not authenticity, quality or export eligibility.')}</p></div>
      </article>
      <BatchEvidence batchId={id} records={evidence} more={moreEvidence} onMore={loadMoreEvidence} onSaved={() => { setNotice(t('Đã đính kèm bằng chứng.', 'Evidence attached.')); setRevision(v => v + 1) }} publicView={publicView} t={t} />
      <section className="dashboard-card cloud-form">
        <p className="section-kicker">03 / {t('Hành trình', 'Journey')}</p>
        <h2>{t('Lịch sử ghi nhận', 'Recorded history')}</h2>
        {!events.length && <p>{t('Chưa có mốc nào.', 'No events yet.')}</p>}
        <ol className="cloud-events">{events.map(item => <li key={item.id}>
          <h3>{item.stage}</h3><p>{item.occurred_on} · {item.location}</p>
          {item.notes && <p>{item.notes}</p>}
          {item.cadmium_ppm != null && <p>{t('Cadimi đã nhập', 'Entered cadmium')}: {item.cadmium_ppm} ppm · {t('Ngưỡng đối chiếu đã nhập', 'Entered reference threshold')}: {item.threshold_ppm} ppm</p>}
          <small>{t('Ghi lúc', 'Recorded at')}: {new Date(item.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB')}</small>
        </li>)}</ol>
        {more && <button className="button button-secondary" disabled={busy} onClick={loadMore}>{t('Xem thêm', 'Load more')}</button>}
      </section>
      {!publicView && <form className="dashboard-card cloud-form" onSubmit={append}>
        <h2>{t('Ghi nhận một mốc mới', 'Record a new event')}</h2>
        <p>{t('Mốc đã lưu không sửa hoặc xóa được trong ứng dụng. Để đính chính, thêm mốc mới.', 'Saved events cannot be edited or deleted in the app. Add a new event to record a correction.')}</p>
        <label>{t('Tên mốc', 'Stage')}<input name="stage" required maxLength={160} list="batch-stages" /><datalist id="batch-stages">{['Thu hoạch', 'Phân loại', 'Gửi mẫu kiểm nghiệm', 'Đóng gói', 'Đề nghị bàn giao', 'Ghi nhận giao hàng'].map(stage => <option key={stage} value={stage} />)}</datalist></label>
        <p className="cloud-muted">{t('Mốc giao hàng là ghi nhận một phía, chưa phải xác nhận của bên nhận.', 'A delivery event is a one-sided statement, not a recipient confirmation.')}</p>
        <label>{t('Địa điểm', 'Location')}<input name="location" required maxLength={160} /></label>
        <label>{t('Ngày diễn ra', 'Event date')}<input name="occurred_on" type="date" required /></label>
        <label>{t('Ghi chú', 'Notes')}<textarea name="notes" maxLength={2000} rows={3} /></label>
        <fieldset><legend>{t('Số đo tùy chọn — nhập đủ cả hai trường', 'Optional measurement — fill both fields')}</legend>
          <label>{t('Cadimi đã nhập (ppm)', 'Entered cadmium (ppm)')}<input name="cadmium_ppm" type="number" step="0.0001" min="0" max="100" /></label>
          <label>{t('Ngưỡng đối chiếu (ppm)', 'Reference threshold (ppm)')}<input name="threshold_ppm" type="number" step="0.0001" min="0.0001" max="100" /></label>
        </fieldset>
        <button className="button button-primary" disabled={busy || loading}>{busy ? t('Đang lưu…', 'Saving…') : t('Lưu mốc vào cloud', 'Save event to cloud')}</button>
      </form>}
      {!example && <section className="dashboard-card cloud-form">
        <p className="section-kicker">04 / {t('Chia sẻ', 'Share')}</p><h2>{t('Hồ sơ cho bên mua', 'Buyer record')}</h2>
        {!publicView && <><p>{t('Công khai sẽ cho phép mọi người đọc toàn bộ thông tin, lịch sử và tải bằng chứng. Kiểm tra và che thông tin cá nhân trong tệp trước khi chia sẻ.', 'Publishing lets anyone read the details, history and download evidence. Review and redact personal information before sharing.')}</p><button className="button button-primary" disabled={busy} onClick={changeVisibility}>{batch.is_public ? t('Chuyển về riêng tư', 'Make private') : t('Công khai hồ sơ & bằng chứng', 'Publish record & evidence')}</button></>}
        {batch.is_public && <><a href={shareUrl}>{t('Mở hồ sơ bên mua', 'Open buyer record')}</a><BatchQRLabel batchId={batch.code} language={language} shareUrl={shareUrl} /><p className="cloud-muted">{t('QR dẫn đến hồ sơ, không chống sao chép nhãn. Chuyển riêng tư chặn lượt đọc mới nhưng không thu hồi bản đã tải.', 'The QR opens a record; it cannot prevent label copying. Making it private blocks new reads, not previously downloaded copies.')}</p></>}
      </section>}
    </>}
  </div>
}

function Workspace({ t, language }) {
  const [batches, setBatches] = useState([])
  const [selected, setSelected] = useState('')
  const [offset, setOffset] = useState(0)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const rows = await cloudRequest(`/batches?offset=${offset}`, { signal: controller.signal })
        if (!controller.signal.aborted) setBatches(rows)
      } catch (err) { if (!controller.signal.aborted) setError(cloudError(err)) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [offset, revision])

  async function create(event) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true)
    setError('')
    try {
      const data = Object.fromEntries(new FormData(form))
      data.weight_kg = Number(data.weight_kg)
      const batch = await cloudRequest('/batches', { method: 'POST', body: JSON.stringify(data) })
      setSelected(batch.id)
      setOffset(0)
      setRevision(v => v + 1)
      form.reset()
    } catch (err) { setError(cloudError(err)) }
    finally { setBusy(false) }
  }

  return <>
    {error && <p className="lookup-notice" role="alert">{error}</p>}
    <div className="cloud-workspace">
      <aside className="cloud-sidebar">
        <section className="dashboard-card cloud-form">
          <h2>{t('Lô của bạn', 'Your batches')}</h2>
          {loading ? <p role="status">{t('Đang tải… Máy chủ Free có thể cần thời gian khởi động.', 'Loading… The free server may need time to start.')}</p> : batches.length ?
            batches.map(batch => <button key={batch.id} className="button button-secondary cloud-batch-choice" aria-pressed={selected === batch.id} onClick={() => setSelected(batch.id)}><strong>{batch.code}</strong><small>{batch.farm} · {batch.is_public ? t('Công khai', 'Public') : t('Riêng tư', 'Private')}</small></button>) : <p>{offset ? t('Chưa có lô ở trang này.', 'No batches on this page.') : t('Bạn chưa tạo lô nào.', 'You have not created a batch yet.')}</p>}
          <div className="cloud-actions">
            {(offset > 0 || batches.length >= 50) && <><button className="button button-secondary" disabled={!offset || loading} onClick={() => setOffset(v => v - 50)}>{t('Trước', 'Previous')}</button>
            <button className="button button-secondary" disabled={batches.length < 50 || loading} onClick={() => setOffset(v => v + 50)}>{t('Sau', 'Next')}</button></>}
            <button className="button button-secondary" disabled={loading} onClick={() => setRevision(v => v + 1)}>{t('Tải lại', 'Reload')}</button>
          </div>
        </section>
        <form className="dashboard-card cloud-form" onSubmit={create}>
          <h2>{t('Tạo lô riêng tư', 'Create private batch')}</h2>
          <label>{t('Mã lô (chữ, số, - hoặc _)', 'Batch code (letters, numbers, - or _)')}<input id="cloud-batch-code" name="code" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}" /></label>
          <BatchFields t={t} />
          <button className="button button-primary" disabled={busy}>{busy ? t('Đang lưu…', 'Saving…') : t('Tạo hồ sơ lô', 'Create batch record')}</button>
        </form>
      </aside>
      {selected ? <BatchDetails key={selected} id={selected} publicView={false} t={t} language={language} onChange={updated => setBatches(rows => rows.map(row => row.id === updated.id ? updated : row))} /> : <div className="dashboard-card cloud-empty"><Sprout size={40} aria-hidden="true" /><p className="section-kicker">{t('Workspace của bạn', 'Your workspace')}</p><h2>{loading ? t('Đang mở workspace…', 'Opening your workspace…') : batches.length ? t('Chọn lô để xem hồ sơ', 'Select a batch to open its record') : t('Tạo hồ sơ lô đầu tiên', 'Create your first batch record')}</h2><p role={loading ? 'status' : undefined}>{t('Bắt đầu từ thông tin lô, sau đó thêm tài liệu và chia sẻ khi hồ sơ đã sẵn sàng.', 'Start with batch details, add documents, then share when the record is ready.')}</p><ol className="cloud-start-steps"><li><ClipboardList size={20} aria-hidden="true" /><span>{t('Nhập thông tin vườn và thu hoạch', 'Enter farm and harvest details')}</span></li><li><FileUp size={20} aria-hidden="true" /><span>{t('Đính kèm ảnh hoặc phiếu kiểm nghiệm', 'Attach photos or lab documents')}</span></li><li><QrCode size={20} aria-hidden="true" /><span>{t('Kiểm tra hồ sơ rồi chia sẻ QR', 'Review the record and share its QR')}</span></li></ol>{!loading && !batches.length && <button type="button" className="button button-primary" onClick={() => document.getElementById('cloud-batch-code')?.focus()}>{t('Bắt đầu tạo lô', 'Create a batch')}<ArrowRight size={18} aria-hidden="true" /></button>}</div>}
    </div>
  </>
}

export default function CloudPortal({ publicView = false, publicId, example = false }) {
  const { language } = useLanguage()
  const t = (vi, en) => language === 'vi' ? vi : en
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase || publicView) return
    let active = true
    completeCloudSignIn().catch(err => { if (active) setError(cloudError(err)) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [publicView])
  async function signOut() {
    const { error: err } = await supabase.auth.signOut({ scope: 'local' })
    if (err) setError(cloudError(err))
  }
  const signedOut = !publicView && ready && !session && supabase && API_BASE_URL
  return <section className={`section${signedOut ? ' cloud-auth-page' : ''}`}><div className="section-shell cloud-portal">
    {!signedOut && <header className="cloud-page-heading"><div><p className="section-kicker">DurianTrust / {t('Hồ sơ lô hàng', 'Batch records')}</p><h1>{publicView ? t('Hồ sơ cho bên mua', 'Buyer record') : t('Quản lý lô hàng', 'Manage your batches')}</h1><p>{t('Từ vườn đến bên mua: thông tin lô, bằng chứng và lịch sử trong một hồ sơ.', 'From farm to buyer: batch details, evidence and history in one record.')}</p></div><a className="button button-secondary" href={publicView ? '#/manage' : '#/records/example'}>{publicView ? t('Quản lý lô của tôi', 'Manage my batches') : t('Xem hồ sơ mẫu', 'View sample record')}<ArrowRight size={16} aria-hidden="true" /></a></header>}
    {example && <p className="lookup-notice" role="status">{t('Hồ sơ minh họa, chỉ để xem. Không phải lô thật; chưa có ảnh hoặc phiếu kiểm nghiệm. Dữ liệu này không được lưu lên cloud.', 'Read-only example, not a real batch. No photos or lab documents are attached. This sample is not saved to the cloud.')}</p>}
    {error && <p role="alert">{error}</p>}
    {example ? <BatchDetails id="example" publicView example t={t} language={language} /> : !supabase || !API_BASE_URL ? <p role="status">{t('Tính năng cloud chưa được bật. Bạn vẫn có thể xem hồ sơ mẫu.', 'Cloud records are not enabled yet. You can still view the sample record.')}</p>
      : publicView ? <BatchDetails key={publicId} id={publicId} publicView t={t} language={language} />
        : !ready ? <p role="status">{t('Đang kiểm tra đăng nhập…', 'Checking sign-in…')}</p>
          : !session ? <div className="cloud-onboarding">
            <figure className="cloud-intro">
              <img className="cloud-auth-image" src={`${import.meta.env.BASE_URL}images/hero-durian.webp`} alt={t('Sầu riêng trên mặt bàn gỗ', 'A durian on a wooden table')} width="1600" height="1067" />
              <figcaption className="cloud-auth-story">
                <p className="cloud-auth-eyebrow">{t('Từ vườn đến bên mua', 'From farm to buyer')}</p>
                <h2>{t('Mỗi lô hàng,\nmột hồ sơ rõ ràng.', 'Every batch,\none clear record.')}</h2>
                <p>{t('Giữ tài liệu đúng lô. Chia sẻ khi bạn sẵn sàng.', 'Keep documents with the right batch. Share when you are ready.')}</p>
                <div className="cloud-auth-credit"><a href="https://commons.wikimedia.org/wiki/File:Durian_(8425934020).jpg" target="_blank" rel="noreferrer">{t('Ảnh', 'Photo')}: Sodanie Chea</a><a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a><span>{t('Cắt khung hiển thị', 'Cropped for display')}</span></div>
              </figcaption>
            </figure>
            <SignIn t={t} />
          </div> : <>
            <div className="cloud-account"><span className="cloud-account-avatar" aria-hidden="true">{(session.user.email || 'D').slice(0, 1).toUpperCase()}</span><div><strong>{t('Workspace cá nhân', 'Personal workspace')}</strong><span>{session.user.email}</span></div><button className="button button-secondary" onClick={signOut}>{t('Đăng xuất', 'Sign out')}</button></div>
            <Workspace key={session.user.id} t={t} language={language} />
          </>}
    {!publicView && session && <aside className="cloud-tools"><strong>{t('Công cụ thử nghiệm', 'Experimental tools')}</strong><p>{t('Hồ sơ trên đây lưu trong database. Xác nhận bàn giao bằng ví Solana và model AI nằm trong khu vực riêng; chưa tự đồng bộ với lô của bạn.', 'These records are stored in a database. Solana wallet handoffs and AI models are separate experiments and do not automatically sync with your batches.')}</p><a href="#/manage/solana">{t('Mở công cụ Solana & AI', 'Open Solana & AI tools')}</a></aside>}
  </div></section>
}
