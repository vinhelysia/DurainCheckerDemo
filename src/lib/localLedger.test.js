import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readLocalBatches, readLocalLedger, writeLocalBatches } from './localLedger'

const KEY = 'duriantrust_local_batches'
const localized = { vi: 'Mẫu', en: 'Sample' }
const result = {
  cadmiumPpm: 0.03, thresholdPpm: 0.05, confidence: 0,
  riskLevel: 'low', aiResult: localized, riskCause: localized,
}
function batch(id = 'LOCAL-1') {
  return {
    id, farm: localized, province: localized, harvestDate: '2026-09-08',
    ...result, blockchainHash: 'simulated, not on-chain',
    timeline: [{ stage: localized, location: localized, date: '2026-09-08', status: 'complete' }],
    labReports: [{ ...result, timestamp: 1788825600, reporter: '' }],
  }
}

describe('local demo ledger resilience', () => {
  let storage
  beforeEach(() => {
    const data = new Map()
    storage = {
      getItem: vi.fn(key => data.get(key) ?? null),
      setItem: vi.fn((key, value) => data.set(key, value)),
    }
    vi.stubGlobal('localStorage', storage)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reads an absent ledger as empty without writing', () => {
    expect(readLocalLedger()).toEqual({ batches: [], error: null })
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('round-trips newly registered batches and preserves legacy optional fields', () => {
    const original = batch()
    delete original.labReports
    writeLocalBatches([original])
    expect(readLocalLedger()).toEqual({ batches: [{ ...original, tokenId: 0, labReports: [] }], error: null })
    expect(storage.getItem(KEY)).toBe(JSON.stringify([original]))
  })

  it.each(['{broken', '', '{}', 'null', '42'])('preserves corrupt payload %j and refuses overwrite', raw => {
    storage.setItem(KEY, raw)
    expect(readLocalLedger().error).toBeTruthy()
    expect(readLocalBatches()).toEqual([])
    expect(() => writeLocalBatches([batch()])).toThrow()
    expect(storage.getItem(KEY)).toBe(raw)
  })

  it.each([
    { farm: null }, { province: { vi: 'missing en' } }, { timeline: [{}] },
    { labReports: [null] }, { labReports: [{ ...result, timestamp: 1e100, reporter: '' }] },
    { custody: [{ from: 42 }] }, { confidence: '0.9' }, { cadmiumPpm: -1 },
    { riskCause: { vi: {}, en: '' } }, { pendingOwner: {} },
  ])('isolates malformed nested data %j without deleting valid records', malformed => {
    const good = batch('GOOD')
    const raw = JSON.stringify([good, { ...batch('BAD'), ...malformed }])
    storage.setItem(KEY, raw)
    const ledger = readLocalLedger()
    expect(ledger.batches.map(value => value.id)).toEqual(['GOOD'])
    expect(ledger.error).toBeTruthy()
    expect(() => writeLocalBatches(ledger.batches)).toThrow()
    expect(storage.getItem(KEY)).toBe(raw)
  })

  it('reports duplicate ids instead of silently choosing a writable ledger', () => {
    storage.setItem(KEY, JSON.stringify([batch(), batch()]))
    expect(readLocalBatches()).toHaveLength(1)
    expect(readLocalLedger().error).toBeTruthy()
    expect(() => writeLocalBatches([batch()])).toThrow()
  })

  it('does not crash when localStorage cannot be accessed', () => {
    storage.getItem.mockImplementation(() => { throw new Error('SecurityError') })
    expect(readLocalBatches()).toEqual([])
    expect(readLocalLedger().error).toMatch(/unavailable/)
    expect(() => writeLocalBatches([batch()])).toThrow(/unavailable/)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('rejects malformed writes and retains existing records', () => {
    writeLocalBatches([batch()])
    const raw = storage.getItem(KEY)
    expect(() => writeLocalBatches([{ id: 'broken' }])).toThrow(/invalid/)
    expect(() => writeLocalBatches([batch(), batch()])).toThrow(/duplicate/)
    expect(storage.getItem(KEY)).toBe(raw)
  })

  it('surfaces quota/write failures without reporting success', () => {
    writeLocalBatches([batch()])
    const raw = storage.getItem(KEY)
    storage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError') })
    expect(() => writeLocalBatches([batch('NEW')])).toThrow(/full or blocked/)
    expect(storage.getItem(KEY)).toBe(raw)
  })
})
