import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', () => ({ useState: initial => [initial, vi.fn()] }))
vi.mock('../lib/pda', () => ({
  getConfigPda: () => 'config', getBatchPda: () => 'batch', getTimelinePda: () => 'timeline',
  getLabPda: () => 'lab', getCustodyPda: () => 'custody', getFarmerPda: () => 'farmer',
  getLabRolePda: () => 'lab-role', getLogisticsPda: () => 'logistics',
}))

import { useBatchTransaction } from './useBatchTransaction'

const rpc = vi.fn()
const accounts = vi.fn(() => ({ rpc }))
const register = vi.fn(() => ({ accounts }))
const update = vi.fn(() => ({ accounts }))
const program = {
  programId: 'program', methods: { registerBatch: register, updateLabReport: update },
  account: { batch: { fetch: vi.fn(async () => ({ labCount: 1 })) } },
}

function useTransactionHarness() {
  return useBatchTransaction({
    program, wallet: { publicKey: 'wallet' }, providerMode: 'chain', language: 'en',
    account: 'wallet', activeRoles: { isOwner: false, isLogistics: false }, setReloadTrigger: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue('mock-signature-not-a-real-transaction')
})

describe('fixed-point transaction boundary (mock RPC, not chain E2E)', () => {
  it.each([['0.0449', 449, 'low'], ['0.045', 450, 'medium'], ['0.0451', 451, 'medium'], ['0.050', 500, 'high']])('encodes register and lab input %s with the same rule and units', async (input, units, risk) => {
    const tx = useTransactionHarness()
    expect(await tx.registerBatch('batch', 'farm', 'farm', 'province', 'province', '2026-09-16', input, {})).toBe(true)
    expect(register.mock.calls[0][4].toNumber()).toBe(units)
    expect(register.mock.calls[0][5].toNumber()).toBe(500)
    expect(register.mock.calls[0][7]).toEqual({ [risk]: {} })
    expect(await tx.updateLabReport('batch', input, '0.050', {})).toBe(true)
    expect(update.mock.calls[0][1].toNumber()).toBe(units)
    expect(update.mock.calls[0][2].toNumber()).toBe(500)
    expect(update.mock.calls[0][4]).toEqual({ [risk]: {} })
  })

  it.each([-1, NaN, Infinity, '', 'abc', null, undefined, '0.04999', '900719925474.0992'])('does not call RPC for invalid input %s even with a forged audit', async input => {
    const tx = useTransactionHarness()
    const forged = { valid: true, riskLevel: 'low', confidence: 100 }
    expect(await tx.registerBatch('batch', 'farm', 'farm', 'province', 'province', '2026-09-16', input, forged)).toBe(false)
    expect(await tx.updateLabReport('batch', input, '0.050', forged)).toBe(false)
    expect(register).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
})
