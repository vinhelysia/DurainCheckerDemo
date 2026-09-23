import { createHash } from 'node:crypto'

export const DOMAIN_V2 = Buffer.from('durian-trust:lab-attestation:v2')
export function u32(value) {
  const bytes = Buffer.alloc(4)
  bytes.writeUInt32LE(value)
  return bytes
}
function u64(value) {
  const bytes = Buffer.alloc(8)
  bytes.writeBigUInt64LE(BigInt(value.toString()))
  return bytes
}
function string(value) {
  const bytes = Buffer.from(value, 'utf8')
  return Buffer.concat([u32(bytes.length), bytes])
}
export function payloadHashV2({ programId, batchId, reportIndex, cadmium, threshold, confidence, risk, aiResult, riskCause, reporter, domain = DOMAIN_V2 }) {
  return createHash('sha256').update(Buffer.concat([
    domain, programId.toBuffer(), string(batchId), u32(reportIndex),
    u64(cadmium), u64(threshold), u64(confidence), Buffer.from([risk]),
    string(aiResult), string(riskCause), reporter.toBuffer(),
  ])).digest()
}
export function payloadHashV1({ batchId, cadmium, threshold, confidence, risk, aiResult, riskCause, reporter }) {
  return createHash('sha256').update(Buffer.concat([
    Buffer.from(batchId), u64(cadmium), u64(threshold), u64(confidence),
    Buffer.from([risk]), Buffer.from(aiResult), Buffer.from(riskCause), reporter.toBuffer(),
  ])).digest()
}
