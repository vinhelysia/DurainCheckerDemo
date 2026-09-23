import { useState, useEffect } from 'react'
import { RefreshCw, Cpu, Send } from 'lucide-react'
import { getBatchPda, getLabPda } from '../../lib/pda'
import { readLocalBatches } from '../../lib/localLedger'
import { runRuleAuditor } from '../../lib/ruleAuditor'
import { batches as staticBatches } from '../../data/batches'

export default function LabPanel({
  copy,
  loading,
  registeredIds,
  selectedBatchId,
  setSelectedBatchId,
  updateLabReport,
  providerMode,
  contractInfo,
  program,
  reloadTrigger
}) {
  const [cadmiumPpmLab, setCadmiumPpmLab] = useState('0.030')
  const [thresholdPpmLab, setThresholdPpmLab] = useState('0.050')
  const [labHistory, setLabHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  const ruleAuditLab = runRuleAuditor(
    cadmiumPpmLab,
    thresholdPpmLab
  )

  // Fetch testing history for selected batch
  useEffect(() => {
    if (!selectedBatchId) {
      const timer = setTimeout(() => {
        setLabHistory([])
        setLoadingHistory(false)
        setHistoryError(false)
      }, 0)
      return () => clearTimeout(timer)
    }

    let active = true

    async function fetchHistory() {
      setLabHistory([])
      setHistoryError(false)
      if (providerMode === 'chain' && contractInfo && program) {
        try {
          setLoadingHistory(true)

          const batchPda = getBatchPda(selectedBatchId, program.programId)
          const b = await program.account.batch.fetch(batchPda)

          const labPdas = []
          for (let idx = 0; idx < b.labCount; idx++) {
            const labPda = getLabPda(selectedBatchId, idx, program.programId)
            labPdas.push(labPda)
          }

          let reports = []
          if (labPdas.length > 0) {
            reports = await program.account.labReport.fetchMultiple(labPdas)
          }

          const formatted = reports
            .filter(r => r !== null)
            .map(r => {
              const cadmiumPpm = Number(r.cadmiumPpm) / 10000
              const thresholdPpm = Number(r.thresholdPpm) / 10000
              const audit = runRuleAuditor(cadmiumPpm, thresholdPpm)
              return {
                cadmiumPpm,
                thresholdPpm,
                riskLevel: audit.valid ? audit.riskLevel : 'unknown',
                riskCause: { vi: audit.riskCauseVi, en: audit.riskCauseEn },
                timestamp: Number(r.timestamp),
                reporter: r.reporter.toString()
              }
            })

          if (active) {
            setLabHistory(formatted)
          }
        } catch (e) {
          console.warn('Could not fetch lab reports history', e)
          if (active) setHistoryError(true)
        } finally {
          if (active) setLoadingHistory(false)
        }
      } else {
        setLoadingHistory(false)
        // Fallback: local ledger first, then static seed data — never invent a report.
        const localBatches = readLocalBatches()
        const matched = localBatches.find(b => b.id === selectedBatchId)
        if (matched?.labReports) {
          setLabHistory(matched.labReports)
        } else {
          const staticMatched = staticBatches.find(b => b.id === selectedBatchId)
          setLabHistory(staticMatched?.labReports ?? [])
        }
      }
    }

    fetchHistory()

    return () => {
      active = false
    }
  }, [selectedBatchId, providerMode, contractInfo, program, reloadTrigger])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!ruleAuditLab.valid) return
    updateLabReport(
      selectedBatchId,
      cadmiumPpmLab,
      thresholdPpmLab,
      ruleAuditLab
    )
  }

  return (
    <div className="unit-dashboard-grid manage-dashboard-grid">
      {/* Lab Report Form */}
      <div className="dashboard-card telemetry-card">
        <div className="card-header-with-icon">
          <h2>{copy.labPanel.title}</h2>
        </div>

        <form onSubmit={onSubmit} className="manage-form">
          <div className="form-group">
            <label htmlFor="m-lab-select-batch">{copy.labPanel.selectBatchLabel}</label>
            <select 
              id="m-lab-select-batch"
              value={selectedBatchId} 
              onChange={(e) => setSelectedBatchId(e.target.value)}
              required
            >
              <option value="">{copy.labPanel.selectBatchPlaceholder}</option>
              {registeredIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-lab-cadmium">{copy.labPanel.cadmiumLabel}</label>
              <input 
                id="m-lab-cadmium"
                type="number"
                step="0.0001"
                min="0"
                max="1.5"
                value={cadmiumPpmLab}
                onChange={(e) => setCadmiumPpmLab(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-lab-threshold">{copy.labPanel.thresholdLabel}</label>
              <input 
                id="m-lab-threshold"
                min="0.001"
                type="number"
                step="0.0001"
                value={thresholdPpmLab}
                onChange={(e) => setThresholdPpmLab(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Quality gate simulation preview */}
          <div className={`ai-preview-panel risk-${ruleAuditLab.riskLevel} manage-preview-panel`}>
            <div className="ai-preview-header">
              <Cpu size={16} />
              <span>{copy.labPanel.ruleAudit.title}</span>
            </div>
            <div className="ai-preview-body">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">
                  {copy.getRuleResult(ruleAuditLab)}
                </span>
                <span className={`risk-badge risk-${ruleAuditLab.riskLevel}`}>
                  {copy.labPanel.ruleAudit.statusLabels[ruleAuditLab.riskLevel]}
                </span>
              </div>
              <div className="text-xs mt-1 italic opacity-90">
                &ldquo;{copy.getRuleCause(ruleAuditLab)}&rdquo;
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !ruleAuditLab.valid}
            className="button button-primary w-full mt-4"
          >
            <Send size={16} />
            <span>
              {loading ? copy.labPanel.submitBtn.loading : copy.labPanel.submitBtn.normal}
            </span>
          </button>
        </form>
      </div>

      {/* History Display Card */}
      <div className="dashboard-card blockchain-logs-card">
        <div className="card-header-with-icon">
          <h2>{copy.labPanel.history.title}</h2>
        </div>
        
        {loadingHistory ? (
          <div className="text-center py-8 opacity-75">
            <RefreshCw className="animate-spin inline-block mr-2" size={18} />
            <span>{copy.labPanel.history.loading}</span>
          </div>
        ) : historyError ? (
          <p className="lookup-notice" role="status">{copy.labPanel.history.error}</p>
        ) : selectedBatchId && labHistory.length > 0 ? (
          <div className="lab-history-wrap">
            <p className="text-xs font-semibold lab-history-title">
              {copy.labPanel.history.summary(labHistory.length)}
            </p>
            <ul className="lab-history-list">
              {labHistory.map((report, idx) => (
                <li key={idx} className="lab-history-item">
                  <div className="lab-history-item-header">
                    <strong className="lab-history-item-run">{copy.labPanel.history.run(idx + 1)}</strong>
                    <span className={`risk-badge risk-${report.riskLevel} lab-history-risk-badge`}>
                      {copy.aiResult.riskLabels[report.riskLevel] ?? copy.aiResult.riskLabels.unknown}
                    </span>
                  </div>
                  <div className="lab-history-item-grid">
                    <div>{copy.aiResult.cadmium}: <strong>{report.riskLevel !== 'unknown' && Number.isFinite(report.cadmiumPpm) ? `${report.cadmiumPpm.toFixed(4)} ppm` : copy.aiResult.noData}</strong></div>
                    <div>{copy.aiResult.threshold}: <strong>{report.riskLevel !== 'unknown' && Number.isFinite(report.thresholdPpm) ? `${report.thresholdPpm.toFixed(4)} ppm` : copy.aiResult.noData}</strong></div>
                  </div>
                  <p className="lab-history-item-cause">
                    &ldquo;{copy.getLocalizedText(report.riskCause)}&rdquo;
                  </p>
                  <div className="lab-history-item-footer">
                    <span>Reporter: <code>{report.reporter.slice(0, 6)}...{report.reporter.slice(-6)}</code></span>
                    <span>{new Date(report.timestamp * 1000).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : selectedBatchId ? (
          <p className="text-xs italic py-8 text-center opacity-70">
            {copy.labPanel.history.noData}
          </p>
        ) : (
          <p className="text-xs italic py-8 text-center opacity-70">
            {copy.labPanel.history.selectPrompt}
          </p>
        )}
      </div>
    </div>
  )
}
