// BnLike covers BN from @coral-xyz/anchor (has .toNumber()) and plain JS numbers
type BnLike = { toNumber: () => number } | number | null | undefined

// On-chain percentages are stored as integer ten-thousandths (e.g. 9500 → 0.95).
export function fromPpm(val: BnLike): number {
  if (val === undefined || val === null) return 0
  const num = typeof (val as { toNumber?: () => number }).toNumber === 'function'
    ? (val as { toNumber: () => number }).toNumber()
    : Number(val)
  return num / 10000
}
