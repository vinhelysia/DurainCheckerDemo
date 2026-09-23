// BnLike covers BN from @coral-xyz/anchor (has .toNumber()) and plain JS numbers
type BnLike = { toNumber: () => number } | number | null | undefined

export const PPM_SCALE = 10000

// Decimal input is parsed without binary floating-point multiplication or rounding.
// Reject precision that the on-chain unit cannot represent; never silently change a measurement.
// The u64 contract supports more, but this UI deliberately stays within JS safe integers.
export function toPpmScaled(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN
  if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) return NaN
  const text = String(value).trim()
  if (text.length > 128) return NaN
  const match = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))$/.exec(text)
  if (!match) return NaN
  const fraction = (match[2] ?? match[3] ?? '').replace(/0+$/, '')
  if (fraction.length > 4) return NaN
  const scaled = BigInt(match[1] || '0') * BigInt(PPM_SCALE) + BigInt(fraction.padEnd(4, '0'))
  return scaled <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(scaled) : NaN
}

// Both ppm and confidence fractions use integer ten-thousandths on chain.
export function fromPpm(val: BnLike): number {
  if (val === undefined || val === null) return 0
  const num = typeof (val as { toNumber?: () => number }).toNumber === 'function'
    ? (val as { toNumber: () => number }).toNumber()
    : Number(val)
  return num / PPM_SCALE
}
