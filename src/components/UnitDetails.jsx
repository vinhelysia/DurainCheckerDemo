import { useLanguage } from './LanguageContext'
import { Sprout, Truck, FlaskConical, Award, ShieldCheck, ArrowLeft, Cpu, Activity, Database, HeartPulse } from 'lucide-react'

export default function UnitDetails({ unitType }) {
  const { language, copy } = useLanguage()

  // Dynamic back to home helper
  const handleBackToHome = (e) => {
    e.preventDefault()
    window.location.hash = '#/'
  }

  // Define details for each unit type
  const unitData = {
    farm: {
      icon: <Sprout size={32} className="text-green-mid" />,
      title: copy.units.farmTitle,
      subtitle: copy.units.farmSubtitle,
      colorClass: 'farm-theme',
      status: 'approved',
      telemetry: [
        { label: language === 'vi' ? 'Độ ẩm đất' : 'Soil Moisture', value: '42.8 %', status: 'optimal' },
        { label: language === 'vi' ? 'Độ pH của đất' : 'Soil pH', value: '6.45', status: 'optimal' },
        { label: language === 'vi' ? 'Nhiệt độ môi trường' : 'Ambient Temp', value: '28.3 °C', status: 'normal' },
        { label: language === 'vi' ? 'Hàm lượng hữu cơ' : 'Soil Organic Matter', value: '3.42 %', status: 'optimal' },
      ],
      blockchainLogs: [
        { height: '190458', hash: '0x3bf9...f192', event: language === 'vi' ? 'Đăng ký Lô đất trồng sầu riêng' : 'Orchard Plot Registered', time: '10:14 - 12/06/2026' },
        { height: '190492', hash: '0x82ec...110e', event: language === 'vi' ? 'Kiểm nghiệm Dư lượng Đất & Nước' : 'Soil & Water Runoff Cleared', time: '14:23 - 13/06/2026' },
        { height: '190530', hash: '0xefc4...7a29', event: language === 'vi' ? 'Khai báo Thu hoạch Lô hàng #B882' : 'Batch #B882 Harvest Declared', time: '07:30 - 15/06/2026' }
      ]
    },
    transport: {
      icon: <Truck size={32} className="text-green-mid" />,
      title: copy.units.transportTitle,
      subtitle: copy.units.transportSubtitle,
      colorClass: 'transport-theme',
      status: 'approved',
      telemetry: [
        { label: language === 'vi' ? 'Nhiệt độ thùng lạnh' : 'Container Temperature', value: '2.8 °C', status: 'optimal' },
        { label: language === 'vi' ? 'Độ ẩm thùng lạnh' : 'Container Humidity', value: '82.5 %', status: 'normal' },
        { label: language === 'vi' ? 'Vận tốc trung bình' : 'Average GPS Speed', value: '62 km/h', status: 'normal' },
        { label: language === 'vi' ? 'Độ rung chấn cơ học' : 'Mechanical Vibration', value: '0.04 g', status: 'optimal' },
      ],
      blockchainLogs: [
        { height: '190544', hash: '0xfa8d...301a', event: language === 'vi' ? 'Khởi tạo Hành trình Vận chuyển' : 'Transit Journey Initiated', time: '08:45 - 15/06/2026' },
        { height: '190561', hash: '0x48e1...76c2', event: language === 'vi' ? 'Ghi nhận Định vị GPS & Nhiệt độ IoT' : 'GPS & Cold Chain Ping Logged', time: '10:00 - 15/06/2026' },
        { height: '190592', hash: '0x221b...804f', event: language === 'vi' ? 'Cập cảng Trung chuyển Cát Lái' : 'Arrived at Cat Lai Export Hub', time: '11:15 - 15/06/2026' }
      ]
    },
    testing: {
      icon: <FlaskConical size={32} className="text-green-mid" />,
      title: copy.units.testingTitle,
      subtitle: copy.units.testingSubtitle,
      colorClass: 'testing-theme',
      status: 'approved',
      telemetry: [
        { label: language === 'vi' ? 'Hàm lượng Cadimi' : 'Cadmium Level', value: '0.024 ppm', status: 'optimal', limit: '< 0.05 ppm' },
        { label: language === 'vi' ? 'Chất Vàng O' : 'Auramine O Dye', value: language === 'vi' ? 'Không phát hiện' : 'Not Detected', status: 'optimal' },
        { label: language === 'vi' ? 'Độ tin cậy quét AI' : 'AI Classification Conf', value: '98.7 %', status: 'optimal' },
        { label: language === 'vi' ? 'Chứng nhận Phòng Lab' : 'Lab Accreditation', value: 'ISO/IEC 17025', status: 'normal' },
      ],
      blockchainLogs: [
        { height: '190605', hash: '0x99e2...0bda', event: language === 'vi' ? 'Tiếp nhận Mẫu thử Phòng Thí nghiệm' : 'Laboratory Sample Checked In', time: '11:30 - 15/06/2026' },
        { height: '190623', hash: '0xdac4...998f', event: language === 'vi' ? 'Ghi nhận Kết quả Kiểm nghiệm Cadimi' : 'Cadmium Assay Results Logged', time: '12:45 - 15/06/2026' },
        { height: '190638', hash: '0x88f2...ee7c', event: language === 'vi' ? 'Ký mã hóa Xác nhận kiểm nghiệm AI' : 'AI Audit Sign-Off Broadcasted', time: '13:00 - 15/06/2026' }
      ]
    },
    export: {
      icon: <Award size={32} className="text-green-mid" />,
      title: copy.units.exportTitle,
      subtitle: copy.units.exportSubtitle,
      colorClass: 'export-theme',
      status: 'approved',
      telemetry: [
        { label: language === 'vi' ? 'Mã số Tờ khai Hải quan' : 'Customs Declaration ID', value: 'VN-1903882-C', status: 'normal' },
        { label: language === 'vi' ? 'Mã chì Niêm phong' : 'Container Seal ID', value: 'CO-998242A', status: 'optimal' },
        { label: language === 'vi' ? 'Chứng thư thông quan số' : 'Phytosanitary E-Cert', value: 'CLEARED-2026', status: 'optimal' },
        { label: language === 'vi' ? 'Trạng thái Hợp đồng Thông minh' : 'Smart Contract Status', value: 'Ready/Released', status: 'optimal' },
      ],
      blockchainLogs: [
        { height: '190650', hash: '0x3ac4...7a78', event: language === 'vi' ? 'Nộp hồ sơ Hải quan lên Blockchain' : 'Customs Files Deposited to Web3', time: '13:30 - 15/06/2026' },
        { height: '190669', hash: '0x8b22...192f', event: language === 'vi' ? 'Thông quan Cảng xuất khẩu thành công' : 'Port Clearance Verified', time: '14:00 - 15/06/2026' },
        { height: '190700', hash: '0x00f2...ad8c', event: language === 'vi' ? 'Đúc (Mint) Chứng thư số NFT Traceability' : 'NFT Traceability Certificate Minted', time: '14:30 - 15/06/2026' }
      ]
    }
  }

  const activeData = unitData[unitType] || unitData.farm

  return (
    <div className={`unit-details-page ${activeData.colorClass}`}>
      <div className="section-shell">
        {/* Back Link */}
        <a href="#/" onClick={handleBackToHome} className="back-link">
          <ArrowLeft size={16} />
          <span>{copy.units.backToHome}</span>
        </a>

        {/* Page Header */}
        <div className="unit-header-block">
          <div className="unit-icon-wrapper">
            {activeData.icon}
          </div>
          <div>
            <h1>{activeData.title}</h1>
            <p className="unit-subtitle">{activeData.subtitle}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="status-banner">
          <div className="status-left">
            <ShieldCheck size={22} className="status-shield-icon" />
            <span>
              <strong>{language === 'vi' ? 'Trạng thái hoạt động' : 'Operational Status'}: </strong>
              <span className="status-text">{copy.units.statusApproved}</span>
            </span>
          </div>
          <span className="status-badge-pill">{language === 'vi' ? 'Đã liên kết' : 'Connected'}</span>
        </div>

        {/* Grid Dashboard */}
        <div className="unit-dashboard-grid">
          {/* Column 1: Telemetry */}
          <div className="dashboard-card telemetry-card">
            <div className="card-header-with-icon">
              <Cpu className="card-icon" size={20} />
              <h2>{copy.units.iotTelemetry}</h2>
            </div>
            
            <div className="telemetry-grid">
              {activeData.telemetry.map((t, idx) => (
                <div key={idx} className="telemetry-item">
                  <div className="telemetry-item-header">
                    <span className="telemetry-label">{t.label}</span>
                    <span className="telemetry-status-dot optimal" />
                  </div>
                  <div className="telemetry-value-row">
                    <strong className="telemetry-value">{t.value}</strong>
                    {t.limit && <span className="telemetry-limit">{t.limit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Blockchain Logs */}
          <div className="dashboard-card blockchain-logs-card">
            <div className="card-header-with-icon">
              <Database className="card-icon" size={20} />
              <h2>{copy.units.blockchainProof}</h2>
            </div>

            <div className="logs-list">
              {activeData.blockchainLogs.map((log, idx) => (
                <div key={idx} className="log-item">
                  <div className="log-timeline-marker">
                    <Activity size={12} className="pulse-activity" />
                    <span className="timeline-line" />
                  </div>
                  <div className="log-content">
                    <div className="log-row">
                      <strong className="log-event">{log.event}</strong>
                      <span className="log-height">Block #{log.height}</span>
                    </div>
                    <div className="log-row">
                      <code className="log-hash">{log.hash}</code>
                      <span className="log-time">{log.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Callout */}
        <div className="dashboard-card visual-callout-card">
          <div className="card-header-with-icon">
            <HeartPulse className="card-icon animate-pulse" size={20} />
            <h2>{language === 'vi' ? 'Quy chuẩn an toàn chuỗi cung ứng' : 'Supply Chain Safety Compliance'}</h2>
          </div>
          <p className="callout-text">
            {language === 'vi' 
              ? 'Dữ liệu được cập nhật tự động từ các bộ cảm biến thông minh (IoT Sensors) gắn tại hiện trường. Mọi tham số đo lường vượt ngưỡng sẽ kích hoạt trạng thái cảnh báo trên hợp đồng thông minh blockchain và khóa tự động lô hàng để thanh tra thêm.'
              : 'Data is synchronized in real-time from on-field smart IoT sensors. Any parameter violating set thresholds automatically triggers a warning flag on the blockchain smart contract, locking the batch for inspector review.'}
          </p>
        </div>

      </div>
    </div>
  )
}
