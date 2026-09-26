import { useEffect, useState } from 'react'
import { useLanguage } from './LanguageContext'
import { cloudRequest, supabase } from '../lib/cloudClient'
import { API_BASE_URL } from '../lib/api'
import BatchQRLabel from './BatchQRLabel'

function errorMessage(error) {
  return error.name === 'TimeoutError'
    ? 'Server is starting or unavailable. Try again shortly. / Máy chủ đang khởi động hoặc chưa phản hồi.'
    : error.message
}

function SignIn({ t }) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = sent
        ? await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' })
        : await supabase.auth.signInWithOtp({ email: email.trim() })
      if (result.error) throw result.error
      setSent(true)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  return <form className="dashboard-card cloud-form" onSubmit={submit}>
    <h2>{t('Đăng nhập bằng email', 'Sign in by email')}</h2>
    <p>{t('Lô mới chỉ bạn xem được. Bạn chọn thời điểm công khai hồ sơ.', 'New batches are private. You choose when to publish a record.')}</p>
    <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} disabled={sent || busy} onChange={e => setEmail(e.target.value)} /></label>
    {sent && <label>{t('Mã xác nhận trong email', 'Code from your email')}<input autoComplete="one-time-code" inputMode="numeric" required pattern="[0-9]{6,10}" value={token} onChange={e => setToken(e.target.value)} /></label>}
    {error && <p role="alert">{error}</p>}
    {sent && <p role="status">{t('Đã yêu cầu gửi mã. Kiểm tra cả thư mục spam.', 'Code requested. Check your inbox and spam folder.')}</p>}
    <button className="button button-primary" disabled={busy}>{busy ? t('Đang xử lý…', 'Working…') : sent ? t('Xác nhận', 'Verify') : t('Gửi mã đăng nhập', 'Send sign-in code')}</button>
    {sent && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setSent(false); setToken('') }}>{t('Đổi email / gửi lại', 'Change email / resend')}</button>}
  </form>
}

