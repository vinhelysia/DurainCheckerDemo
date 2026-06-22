import { PublicKey } from '@solana/web3.js'

export function getConfigPda(programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )
  return pda
}

export function getBatchPda(batchId, programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('batch'), Buffer.from(batchId)],
    programId
  )
  return pda
}

export function getTimelinePda(batchId, index, programId) {
  const indexBuf = Buffer.alloc(4)
  indexBuf.writeUInt32LE(index)
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('timeline'), Buffer.from(batchId), indexBuf],
    programId
  )
  return pda
}

export function getLabPda(batchId, index, programId) {
  const indexBuf = Buffer.alloc(4)
  indexBuf.writeUInt32LE(index)
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('lab'), Buffer.from(batchId), indexBuf],
    programId
  )
  return pda
}

export function getFarmerPda(walletPublicKey, programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('farmer'), walletPublicKey.toBuffer()],
    programId
  )
  return pda
}

export function getLabRolePda(walletPublicKey, programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('lab_role'), walletPublicKey.toBuffer()],
    programId
  )
  return pda
}

export function getLogisticsPda(walletPublicKey, programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('logistics'), walletPublicKey.toBuffer()],
    programId
  )
  return pda
}
