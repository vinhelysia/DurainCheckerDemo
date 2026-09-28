import { lazy, Suspense, useState } from 'react'
import { ArrowRight, FileText, Globe, LockKeyhole, QrCode, ScanLine, Sprout } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { exampleBatch } from '../data/recordExample'
import { formatDate } from '../data/batches'

const QRScannerModal = lazy(() => import('./QRScannerModal'))
const asset = file => `${import.meta.env.BASE_URL}images/${file}`

export default function Hero() {
  const { copy, language } = useLanguage()
  const t = (vi, en) => language === 'vi' ? vi : en
  const [scanning, setScanning] = useState(false)
  const steps = [
    [Sprout, t('Tạo hồ sơ lô', 'Create a batch record'), t('Ghi vườn, vùng trồng, giống và ngày thu hoạch.', 'Record the farm, region, variety and harvest date.')],
    [FileText, t('Gắn tài liệu', 'Attach documents'), t('Tập hợp ảnh và tài liệu cùng nguồn khai báo.', 'Keep photos and documents with their declared sources.')],
    [Globe, t('Chọn chia sẻ', 'Choose to share'), t('Hồ sơ riêng tư cho đến khi chủ lô công khai.', 'Records stay private until the owner publishes them.')],
    [ScanLine, t('Mở và đối chiếu', 'Open and review'), t('Bên mua quét QR để đọc hồ sơ và tải tài liệu.', 'Buyers scan a QR to read the record and download files.')],
  ]

  function openRecord(id, cloud, example) {
    setScanning(false)
    window.location.assign(example ? '#/records/example' : cloud ? `#/cloud?batchId=${encodeURIComponent(id)}` : `#/unit/demo?batchId=${encodeURIComponent(id)}`)
  }

  return <>
    <section className="hero-section record-home-hero" aria-labelledby="hero-title">
      <div className="section-shell hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">{t('Từ vườn đến bên mua', 'From farm to buyer')}</p>
          <h1 id="hero-title">{t('Hiểu rõ hồ sơ của từng lô sầu riêng.', 'Know the record behind every durian batch.')}</h1>
          <p className="hero-lead">{t('Nguồn gốc khai báo, tài liệu và hành trình trong một hồ sơ. Chủ vườn chuẩn bị; bên mua và người xem mở bằng QR để đối chiếu.', 'Declared origin, documents and journey in one record. Growers prepare it; buyers and consumers open a QR to review it.')}</p>
          <div className="hero-actions" aria-label={copy.hero.ariaLabelActions}>
            <button className="button button-primary" type="button" onClick={() => setScanning(true)}><QrCode size={19} aria-hidden="true" />{t('Quét QR / mở hồ sơ', 'Scan QR / open a record')}</button>
            <a className="button button-secondary" href="#/manage">{t('Quản lý lô của tôi', 'Manage my batches')}<ArrowRight size={18} aria-hidden="true" /></a>
          </div>
          <a className="home-sample-link" href="#/records/example">{t('Xem hồ sơ mẫu', 'Explore a sample record')}<ArrowRight size={16} aria-hidden="true" /></a>
          <p className="home-access-note">{t('Xem hồ sơ công khai không cần tài khoản hoặc ví.', 'No account or wallet needed to view a public record.')}</p>
        </div>
        <div className="record-preview-scene">
          <img className="record-preview-orchard" src={asset('orchard.webp')} alt="" width={600} height={400} fetchPriority="high" />
          <article className="record-phone" aria-label={t('Xem trước hồ sơ mẫu', 'Sample record preview')}>
            <div className="record-phone-brand"><img src={`${import.meta.env.BASE_URL}durian-logo.svg`} alt="" width={23} height={23} /><strong>DurianTrust</strong><span>{t('Hồ sơ mẫu', 'Sample')}</span></div>
            <div className="record-phone-content">
              <p className="section-kicker">{t('Hồ sơ lô hàng', 'Batch record')}</p>
              <h2>{exampleBatch.code}</h2><p className="record-phone-farm">{exampleBatch.farm}</p>
              <dl className="record-phone-facts">
                {[[t('Vùng', 'Region'), exampleBatch.province], [t('Giống', 'Variety'), exampleBatch.variety], [t('Khối lượng', 'Weight'), `${exampleBatch.weight_kg} kg`], [t('Thu hoạch', 'Harvested'), formatDate(exampleBatch.harvest_date, language)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <div className="record-phone-evidence"><FileText size={20} aria-hidden="true" /><div><strong>{t('Ảnh & tài liệu', 'Photos & documents')}</strong><span>{t('Chưa có tệp đính kèm', 'No files attached')}</span></div><span>0</span></div>
              <p className="record-phone-note">{t('Dữ liệu minh họa. Chưa xác minh nguồn gốc hoặc chất lượng.', 'Illustrative data. Origin and quality are not verified.')}</p>
              <a href="#/records/example">{t('Mở hồ sơ đầy đủ', 'Open the full record')}<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </article>
          <a className="record-preview-qr" href="#/records/example"><img src={asset('sample-record-qr.svg')} alt={t('QR mở hồ sơ minh họa MAU-2026-01', 'QR opening sample record MAU-2026-01')} width={100} height={100} /><span>{t('Quét để xem', 'Scan to view')}<small>{t('Hồ sơ minh họa', 'Sample record')}</small></span></a>
          <p className="record-preview-caption">{t('Xem trước bằng giao diện · dữ liệu mẫu, không phải lô thật', 'Interface preview · sample data, not a real batch')}</p>
        </div>
      </div>
    </section>

    <div className="section-shell home-access-strip">
      {[[ScanLine, t('Bên mua & người xem', 'Buyers & consumers'), t('Đọc hồ sơ công khai', 'Read public records')], [LockKeyhole, t('Chủ vườn & HTX', 'Growers & cooperatives'), t('Chủ động chọn chia sẻ', 'Control when to share')], [FileText, t('Bằng chứng có nguồn', 'Evidence with a source'), t('Đối chiếu từng tài liệu', 'Review each document')]].map(([Icon, title, detail]) => <div key={title}><Icon size={23} aria-hidden="true" /><p><strong>{title}</strong><span>{detail}</span></p></div>)}
    </div>

    <section className="section home-workflow" aria-labelledby="workflow-title">
      <div className="section-shell">
        <div className="section-heading"><p className="section-kicker">{t('Cách sử dụng', 'How it works')}</p><h2 id="workflow-title">{t('Một hồ sơ, từ lúc tạo đến lúc chia sẻ.', 'One record, from creation to sharing.')}</h2><p>{t('Tài liệu đi cùng đúng mã lô để người xem tìm và đối chiếu.', 'Keep documents with the right batch code so viewers can find and review them.')}</p></div>
        <ol className="record-flow">{steps.map(([Icon, title, detail], index) => <li key={title}><div className="record-flow-symbol" aria-hidden="true"><Icon size={27} strokeWidth={1.7} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{detail}</p></li>)}</ol>
      </div>
    </section>

    <section className="section home-audiences" aria-labelledby="audience-title">
      <div className="section-shell">
        <div className="section-heading"><h2 id="audience-title">{t('Bạn cần xem hay chuẩn bị hồ sơ?', 'Review a record or prepare one?')}</h2></div>
        <div className="home-audience-grid">
          <article><ScanLine size={28} aria-hidden="true" /><p className="section-kicker">{t('Bên mua · Người tiêu dùng', 'Buyers · Consumers')}</p><h3>{t('Xem những gì chủ lô đã cung cấp.', 'See what the batch owner has supplied.')}</h3><p>{t('Mở QR từ người bán. Xem vùng khai báo, ngày thu hoạch, tài liệu và các mốc đã ghi. Tài liệu còn thiếu được hiển thị rõ.', 'Open the seller’s QR. Review the declared region, harvest date, documents and recorded events. Missing documents are clearly identified.')}</p><button type="button" className="button button-primary" onClick={() => setScanning(true)}>{t('Mở trình quét QR', 'Open QR scanner')}<ArrowRight size={17} aria-hidden="true" /></button></article>
          <article><Sprout size={28} aria-hidden="true" /><p className="section-kicker">{t('Chủ vườn · HTX · Đơn vị bán', 'Growers · Cooperatives · Sellers')}</p><h3>{t('Chuẩn bị hồ sơ trước khi gửi bên mua.', 'Prepare a record before sending it to a buyer.')}</h3><p>{t('Đăng nhập Google, tạo lô riêng tư, đính kèm tài liệu và ghi hành trình. Công khai khi sẵn sàng để gửi đường dẫn hoặc nhãn QR.', 'Sign in with Google, create a private batch, attach documents and record events. Publish when ready to send a link or QR label.')}</p><a className="button button-secondary" href="#/manage">{t('Vào quản lý lô', 'Open batch workspace')}<ArrowRight size={17} aria-hidden="true" /></a></article>
        </div>
      </div>
    </section>

    <section className="section home-record-boundary" aria-labelledby="boundary-title">
      <div className="section-shell home-boundary-grid">
        <div><p className="section-kicker">{t('Hiểu đúng bằng chứng', 'Understanding the evidence')}</p><h2 id="boundary-title">{t('Hồ sơ giúp đối chiếu. Xác minh cần bằng chứng thực tế.', 'Records support review. Verification needs real evidence.')}</h2><a className="home-sample-link" href="#/intro/problem">{t('Vì sao cần hồ sơ theo lô?', 'Why do batches need linked records?')}<ArrowRight size={16} aria-hidden="true" /></a></div>
        <dl><div><dt>{t('Thông tin vườn & chất lượng', 'Farm & quality information')}</dt><dd>{t('Do chủ hồ sơ khai báo. QR không chứng minh hàng thật, phiếu lab chính thức hoặc đủ điều kiện xuất khẩu.', 'Declared by the record owner. A QR does not prove physical origin, official lab certification or export eligibility.')}</dd></div><div><dt>{t('Hồ sơ đang dùng', 'Current batch records')}</dt><dd>{t('Lưu trong database, riêng tư theo tài khoản và công khai khi chọn. Chưa tự neo dữ liệu lên blockchain.', 'Stored in a database, private per account and published by choice. Records are not automatically anchored to a blockchain.')}</dd></div><div><dt>{t('Thử nghiệm Solana', 'Solana experiment')}</dt><dd>{t('Có thể đối chiếu dữ liệu và ví ký trên Devnet. Chữ ký cho biết ví ký; không xác nhận phép đo hoặc hàng vật lý.', 'Data and wallet signers can be inspected on Devnet. A signature identifies the signing wallet; it does not validate a measurement or physical goods.')}</dd></div></dl>
      </div>
    </section>

    <section className="landing-features home-experiments" aria-labelledby="features-title">
      <div className="section-shell"><div className="section-heading"><p className="section-kicker">{t('Công nghệ · Prototype', 'Technology · Prototype')}</p><h2 id="features-title">{copy.landing.featureTitle}</h2><p>{copy.landing.featureLead}</p></div>
        <div className="feature-stories">{copy.landing.features.map(feature => <article className="feature-story" key={feature.image}><figure><img src={asset(feature.image)} alt={feature.alt} width={960} height={640} loading="lazy" /><figcaption>{copy.landing.featureIllustration}</figcaption></figure><div className="feature-story-body"><p className="section-kicker">{feature.kicker}</p><h3>{feature.title}</h3><p>{feature.description}</p><ol className="feature-steps">{feature.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="feature-limit">{feature.note}</p><a className="button button-secondary" href={feature.href}>{feature.action}<ArrowRight size={18} aria-hidden="true" /></a></div></article>)}</div>
      </div>
    </section>
    {scanning && <Suspense fallback={<p className="home-scanner-loading" role="status">{t('Đang mở trình quét…', 'Opening scanner…')}</p>}><QRScannerModal isOpen onClose={() => setScanning(false)} batches={[]} onScanSuccess={openRecord} /></Suspense>}
  </>
}
