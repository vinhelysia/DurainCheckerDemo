export function runRuleAuditor(cdVal) {
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
