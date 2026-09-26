import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Capture state updates without a DOM renderer: these regressions concern the
// asynchronous RPC/storage effect, not React rendering or component lifecycle.
const mocks = vi.hoisted(() => ({
  state: [],
  effects: [],
  getProgramAccounts: vi.fn(),
  getAccountInfo: vi.fn(),
  getSignaturesForAddress: vi.fn(),
  decode: vi.fn(),
  reports: vi.fn(),
  readLocalLedger: vi.fn(),
}))

vi.mock('react', () => ({
  useState(initial) {
    const index = mocks.state.length
    mocks.state.push(initial)
    return [initial, value => {
      mocks.state[index] = typeof value === 'function' ? value(mocks.state[index]) : value
    }]
  },
  useEffect(effect) { mocks.effects.push(effect) },
}))

vi.mock('@solana/web3.js', () => ({
  PublicKey: { default: 'wallet' },
  Connection: class {
    getProgramAccounts = mocks.getProgramAccounts
    getAccountInfo = mocks.getAccountInfo
    getSignaturesForAddress = mocks.getSignaturesForAddress
  },
}))

vi.mock('@coral-xyz/anchor', () => ({
  AnchorProvider: class {},
  Program: class {
    programId = 'program'
    coder = { accounts: { decode: mocks.decode } }
    account = { labReport: { fetchMultiple: mocks.reports } }
  },
  utils: { bytes: { bs58: { encode: () => 'discriminator' } } },
}))

vi.mock('../lib/pda', () => ({
  getBatchPda: id => id,
  getLabPda: (id, index) => `${id}/lab/${index}`,
  getTimelinePda: (id, index) => `${id}/timeline/${index}`,
  getCustodyPda: (id, index) => `${id}/custody/${index}`,
}))

vi.mock('../lib/localLedger', () => ({ readLocalLedger: mocks.readLocalLedger }))

import { BATCH_ACCOUNT_SIZE, useBlockchainBatches } from './useBlockchainBatches'

const demoId = 'DRN-2026-LD-0429'
const chainId = 'CHAIN-001'

function listedAccount(id) {
  const data = Buffer.alloc(64)
  data.writeUInt32LE(Buffer.byteLength(id), 8)
  data.write(id, 12)
  return { account: { data } }
}

function currentState() {
  const [batches, activeBatch, loading, source, storageError, lookupMissing] = mocks.state
  return { batches, activeBatch, loading, source, storageError, lookupMissing }
}

function useStart(selectedId) {
  useBlockchainBatches(selectedId)
  return mocks.effects[0]()
}

