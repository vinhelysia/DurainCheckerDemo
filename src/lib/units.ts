// BnLike covers BN from @coral-xyz/anchor (has .toNumber()) and plain JS numbers
type BnLike = { toNumber: () => number } | number | null | undefined

export function fromPpm(val: BnLike): number {
  if (val === undefined || val === null) return 0
  const num = typeof (val as { toNumber?: () => number }).toNumber === 'function'
    ? (val as { toNumber: () => number }).toNumber()
    : Number(val)
  return num / 10000
}

export function toPpm(floatVal: number | string | null | undefined): number {
  if (floatVal === undefined || floatVal === null || floatVal === '') return 0
  return Math.round(parseFloat(String(floatVal)) * 10000)
}

export function fromBps(val: BnLike): number {
  if (val === undefined || val === null) return 0
  const num = typeof (val as { toNumber?: () => number }).toNumber === 'function'
    ? (val as { toNumber: () => number }).toNumber()
    : Number(val)
  return num / 10000
}

export function toBps(floatVal: number | string | null | undefined): number {
  if (floatVal === undefined || floatVal === null || floatVal === '') return 0
  return Math.round(parseFloat(String(floatVal)) * 10000)
}
