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
