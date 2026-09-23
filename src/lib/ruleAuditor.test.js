import { describe, it, expect } from 'vitest'
import { runRuleAuditor } from './ruleAuditor.js'

describe('runRuleAuditor', () => {
  it('classifies cadmium 0.04 as low under threshold 0.05 and high under threshold 0.03', () => {
    const underDefault = runRuleAuditor(0.04, 0.05)
    const underTight = runRuleAuditor(0.04, 0.03)

    expect(underDefault.riskLevel).toBe('low')
    expect(underTight.riskLevel).toBe('high')
    expect(underDefault.riskLevel).not.toBe(underTight.riskLevel)
  })
})


describe('rule input validation and evidence', () => {
  it.each(['', ' ', 'abc', 'invalid', '0.03ppm', null, undefined, false, true, [], {}, NaN, Infinity, -Infinity, -1, '0x10', '1e-2', '0.04499', 0.04999])('rejects invalid cadmium %s', value => {
    const result = runRuleAuditor(value)
    expect(result.valid).toBe(false)
    expect(result.riskLevel).not.toBe('low')
  })

  it.each(['', ' ', '0.05ppm', null, false, NaN, Infinity, 0, -0.05])('rejects invalid threshold %s', threshold => {
    expect(runRuleAuditor(0.03, threshold).valid).toBe(false)
  })

  it.each([[0, 'low'], [0.040, 'low'], [0.0449, 'low'], [0.045, 'medium'], [0.0451, 'medium'], [0.049, 'medium'], [0.0499, 'medium'], [0.050, 'high'], [0.051, 'high']])('classifies default boundary %s as %s', (cd, risk) => {
    expect(runRuleAuditor(cd).valid).toBe(true)
    expect(runRuleAuditor(cd).riskLevel).toBe(risk)
    expect(runRuleAuditor(String(cd)).riskLevel).toBe(risk)
  })

  it('compares 90% exactly even when the boundary is between representable steps', () => {
    expect(runRuleAuditor('0.0450', '0.0501').riskLevel).toBe('low')
    expect(runRuleAuditor('0.0451', '0.0501').riskLevel).toBe('medium')
    expect(runRuleAuditor('0.0001', '0.0001').riskLevel).toBe('high')
  })

  it('accepts numeric strings including zero, and uses the supplied threshold', () => {
    expect(runRuleAuditor('0').valid).toBe(true)
    expect(runRuleAuditor('0.027', '0.030').riskLevel).toBe('medium')
  })

  it('does not fabricate statistical confidence or assays for unmeasured contaminants', () => {
    const result = runRuleAuditor(0.03)
    expect(result.confidence).toBe(0)
    expect(result.aiResultEn).toBe('Below comparison threshold')
    expect(result.riskCauseEn).not.toContain('Yellow O')
    expect(result.riskCauseVi).not.toContain('Vàng O')
  })
})
