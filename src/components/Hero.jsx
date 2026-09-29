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
          <h1 id="hero-title">{t('Hồ sơ lô sầu riêng, sẵn sàng gửi bên mua.', 'Durian batch records, ready for your buyer.')}</h1>
          <p className="hero-lead">{t('Tập hợp nguồn gốc, tài liệu và lịch sử của từng lô. Chọn công khai khi cần, gửi một mã QR để bên mua đối chiếu.', 'Keep origin, documents and batch history together. Publish when ready and send one QR for your buyer to review.')}</p>
          <div className="hero-actions" aria-label={copy.hero.ariaLabelActions}>
            <a className="button button-primary" href="#/manage">{t('Quản lý lô của tôi', 'Manage my batches')}<ArrowRight size={18} aria-hidden="true" /></a>
            <button className="button button-secondary" type="button" onClick={() => setScanning(true)}><QrCode size={19} aria-hidden="true" />{t('Quét QR hồ sơ', 'Scan a record QR')}</button>
          </div>
          <a className="home-sample-link" href="#/records/example">{t('Xem hồ sơ mẫu', 'Explore a sample record')}<ArrowRight size={16} aria-hidden="true" /></a>
          <p className="home-access-note">{t('Xem hồ sơ công khai không cần tài khoản hoặc ví.', 'No account or wallet needed to view a public record.')}</p>
        </div>
        <div className="record-preview-scene">
          <img className="record-preview-orchard" src={asset('hero-durian.webp')} alt={t('Sầu riêng trên bàn gỗ, ảnh minh họa sản phẩm', 'Durian on a wooden table, illustrative product photo')} width={1600} height={1067} fetchPriority="high" />
          <article className="record-phone" aria-label={t('Xem trước hồ sơ mẫu', 'Sample record preview')}>
            <div className="record-phone-brand"><FileText size={18} aria-hidden="true" /><strong>{t('Hồ sơ lô hàng', 'Batch record')}</strong><span>{t('Hồ sơ mẫu', 'Sample')}</span></div>
            <div className="record-phone-content">
              <h2>{exampleBatch.code}</h2><p className="record-phone-farm">{exampleBatch.farm}</p>
              <dl className="record-phone-facts">
                {[[t('Vùng', 'Region'), exampleBatch.province], [t('Giống', 'Variety'), exampleBatch.variety], [t('Khối lượng', 'Weight'), `${exampleBatch.weight_kg} kg`], [t('Thu hoạch', 'Harvested'), formatDate(exampleBatch.harvest_date, language)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <p className="record-phone-note">{t('Dữ liệu minh họa. Chưa xác minh nguồn gốc hoặc chất lượng.', 'Illustrative data. Origin and quality are not verified.')}</p>
              <a href="#/records/example">{t('Mở hồ sơ đầy đủ', 'Open the full record')}<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </article>
          <a className="record-preview-qr" href="#/records/example"><img src={asset('sample-record-qr.svg')} alt={t('QR mở hồ sơ minh họa MAU-2026-01', 'QR opening sample record MAU-2026-01')} width={100} height={100} /><span>{t('Quét để xem', 'Scan to view')}<small>{t('Hồ sơ minh họa', 'Sample record')}</small></span></a>
          <p className="record-preview-caption">{t('Ảnh minh họa · hồ sơ mẫu, không phải lô thật', 'Illustrative photo · sample record, not a real batch')}</p>
        </div>
      </div>
    </section>

    <section className="section home-workflow" aria-labelledby="workflow-title">
      <div className="section-shell home-workflow-layout">
        <div className="home-workflow-copy">
          <div className="section-heading"><p className="section-kicker">{t('Dành cho chủ vườn, HTX và bên mua', 'For growers, cooperatives and buyers')}</p><h2 id="workflow-title">{t('Từ tạo lô đến chia sẻ hồ sơ', 'From batch to shared record')}</h2></div>
          <ol className="record-flow">{steps.map(([Icon, title, detail], index) => <li key={title}><div className="record-flow-symbol" aria-hidden="true"><Icon size={23} strokeWidth={1.7} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{detail}</p></li>)}</ol>
          <p className="home-privacy-line"><LockKeyhole size={17} aria-hidden="true" />{t('Chỉ chủ tài khoản được sửa. Người mở QR chỉ được xem.', 'Only the account owner can edit. QR visitors can only view.')}</p>
        </div>
      </div>
    </section>

    <section className="section home-record-boundary" aria-labelledby="boundary-title">
      <div className="section-shell home-boundary-grid">
        <div><p className="section-kicker">{t('Hiểu đúng bằng chứng', 'Understanding the evidence')}</p><h2 id="boundary-title">{t('Hồ sơ hỗ trợ đối chiếu.', 'Records support review.')}</h2><a className="home-sample-link" href="#/intro/problem">{t('Vì sao cần hồ sơ theo lô?', 'Why do batches need linked records?')}<ArrowRight size={16} aria-hidden="true" /></a></div>
        <div className="home-boundary-copy"><p>{t('Thông tin do chủ hồ sơ khai báo. QR không chứng minh hàng thật, phiếu lab chính thức hoặc đủ điều kiện xuất khẩu. Tài liệu còn thiếu được hiển thị trong hồ sơ.', 'Information is declared by the record owner. A QR does not prove physical origin, official lab certification or export eligibility. Missing documents are identified in the record.')}</p><details><summary>{t('Cách lưu dữ liệu & giới hạn Solana', 'Data storage & Solana limitations')}</summary><dl><div><dt>{t('Hồ sơ đang dùng', 'Current batch records')}</dt><dd>{t('Lưu trong database, riêng tư theo tài khoản và công khai khi chọn. Chưa tự neo dữ liệu lên blockchain.', 'Stored in a database, private per account and published by choice. Records are not automatically anchored to a blockchain.')}</dd></div><div><dt>{t('Thử nghiệm Solana', 'Solana experiment')}</dt><dd>{t('Có thể đối chiếu dữ liệu và ví ký trên Devnet. Chữ ký cho biết ví ký; không xác nhận phép đo hoặc hàng vật lý.', 'Data and wallet signers can be inspected on Devnet. A signature identifies the signing wallet; it does not validate a measurement or physical goods.')}</dd></div></dl></details></div>
      </div>
    </section>

    <section className="landing-features home-experiments">
      <div className="section-shell"><details className="technical-details"><summary>{copy.landing.featureTitle}</summary><p>{copy.landing.featureLead}</p>
        <div className="feature-stories">{copy.landing.features.map(feature => <article className="feature-story" key={feature.image}><figure><img src={asset(feature.image)} alt={feature.alt} width={960} height={640} loading="lazy" /><figcaption>{copy.landing.featureIllustration}</figcaption></figure><div className="feature-story-body"><p className="section-kicker">{feature.kicker}</p><h3>{feature.title}</h3><p>{feature.description}</p><ol className="feature-steps">{feature.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="feature-limit">{feature.note}</p><a className="button button-secondary" href={feature.href}>{feature.action}<ArrowRight size={18} aria-hidden="true" /></a></div></article>)}</div>
      </details></div>
    </section>
    {scanning && <Suspense fallback={<p className="home-scanner-loading" role="status">{t('Đang mở trình quét…', 'Opening scanner…')}</p>}><QRScannerModal isOpen onClose={() => setScanning(false)} batches={[]} onScanSuccess={openRecord} /></Suspense>}
  </>
}