const lowReport = {
  cadmiumPpm: 100,
  thresholdPpm: 500,
  aiResult: 'Low cadmium',
  confidence: 0,
  riskLevel: { low: {} },
  riskCause: 'Below threshold',
  timestamp: 1,
  reporter: 'lab',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  mocks.state.length = 0
  mocks.effects.length = 0
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.getProgramAccounts.mockResolvedValue([listedAccount(chainId)])
  mocks.getAccountInfo.mockResolvedValue({ data: Buffer.alloc(BATCH_ACCOUNT_SIZE) })
  mocks.getSignaturesForAddress.mockResolvedValue([])
  mocks.decode.mockReturnValue({
    tokenId: 1, owner: 'owner', pendingOwner: null,
    farm: 'Farm', province: 'Province', harvestDate: '2026-09-01',
    timelineCount: 0, custodyCount: 0, labCount: 0,
  })
  mocks.reports.mockResolvedValue([])
  mocks.readLocalLedger.mockReturnValue({ batches: [], error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useBlockchainBatches data provenance and missing results', () => {
  it('does not replace an unknown requested ID with a demo when RPC fails', async () => {
    mocks.getProgramAccounts.mockRejectedValue(new Error('RPC unavailable'))
    useStart('UNKNOWN-QR-ID')
    await vi.runAllTimersAsync()

    expect(currentState()).toMatchObject({
      activeBatch: null, loading: false, source: 'fallback', lookupMissing: true,
    })
    expect(currentState().batches.length).toBeGreaterThan(0)
  })

  it('surfaces a corrupt ledger error while still showing a requested demo', async () => {
    mocks.getProgramAccounts.mockRejectedValue(new Error('RPC unavailable'))
    mocks.readLocalLedger.mockReturnValue({ batches: [], error: 'Corrupt local ledger' })
    useStart(demoId)
    await vi.runAllTimersAsync()

    expect(currentState()).toMatchObject({
      activeBatch: { id: demoId, blockchainHash: 'simulated, not on-chain' },
      storageError: 'Corrupt local ledger', loading: false,
      source: 'fallback', lookupMissing: false,
    })
  })

  it('keeps list risk unknown until the selected batch report is loaded', async () => {
    let resolveAccount
    mocks.getAccountInfo.mockReturnValue(new Promise(resolve => { resolveAccount = resolve }))
    mocks.decode.mockReturnValue({ ...mocks.decode(), labCount: 1 })
    mocks.reports.mockResolvedValue([lowReport])
    useStart(chainId)
    await vi.advanceTimersByTimeAsync(0)

    expect(currentState()).toMatchObject({
      batches: [{ id: chainId, riskLevel: 'unknown' }],
      activeBatch: null, source: 'chain', loading: true,
    })

    resolveAccount({ data: Buffer.alloc(BATCH_ACCOUNT_SIZE) })
    await vi.runAllTimersAsync()
    expect(currentState()).toMatchObject({
      batches: [{ id: chainId, riskLevel: 'low' }],
      activeBatch: { id: chainId, riskLevel: 'low' }, loading: false,
    })
  })

  it('keeps risk unknown for a chain batch with no lab reports', async () => {
    useStart(chainId)
    await vi.runAllTimersAsync()

    expect(currentState()).toMatchObject({
      batches: [{ id: chainId, riskLevel: 'unknown' }],
      activeBatch: { id: chainId, riskLevel: 'unknown', labReports: [] },
      loading: false, source: 'chain',
    })
    expect(mocks.reports).not.toHaveBeenCalled()
  })

  it('shows demo data when the RPC never responds', async () => {
    mocks.getProgramAccounts.mockReturnValue(new Promise(() => {}))
    useStart(demoId)
    await vi.advanceTimersByTimeAsync(10_000)

    expect(currentState()).toMatchObject({
      activeBatch: { id: demoId, blockchainHash: 'simulated, not on-chain' },
      loading: false, source: 'fallback',
    })
  })

  it('does not repeat unsupported claims from an old on-chain report', async () => {
    mocks.decode.mockReturnValue({ ...mocks.decode(), labCount: 1 })
    mocks.reports.mockResolvedValue([{
      ...lowReport, aiResult: 'Export ready', riskCause: 'Yellow O clear', confidence: 9400,
    }])
    useStart(chainId)
    await vi.runAllTimersAsync()

    expect(currentState().activeBatch).toMatchObject({
      riskLevel: 'low', confidence: 0,
      aiResult: { en: 'Below comparison threshold' },
      riskCause: { en: 'Cadmium below comparison threshold (< 0.05 ppm)' },
      labReports: [{ aiResult: { en: 'Export ready' } }],
    })
  })

  it('does not use an older low report when the latest indexed report is missing', async () => {
    mocks.decode.mockReturnValue({ ...mocks.decode(), labCount: 2 })
    mocks.reports.mockResolvedValue([lowReport, null])
    useStart(chainId)
    await vi.runAllTimersAsync()

    expect(mocks.reports).toHaveBeenCalledWith([`${chainId}/lab/0`, `${chainId}/lab/1`])
    expect(currentState()).toMatchObject({
      batches: [{ id: chainId, riskLevel: 'unknown' }],
      activeBatch: { riskLevel: 'unknown', aiResult: { vi: '', en: '' } },
      loading: false, source: 'chain',
    })
    expect(currentState().activeBatch.labReports).toHaveLength(1)
  })
})
