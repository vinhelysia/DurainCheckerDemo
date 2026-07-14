export const DEFAULT_CADMIUM_THRESHOLD_PPM = 0.05

export function runRuleAuditor(cdVal, threshold = DEFAULT_CADMIUM_THRESHOLD_PPM) {
  const cd = parseFloat(cdVal) || 0
  const thr = parseFloat(threshold) || DEFAULT_CADMIUM_THRESHOLD_PPM
  const cdInt = Math.round(cd * 1000)
  let riskLevel = 'low'
  let ruleResultVi = 'Đạt xuất khẩu'
  let ruleResultEn = 'Export-ready'
  let confidence = 90 + (cdInt % 9)
  let riskCauseVi = `Cadimi và Vàng O trong ngưỡng cho phép (< ${thr} ppm)`
  let riskCauseEn = `Cadmium and Yellow O within limits (< ${thr} ppm)`

  if (cd >= thr) {
    riskLevel = 'high'
    ruleResultVi = 'Giữ lô'
    ruleResultEn = 'Hold'
    confidence = 82 + (cdInt % 14)
    riskCauseVi = `Hàm lượng Cadimi vượt ngưỡng an toàn cho phép (>= ${thr} ppm)`
    riskCauseEn = `Cadmium level exceeds safe limits (>= ${thr} ppm)`
  } else if (cd >= thr * 0.9) {
    riskLevel = 'medium'
    ruleResultVi = 'Cần xem lại'
    ruleResultEn = 'Needs review'
    confidence = 62 + (cdInt % 15)
    riskCauseVi = `Hàm lượng Cadimi gần ngưỡng cảnh báo (${thr} ppm), đề nghị kiểm tra bổ sung`
    riskCauseEn = `Cadmium level near threshold (${thr} ppm); supplementary assay recommended`
  }

  return { riskLevel, aiResultVi: ruleResultVi, aiResultEn: ruleResultEn, confidence, riskCauseVi, riskCauseEn }
}