function BatchDetails({ id, publicView, t, language }) {
  const [batch, setBatch] = useState(null)
  const [events, setEvents] = useState([])
  const [more, setMore] = useState(false)
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
      try {
        const [record, history] = await Promise.all([
          cloudRequest(path, { signal: controller.signal }, publicView),
          cloudRequest(`${path}/events`, { signal: controller.signal }, publicView),
        ])
        if (!controller.signal.aborted) {
          setBatch(record)
          setEvents(history)
          setMore(history.length === 50)
        }
      } catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [path, publicView, revision])

  async function changeVisibility() {
    setBusy(true)
    setError('')
    try {
      setBatch(await cloudRequest(path, { method: 'PATCH', body: JSON.stringify({ is_public: !batch.is_public }) }))
    } catch (err) { setError(errorMessage(err)) }
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
    } catch (err) { setError(`${errorMessage(err)} ${t('Tải lại lịch sử trước khi thử lưu lại.', 'Reload history before submitting again.')}`) }
    finally { setBusy(false) }
  }

  async function loadMore() {
    setBusy(true)
    setError('')
    try {
      const rows = await cloudRequest(`${path}/events?offset=${events.length}`, {}, publicView)
      setEvents(previous => [...previous, ...rows])
      setMore(rows.length === 50)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/cloud?batchId=${encodeURIComponent(id)}`
  return <div className="cloud-detail">
    {error && <p className="lookup-notice" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">{t('Đang tải hồ sơ… Lần đầu có thể cần chờ máy chủ khởi động.', 'Loading… The server may need time to wake up on the first request.')}</p>}
    <button type="button" className="button button-secondary" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}>{t('Tải lại hồ sơ', 'Reload record')}</button>
    {!loading && batch && <>
      <article className="dashboard-card cloud-form">
        <p className="section-kicker">{t('DỮ LIỆU CLOUD · OFF-CHAIN', 'CLOUD RECORD · OFF-CHAIN')}</p>
        <h2>{batch.code}</h2>
        <p>{batch.farm} · {batch.province} · {batch.harvest_date}</p>
        <p>{batch.is_public ? t('Hồ sơ công khai', 'Public record') : t('Chỉ bạn xem được', 'Private to your account')}</p>
        {!publicView && <>
          <p>{t('Khi công khai, bất kỳ ai có link đều đọc được toàn bộ hồ sơ và lịch sử. Không ghi thông tin riêng tư vào ghi chú.', 'Publishing lets anyone with the link read the entire record and history. Keep private information out of notes.')}</p>
          <button className="button button-secondary" disabled={busy} onClick={changeVisibility}>{batch.is_public ? t('Chuyển về riêng tư', 'Make private') : t('Công khai hồ sơ', 'Publish record')}</button>
        </>}
        {batch.is_public && <>
          <a href={shareUrl}>{t('Mở link công khai', 'Open public link')}</a>
          <BatchQRLabel batchId={batch.code} language={language} shareUrl={shareUrl} />
        </>}
      </article>
      <section className="dashboard-card cloud-form">
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
        <h2>{t('Thêm mốc hành trình', 'Add an event')}</h2>
        <p>{t('Mốc đã lưu không sửa hoặc xóa được trong ứng dụng. Để đính chính, thêm mốc mới.', 'Saved events cannot be edited or deleted in the app. Add a new event to record a correction.')}</p>
        <label>{t('Tên mốc', 'Stage')}<input name="stage" required maxLength={160} /></label>
        <label>{t('Địa điểm', 'Location')}<input name="location" required maxLength={160} /></label>
        <label>{t('Ngày diễn ra', 'Event date')}<input name="occurred_on" type="date" required /></label>
        <label>{t('Ghi chú', 'Notes')}<textarea name="notes" maxLength={2000} rows={3} /></label>
        <fieldset><legend>{t('Số đo tùy chọn — nhập đủ cả hai trường', 'Optional measurement — fill both fields')}</legend>
          <label>{t('Cadimi đã nhập (ppm)', 'Entered cadmium (ppm)')}<input name="cadmium_ppm" type="number" step="0.0001" min="0" max="100" /></label>
          <label>{t('Ngưỡng đối chiếu (ppm)', 'Reference threshold (ppm)')}<input name="threshold_ppm" type="number" step="0.0001" min="0.0001" max="100" /></label>
        </fieldset>
        <button className="button button-primary" disabled={busy || loading}>{busy ? t('Đang lưu…', 'Saving…') : t('Lưu mốc vào cloud', 'Save event to cloud')}</button>
      </form>}
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
      } catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)) }
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
      const batch = await cloudRequest('/batches', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) })
      setSelected(batch.id)
      setOffset(0)
      setRevision(v => v + 1)
      form.reset()
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  return <>
    {error && <p className="lookup-notice" role="alert">{error}</p>}
    <div className="cloud-workspace">
      <aside className="cloud-sidebar">
        <section className="dashboard-card cloud-form">
          <h2>{t('Lô của bạn', 'Your batches')}</h2>
          {loading ? <p role="status">{t('Đang tải… Máy chủ Free có thể cần thời gian khởi động.', 'Loading… The free server may need time to start.')}</p> : batches.length ?
            batches.map(batch => <button key={batch.id} className="button button-secondary" aria-pressed={selected === batch.id} onClick={() => setSelected(batch.id)}>{batch.code}</button>) : <p>{t('Chưa có lô ở trang này.', 'No batches on this page.')}</p>}
          <div className="cloud-actions">
            <button className="button button-secondary" disabled={!offset || loading} onClick={() => setOffset(v => v - 50)}>{t('Trước', 'Previous')}</button>
            <button className="button button-secondary" disabled={batches.length < 50 || loading} onClick={() => setOffset(v => v + 50)}>{t('Sau', 'Next')}</button>
            <button className="button button-secondary" disabled={loading} onClick={() => setRevision(v => v + 1)}>{t('Tải lại', 'Reload')}</button>
          </div>
        </section>
        <form className="dashboard-card cloud-form" onSubmit={create}>
          <h2>{t('Tạo lô riêng tư', 'Create private batch')}</h2>
          <label>{t('Mã lô (chữ, số, - hoặc _)', 'Batch code (letters, numbers, - or _)')}<input name="code" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}" /></label>
          <label>{t('Tên vườn', 'Farm')}<input name="farm" required maxLength={160} /></label>
          <label>{t('Tỉnh / vùng', 'Province / region')}<input name="province" required maxLength={160} /></label>
          <label>{t('Ngày thu hoạch', 'Harvest date')}<input name="harvest_date" type="date" required /></label>
          <button className="button button-primary" disabled={busy}>{busy ? t('Đang lưu…', 'Saving…') : t('Lưu lô vào cloud', 'Save batch to cloud')}</button>
        </form>
      </aside>
      {selected ? <BatchDetails key={selected} id={selected} publicView={false} t={t} language={language} /> : <p>{t('Chọn một lô hoặc tạo lô đầu tiên để xem hồ sơ.', 'Select a batch or create your first one to view its record.')}</p>}
    </div>
  </>
}

export default function CloudPortal({ publicView = false, publicId }) {
  const { language } = useLanguage()
  const t = (vi, en) => language === 'vi' ? vi : en
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase || publicView) return
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [publicView])
  async function signOut() {
    const { error: err } = await supabase.auth.signOut({ scope: 'local' })
    if (err) setError(errorMessage(err))
  }
  return <section className="section"><div className="section-shell cloud-portal">
    <a className="back-link" href="#/manage">{t('Về cổng quản lý', 'Back to management')}</a>
    <h1>{t('Hồ sơ lô trên cloud', 'Cloud batch records')}</h1>
    <p className="lookup-notice">{t('Dữ liệu do người dùng nhập, lưu off-chain. Chưa xác minh phiếu lab và không chứng minh quyền giữ lô trên Solana.', 'User-entered records stored off-chain. They do not verify lab certificates or prove Solana custody.')}</p>
    {error && <p role="alert">{error}</p>}
    {!supabase || !API_BASE_URL ? <p role="status">{t('Tính năng cloud chưa được bật. Bạn vẫn có thể dùng demo hiện tại.', 'Cloud records are not enabled yet. You can still use the existing demo.')}</p>
      : publicView ? <BatchDetails key={publicId} id={publicId} publicView t={t} language={language} />
        : !ready ? <p role="status">{t('Đang kiểm tra đăng nhập…', 'Checking sign-in…')}</p>
          : !session ? <SignIn t={t} /> : <>
            <div className="cloud-actions"><span>{session.user.email}</span><button className="button button-secondary" onClick={signOut}>{t('Đăng xuất', 'Sign out')}</button></div>
            <Workspace key={session.user.id} t={t} language={language} />
          </>}
  </div></section>
}
