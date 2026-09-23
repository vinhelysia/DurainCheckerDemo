import { fromPpm, toPpmScaled } from './units'

export const DEFAULT_CADMIUM_THRESHOLD_PPM = 0.05

/**
 * @param {unknown} cdVal
 * @param {unknown} [threshold]
 * @returns {{valid: boolean, riskLevel: 'low'|'medium'|'high', confidence: number, aiResultVi: string, aiResultEn: string, riskCauseVi: string, riskCauseEn: string}}
 */
export function runRuleAuditor(cdVal, threshold = DEFAULT_CADMIUM_THRESHOLD_PPM) {
  const cd = toPpmScaled(cdVal)
  const thresholdScaled = toPpmScaled(threshold)
  const thr = fromPpm(thresholdScaled)
  if (!Number.isFinite(cd) || !Number.isFinite(thresholdScaled) || thresholdScaled <= 0) {
    return {
      valid: false, riskLevel: 'medium', confidence: 0,
      aiResultVi: 'Chưa thể đánh giá', aiResultEn: 'Cannot assess',
      riskCauseVi: 'Nhập Cadimi không âm và ngưỡng lớn hơn 0: số thập phân hữu hạn, tối đa 4 chữ số thập phân và trong phạm vi số nguyên an toàn khi nhân 10.000.',
      riskCauseEn: 'Enter finite decimals: cadmium must be non-negative, threshold positive, at most 4 decimal places, within the safe integer range after scaling by 10,000.',
    }
  }
  // Store zero for unavailable confidence to preserve the numeric contract field.
  // A deterministic threshold comparison does not produce a statistical confidence.
  const confidence = 0
  /** @type {'low'|'medium'|'high'} */
  let riskLevel = 'low'
  let ruleResultVi = 'Dưới ngưỡng đối chiếu'
  let ruleResultEn = 'Below comparison threshold'
  let riskCauseVi = `Cadimi dưới ngưỡng đối chiếu (< ${thr} ppm)`
  let riskCauseEn = `Cadmium below comparison threshold (< ${thr} ppm)`

  if (cd >= thresholdScaled) {
    riskLevel = 'high'
    ruleResultVi = 'Giữ lô'
    ruleResultEn = 'Hold'
    riskCauseVi = `Hàm lượng Cadimi đạt hoặc vượt ngưỡng đối chiếu (>= ${thr} ppm)`
    riskCauseEn = `Cadmium reaches or exceeds comparison threshold (>= ${thr} ppm)`
  // Exact integer comparison, including thresholds whose 90% is between unit steps.
  } else if (BigInt(cd) * 10n >= BigInt(thresholdScaled) * 9n) {
    riskLevel = 'medium'
    ruleResultVi = 'Cần xem lại'
    ruleResultEn = 'Needs review'
    riskCauseVi = `Hàm lượng Cadimi gần ngưỡng cảnh báo (${thr} ppm), đề nghị kiểm tra bổ sung`
    riskCauseEn = `Cadmium level near threshold (${thr} ppm); supplementary assay recommended`
  }

  return { valid: true, riskLevel, aiResultVi: ruleResultVi, aiResultEn: ruleResultEn, confidence, riskCauseVi, riskCauseEn }
}
