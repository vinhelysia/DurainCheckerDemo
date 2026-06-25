import { describe, it, expect } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import {
  getConfigPda,
  getBatchPda,
  getTimelinePda,
  getLabPda,
  getFarmerPda,
  getLabRolePda,
  getLogisticsPda,
} from './pda.ts'

// Any valid program ID works for PDA derivation tests
const PROG = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')
const WALLET_A = new PublicKey('So11111111111111111111111111111111111111112')
const WALLET_B = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

function u32le(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}

describe('pda.js — getConfigPda', () => {
  it('is deterministic', () => {
    expect(getConfigPda(PROG).equals(getConfigPda(PROG))).toBe(true)
  })

  it('matches seeds [b"config"]', () => {
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROG)
    expect(getConfigPda(PROG).equals(expected)).toBe(true)
  })

  it('returns a PublicKey', () => {
    expect(getConfigPda(PROG)).toBeInstanceOf(PublicKey)
  })
})

describe('pda.js — getBatchPda', () => {
  it('differs by batch ID', () => {
    const a = getBatchPda('DRN-001', PROG)
    const b = getBatchPda('DRN-002', PROG)
    expect(a.equals(b)).toBe(false)
  })

  it('matches seeds [b"batch", id]', () => {
    const id = 'DRN-2025-001'
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('batch'), Buffer.from(id)],
      PROG
    )
    expect(getBatchPda(id, PROG).equals(expected)).toBe(true)
  })
})

describe('pda.js — getTimelinePda', () => {
  it('differs by index', () => {
    const a = getTimelinePda('DRN-001', 0, PROG)
    const b = getTimelinePda('DRN-001', 1, PROG)
    expect(a.equals(b)).toBe(false)
  })

  it('differs by batch ID', () => {
    const a = getTimelinePda('DRN-001', 0, PROG)
    const b = getTimelinePda('DRN-002', 0, PROG)
    expect(a.equals(b)).toBe(false)
  })

  it('uses 4-byte little-endian encoding for index (matches on-chain u32 seed)', () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('timeline'), Buffer.from('DRN-001'), u32le(0)],
      PROG
    )
    expect(getTimelinePda('DRN-001', 0, PROG).equals(expected)).toBe(true)
  })

  it('index 255 and 256 produce different PDAs (not single-byte overflow)', () => {
    const a = getTimelinePda('DRN-001', 255, PROG)
    const b = getTimelinePda('DRN-001', 256, PROG)
    expect(a.equals(b)).toBe(false)
  })
})

describe('pda.js — getLabPda', () => {
  it('differs by index', () => {
    const a = getLabPda('DRN-001', 0, PROG)
    const b = getLabPda('DRN-001', 1, PROG)
    expect(a.equals(b)).toBe(false)
  })

  it('uses 4-byte little-endian encoding for index', () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('lab'), Buffer.from('DRN-001'), u32le(3)],
      PROG
    )
    expect(getLabPda('DRN-001', 3, PROG).equals(expected)).toBe(true)
  })

  it('lab PDA does not collide with timeline PDA at the same index', () => {
    expect(getLabPda('DRN-001', 0, PROG).equals(getTimelinePda('DRN-001', 0, PROG))).toBe(false)
  })
})

describe('pda.js — role PDAs', () => {
  it('getFarmerPda differs by wallet', () => {
    expect(getFarmerPda(WALLET_A, PROG).equals(getFarmerPda(WALLET_B, PROG))).toBe(false)
  })

  it('getLabRolePda matches seeds [b"lab_role", wallet]', () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('lab_role'), WALLET_A.toBuffer()],
      PROG
    )
    expect(getLabRolePda(WALLET_A, PROG).equals(expected)).toBe(true)
  })

  it('getLogisticsPda matches seeds [b"logistics", wallet]', () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('logistics'), WALLET_A.toBuffer()],
      PROG
    )
    expect(getLogisticsPda(WALLET_A, PROG).equals(expected)).toBe(true)
  })

  it('farmer, lab_role, and logistics PDAs do not collide for the same wallet', () => {
    const f = getFarmerPda(WALLET_A, PROG)
    const l = getLabRolePda(WALLET_A, PROG)
    const g = getLogisticsPda(WALLET_A, PROG)
    expect(f.equals(l)).toBe(false)
    expect(f.equals(g)).toBe(false)
    expect(l.equals(g)).toBe(false)
  })
})
