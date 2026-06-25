import { useLanguage } from './LanguageContext'
import { Sprout, Truck, FlaskConical, Award, ShieldCheck, ArrowLeft, Cpu, Activity, Database, HeartPulse } from 'lucide-react'

export default function UnitDetails({ unitType }) {
  const { copy } = useLanguage()

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
        { label: copy.unitDetails.farm.soilMoisture, value: '42.8 %', status: 'optimal' },
        { label: copy.unitDetails.farm.soilPh, value: '6.45', status: 'optimal' },
        { label: copy.unitDetails.farm.ambientTemp, value: '28.3 °C', status: 'normal' },
        { label: copy.unitDetails.farm.soilOrganicMatter, value: '3.42 %', status: 'optimal' },
      ],
      blockchainLogs: [
        { height: '190458', hash: '3bF9...f192', event: copy.unitDetails.farm.plotRegistered, time: '10:14 - 12/06/2026' },
        { height: '190492', hash: '82eC...11ye', event: copy.unitDetails.farm.runoffCleared, time: '14:23 - 13/06/2026' },
        { height: '190530', hash: 'eFc4...7a29', event: copy.unitDetails.farm.harvestDeclared, time: '07:30 - 15/06/2026' }
      ]
    },
    transport: {
      icon: <Truck size={32} className="text-green-mid" />,
      title: copy.units.transportTitle,
      subtitle: copy.units.transportSubtitle,
      colorClass: 'transport-theme',
      status: 'approved',
      telemetry: [
        { label: copy.unitDetails.transport.containerTemp, value: '2.8 °C', status: 'optimal' },
        { label: copy.unitDetails.transport.containerHumidity, value: '82.5 %', status: 'normal' },
        { label: copy.unitDetails.transport.gpsSpeed, value: '62 km/h', status: 'normal' },
        { label: copy.unitDetails.transport.vibration, value: '0.04 g', status: 'optimal' },
      ],
      blockchainLogs: [
        { height: '190544', hash: 'fa8d...391a', event: copy.unitDetails.transport.journeyInitiated, time: '08:45 - 15/06/2026' },
        { height: '190561', hash: '48e1...76c2', event: copy.unitDetails.transport.pingLogged, time: '10:00 - 15/06/2026' },
        { height: '190592', hash: '221b...894f', event: copy.unitDetails.transport.arrivedHub, time: '11:15 - 15/06/2026' }
      ]
    },
    testing: {
      icon: <FlaskConical size={32} className="text-green-mid" />,
      title: copy.units.testingTitle,
      subtitle: copy.units.testingSubtitle,
      colorClass: 'testing-theme',
      status: 'approved',
      telemetry: [
        { label: copy.unitDetails.testing.cadmiumLevel, value: '0.024 ppm', status: 'optimal', limit: '< 0.05 ppm' },
        { label: copy.unitDetails.testing.yellowODye, value: copy.unitDetails.testing.notDetected, status: 'optimal' },
        { label: copy.unitDetails.testing.qualityConf, value: '98.7 %', status: 'optimal' },
        { label: copy.unitDetails.testing.labAccreditation, value: 'ISO/IEC 17025', status: 'normal' },
      ],
      blockchainLogs: [
        { height: '190605', hash: '99e2...Tbda', event: copy.unitDetails.testing.sampleCheckedIn, time: '11:30 - 15/06/2026' },
        { height: '190623', hash: 'daC4...998f', event: copy.unitDetails.testing.assayResultsLogged, time: '12:45 - 15/06/2026' },
        { height: '190638', hash: '88f2...ee7c', event: copy.unitDetails.testing.auditSignOff, time: '13:00 - 15/06/2026' }
      ]
    },
    export: {
      icon: <Award size={32} className="text-green-mid" />,
      title: copy.units.exportTitle,
      subtitle: copy.units.exportSubtitle,
      colorClass: 'export-theme',
      status: 'approved',
      telemetry: [
        { label: copy.unitDetails.export.declarationId, value: 'VN-1903882-C', status: 'normal' },
        { label: copy.unitDetails.export.sealId, value: 'CO-998242A', status: 'optimal' },
        { label: copy.unitDetails.export.eCert, value: 'CLEARED-2026', status: 'optimal' },
        { label: copy.unitDetails.export.smartContractStatus, value: 'Ready/Released', status: 'optimal' },
      ],
      blockchainLogs: [
        { height: '190650', hash: '3aC4...7a78', event: copy.unitDetails.export.filesDeposited, time: '13:30 - 15/06/2026' },
        { height: '190669', hash: '8b22...192f', event: copy.unitDetails.export.clearanceVerified, time: '14:00 - 15/06/2026' },
        { height: '190700', hash: 'Gof2...ad8c', event: copy.unitDetails.export.recordFinalized, time: '14:30 - 15/06/2026' }
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
              <strong>{copy.unitDetails.operationalStatus}: </strong>
              <span className="status-text">{copy.units.statusApproved}</span>
            </span>
          </div>
          <span className="status-badge-pill">{copy.unitDetails.connected}</span>
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
            <h2>{copy.unitDetails.safetyTitle}</h2>
          </div>
          <p className="callout-text">
            {copy.unitDetails.safetyDesc}
          </p>
        </div>

      </div>
    </div>
  )
}
