export function fromPpm(val) {
  if (val === undefined || val === null) return 0
  const num = typeof val.toNumber === 'function' ? val.toNumber() : Number(val)
  return num / 10000
}

export function toPpm(floatVal) {
  if (floatVal === undefined || floatVal === null || floatVal === '') return 0
  return Math.round(parseFloat(floatVal) * 10000)
}

export function fromBps(val) {
  if (val === undefined || val === null) return 0
  const num = typeof val.toNumber === 'function' ? val.toNumber() : Number(val)
  return num / 10000
}

export function toBps(floatVal) {
  if (floatVal === undefined || floatVal === null || floatVal === '') return 0
  return Math.round(parseFloat(floatVal) * 10000)
}
