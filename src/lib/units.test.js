import { describe, it, expect } from 'vitest'
import { fromPpm, toPpmScaled } from './units.ts'

describe('fromPpm', () => {
  it('converts on-chain integer 10000 → 1.0', () => {
    expect(fromPpm(10000)).toBe(1.0)
  })

  it('converts on-chain integer 5000 → 0.5', () => {
    expect(fromPpm(5000)).toBe(0.5)
  })

  it('converts 0 → 0', () => {
    expect(fromPpm(0)).toBe(0)
  })

  it('handles BN-like objects with .toNumber()', () => {
    expect(fromPpm({ toNumber: () => 10000 })).toBe(1.0)
    expect(fromPpm({ toNumber: () => 0 })).toBe(0)
  })

  it('returns 0 for null', () => {
    expect(fromPpm(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(fromPpm(undefined)).toBe(0)
  })
})

describe('toPpmScaled', () => {
  it.each([[0, 0], ['0.040', 400], [0.0449, 449], ['0.045', 450], [0.0451, 451], ['0.049', 490], ['0.050', 500], [0.051, 510], [' .05000 ', 500]])('encodes %s exactly as %s', (input, scaled) => {
    expect(toPpmScaled(input)).toBe(scaled)
  })

  it.each([-1, NaN, Infinity, '', 'abc', null, undefined, true, [], {}, '0x10', '1e-2', 0.00001, '0.04999', '900719925474.0992'])('rejects unrepresentable or invalid input %s', input => {
    expect(toPpmScaled(input)).toBeNaN()
  })

  it('supports the safe integer maximum from a decimal string without rounding', () => {
    expect(toPpmScaled('900719925474.0991')).toBe(Number.MAX_SAFE_INTEGER)
  })
})
