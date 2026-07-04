import { describe, it, expect } from 'vitest'
import { fromPpm } from './units.ts'

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
