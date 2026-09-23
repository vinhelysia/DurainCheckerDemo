import { describe, expect, it } from 'vitest'
import { mapRiskLevel } from './riskLevel'

describe('chain risk decoding', () => {
  it.each([null, undefined, false, '', '0', {}, [], { future: {} }, { low: {}, high: {} }, -1, 5, 1.5])('keeps invalid risk unknown: %j', value => {
    expect(mapRiskLevel(value)).toBe('unknown')
  })
  it.each([['safe', 'low'], ['low', 'low'], ['medium', 'medium'], ['high', 'high'], ['critical', 'high']])('decodes %s', (name, expected) => {
    expect(mapRiskLevel({ [name]: {} })).toBe(expected)
    expect(mapRiskLevel(['safe', 'low', 'medium', 'high', 'critical'].indexOf(name))).toBe(expected)
  })
})
