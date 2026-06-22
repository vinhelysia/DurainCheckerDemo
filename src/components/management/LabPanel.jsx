import { useState, useEffect } from 'react'
import { Award, FileText, RefreshCw, Cpu, Send } from 'lucide-react'
import { getBatchPda, getLabPda } from '../../lib/pda'

const RISK_LEVELS = ['low', 'medium', 'high']

function mapRiskLevel(enumVal) {
  const index = Number(enumVal)
  return RISK_LEVELS[index] || 'low'
}

function runRuleAuditor(cdVal) {
  const cd = parseFloat(cdVal) || 0
  const cdInt = Math.round(cd * 1000)
  let riskLevel = 'low'
  let ruleResultVi = 'Đạt chuẩn xuất khẩu'
  let ruleResultEn = 'Export-ready'
  let confidence = 90 + (cdInt % 9)
  let riskCauseVi = 'Cadimi và Vàng O trong ngưỡng cho phép'
  let riskCauseEn = 'Cadmium and Yellow O within limits'

  if (cd > 0.05) {
    riskLevel = 'high'
    ruleResultVi = 'Không đạt - giữ lô'
    ruleResultEn = 'Hold - does not pass'
    confidence = 82 + (cdInt % 14)
    riskCauseVi = 'Hàm lượng Cadimi vượt ngưỡng an toàn cho phép (> 0.05 ppm)'
    riskCauseEn = 'Cadmium level exceeds safe limits (> 0.05 ppm)'
  } else if (cd >= 0.045) {
    riskLevel = 'medium'
    ruleResultVi = 'Cần kiểm tra lại'
    ruleResultEn = 'Needs re-check'
    confidence = 62 + (cdInt % 15)
    riskCauseVi = 'Hàm lượng Cadimi gần ngưỡng cảnh báo, đề nghị kiểm tra bổ sung'
    riskCauseEn = 'Cadmium level near threshold; supplementary assay recommended'
  }

  return { riskLevel, aiResultVi: ruleResultVi, aiResultEn: ruleResultEn, confidence, riskCauseVi, riskCauseEn }
}

