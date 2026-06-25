import { PublicKey } from '@solana/web3.js'

export function getConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )
  return pda
}

export function getBatchPda(batchId: string, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('batch'), Buffer.from(batchId)],
    programId
  )
  return pda
}

export function getTimelinePda(batchId: string, index: number, programId: PublicKey): PublicKey {
  const indexBuf = Buffer.alloc(4)
  indexBuf.writeUInt32LE(index)
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('timeline'), Buffer.from(batchId), indexBuf],
    programId
  )
  return pda
}

export function getLabPda(batchId: string, index: number, programId: PublicKey): PublicKey {
  const indexBuf = Buffer.alloc(4)
  indexBuf.writeUInt32LE(index)
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('lab'), Buffer.from(batchId), indexBuf],
    programId
  )
  return pda
}

export function getFarmerPda(walletPublicKey: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('farmer'), walletPublicKey.toBuffer()],
    programId
  )
  return pda
}

export function getLabRolePda(walletPublicKey: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('lab_role'), walletPublicKey.toBuffer()],
    programId
  )
  return pda
}

export function getLogisticsPda(walletPublicKey: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('logistics'), walletPublicKey.toBuffer()],
    programId
  )
  return pda
}
