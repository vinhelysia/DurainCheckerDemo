import { describe, it, expect } from 'vitest'
import { fromPpm, toPpm, fromBps, toBps } from './units.ts'

// ── fromPpm ────────────────────────────────────────────────────────────────

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

// ── toPpm ──────────────────────────────────────────────────────────────────

describe('toPpm', () => {
  it('converts 1.0 → 10000', () => {
    expect(toPpm(1.0)).toBe(10000)
  })

  it('converts 0.5 → 5000', () => {
    expect(toPpm(0.5)).toBe(5000)
  })

  it('converts 0 → 0', () => {
    expect(toPpm(0)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    expect(toPpm(0.00004)).toBe(0)   // 0.4 → round to 0
    expect(toPpm(0.00005)).toBe(1)   // 0.5 → round to 1
  })

  it('returns 0 for null', () => {
    expect(toPpm(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(toPpm(undefined)).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(toPpm('')).toBe(0)
  })

  it('accepts numeric strings', () => {
    expect(toPpm('1.5')).toBe(15000)
  })
})

// ── fromPpm / toPpm roundtrip ───────────────────────────────────────────────

describe('ppm roundtrip', () => {
  const samples = [0, 0.1, 0.5, 1.0, 2.3, 10.0]

  for (const v of samples) {
    it(`fromPpm(toPpm(${v})) ≈ ${v}`, () => {
      expect(fromPpm(toPpm(v))).toBeCloseTo(v, 4)
    })
  }
})

// ── fromBps ────────────────────────────────────────────────────────────────

describe('fromBps', () => {
  it('converts 10000 → 1.0', () => {
    expect(fromBps(10000)).toBe(1.0)
  })

  it('converts 9500 → 0.95', () => {
    expect(fromBps(9500)).toBe(0.95)
  })

  it('handles BN-like objects', () => {
    expect(fromBps({ toNumber: () => 9500 })).toBe(0.95)
  })

  it('returns 0 for null/undefined', () => {
    expect(fromBps(null)).toBe(0)
    expect(fromBps(undefined)).toBe(0)
  })
})

// ── toBps ──────────────────────────────────────────────────────────────────

describe('toBps', () => {
  it('converts 0.95 → 9500', () => {
    expect(toBps(0.95)).toBe(9500)
  })

  it('converts 1.0 → 10000', () => {
    expect(toBps(1.0)).toBe(10000)
  })

  it('returns 0 for empty string', () => {
    expect(toBps('')).toBe(0)
  })

  it('accepts numeric strings', () => {
    expect(toBps('0.5')).toBe(5000)
  })
})

// ── fromBps / toBps roundtrip ───────────────────────────────────────────────

describe('bps roundtrip', () => {
  const samples = [0, 0.25, 0.5, 0.95, 1.0]

  for (const v of samples) {
    it(`fromBps(toBps(${v})) ≈ ${v}`, () => {
      expect(fromBps(toBps(v))).toBeCloseTo(v, 4)
    })
  }
})