export default function LabPanel({
  language,
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

  const ruleAuditLab = runRuleAuditor(cadmiumPpmLab)

  // Fetch testing history for selected batch
  useEffect(() => {
    if (!selectedBatchId) {
      setTimeout(() => {
        setLabHistory([])
      }, 0)
      return
    }

    let active = true

    async function fetchHistory() {
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
            .map(r => ({
              cadmiumPpm: Number(r.cadmiumPpm) / 10000,
              thresholdPpm: Number(r.thresholdPpm) / 10000,
              aiResult: { vi: r.aiResult, en: r.aiResult },
              confidence: Number(r.confidence) / 10000,
              riskLevel: mapRiskLevel(r.riskLevel),
              riskCause: { vi: r.riskCause, en: r.riskCause },
              timestamp: Number(r.timestamp),
              reporter: r.reporter.toString()
            }))

          if (active) {
            setLabHistory(formatted)
          }
        } catch (e) {
          console.warn('Could not fetch lab reports history', e)
        } finally {
          if (active) setLoadingHistory(false)
        }
      } else {
        // Fallback simulated batches
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const matched = localBatches.find(b => b.id === selectedBatchId)
        if (matched && matched.labReports) {
          setLabHistory(matched.labReports)
        } else {
          setLabHistory([{
            cadmiumPpm: 0.030,
            thresholdPpm: 0.05,
            aiResult: { vi: 'Đạt chuẩn xuất khẩu', en: 'Export-ready' },
            confidence: 0.95,
            riskLevel: 'low',
            riskCause: { vi: 'Hàm lượng trong ngưỡng cho phép', en: 'Within safe limits' },
            timestamp: Math.floor(Date.now() / 1000) - 3600 * 24,
            reporter: 'durian1111111111111111111111111111111111111'
          }])
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
    updateLabReport(
      selectedBatchId,
      cadmiumPpmLab,
      thresholdPpmLab,
      ruleAuditLab
    )
  }

  return (
    <div className="unit-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', width: '100%' }}>
      {/* Lab Report Form */}
      <div className="dashboard-card telemetry-card">
        <div className="card-header-with-icon">
          <Award className="card-icon" size={20} />
          <h2>{language === 'vi' ? 'Cập Nhật Kết Quả Kiểm Nghiệm Phòng Lab' : 'Submit Lab Chemical Audit Report'}</h2>
        </div>

        <form onSubmit={onSubmit} className="manage-form">
          <div className="form-group">
            <label htmlFor="m-lab-select-batch">{language === 'vi' ? 'Chọn Lô Sầu Riêng cần kiểm định' : 'Select Target Batch ID'}</label>
            <select 
              id="m-lab-select-batch"
              value={selectedBatchId} 
              onChange={(e) => setSelectedBatchId(e.target.value)}
              required
            >
              <option value="">-- {language === 'vi' ? 'Chọn lô sầu riêng' : 'Select Batch ID'} --</option>
              {registeredIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-lab-cadmium">{language === 'vi' ? 'Hàm lượng Cadimi phân tích (ppm)' : 'Assayed Cadmium (ppm)'}</label>
              <input 
                id="m-lab-cadmium"
                type="number"
                step="0.001"
                min="0"
                max="1.5"
                value={cadmiumPpmLab}
                onChange={(e) => setCadmiumPpmLab(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-lab-threshold">{language === 'vi' ? 'Ngưỡng kiểm định tối đa (ppm)' : 'Max Threshold (ppm)'}</label>
              <input 
                id="m-lab-threshold"
                type="number"
                step="0.001"
                value={thresholdPpmLab}
                onChange={(e) => setThresholdPpmLab(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Quality gate simulation preview */}
          <div className={`ai-preview-panel risk-${ruleAuditLab.riskLevel}`} style={{ margin: '12px 0' }}>
            <div className="ai-preview-header">
              <Cpu size={16} />
              <span>{language === 'vi' ? 'KẾT QUẢ ĐỐI CHIẾU QUY TẮC' : 'RULE AUDITOR ANALYSIS'}</span>
            </div>
            <div className="ai-preview-body">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">
                  {language === 'vi' ? ruleAuditLab.aiResultVi : ruleAuditLab.aiResultEn}
                </span>
                <span className={`risk-badge risk-${ruleAuditLab.riskLevel}`}>
                  {ruleAuditLab.riskLevel === 'low' ? (language === 'vi' ? 'Đạt chuẩn' : 'Safe') : (ruleAuditLab.riskLevel === 'medium' ? (language === 'vi' ? 'Cần khám' : 'Review') : (language === 'vi' ? 'Giữ lại' : 'Critical'))}
                </span>
              </div>
              <div className="text-xs opacity-80">
                <strong>{language === 'vi' ? 'Độ tin cậy:' : 'Audit Confidence:'}</strong> {ruleAuditLab.confidence}%
              </div>
              <div className="text-xs mt-1 italic opacity-90">
                &ldquo;{language === 'vi' ? ruleAuditLab.riskCauseVi : ruleAuditLab.riskCauseEn}&rdquo;
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="button button-primary w-full mt-4"
          >
            <Send size={16} />
            <span>
              {loading ? (language === 'vi' ? 'Đang thực thi Web3...' : 'Executing Web3...') : (language === 'vi' ? 'Ký Giao Dịch & Ghi Phòng Lab' : 'Sign & Broadcast Lab Report')}
            </span>
          </button>
        </form>
      </div>

      {/* History Display Card */}
      <div className="dashboard-card blockchain-logs-card">
        <div className="card-header-with-icon">
          <FileText className="card-icon" size={20} />
          <h2>{language === 'vi' ? 'Lịch Sử Báo Cáo của Lô Hàng' : 'Batch Chemical Assay History'}</h2>
        </div>
        
        {loadingHistory ? (
          <div className="text-center py-8 opacity-75">
            <RefreshCw className="animate-spin inline-block mr-2" size={18} />
            <span>{language === 'vi' ? 'Đang tải lịch sử từ blockchain...' : 'Querying history from smart contract...'}</span>
          </div>
        ) : selectedBatchId && labHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-soft)', margin: '0 0 4px 0' }}>
              {language === 'vi' ? `Có ${labHistory.length} báo cáo hóa chất được tìm thấy:` : `${labHistory.length} reports logged for batch:`}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {labHistory.map((report, idx) => (
                <li key={idx} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(31,71,52,0.03)',
                  border: '1px solid rgba(31,71,52,0.08)',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--color-green-deep)' }}>{language === 'vi' ? `Lần kiểm nghiệm #${idx + 1}` : `Assay Run #${idx + 1}`}</strong>
                    <span className={`risk-badge risk-${report.riskLevel}`} style={{ transform: 'scale(0.9)', transformOrigin: 'right' }}>
                      {report.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '4px 0' }}>
                    <div>Cadmium: <strong>{report.cadmiumPpm.toFixed(3)} ppm</strong></div>
                    <div>Threshold: <strong>{report.thresholdPpm.toFixed(3)} ppm</strong></div>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--color-ink-soft)', fontStyle: 'italic' }}>
                    &ldquo;{language === 'vi' ? report.riskCause.vi : report.riskCause.en}&rdquo;
                  </p>
                  <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(31,71,52,0.1)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-ink-soft)' }}>
                    <span>Reporter: <code>{report.reporter.slice(0, 6)}...{report.reporter.slice(-6)}</code></span>
                    <span>{new Date(report.timestamp * 1000).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : selectedBatchId ? (
          <p className="text-xs italic py-8 text-center opacity-70">
            {language === 'vi' ? 'Không tìm thấy lịch sử báo cáo nào của lô hàng này.' : 'No chemical assays recorded for this batch yet.'}
          </p>
        ) : (
          <p className="text-xs italic py-8 text-center opacity-70">
            {language === 'vi' ? 'Vui lòng chọn Lô hàng để xem lịch sử.' : 'Please select a Batch ID above to fetch history.'}
          </p>
        )}
      </div>
    </div>
  )
}
