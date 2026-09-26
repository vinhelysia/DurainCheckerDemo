import { describe, expect, it } from 'vitest'
import { parseBatchQr } from './batchQr'

describe('QR destinations', () => {
  it('keeps raw codes and legacy links separate from cloud UUIDs', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(parseBatchQr(' DRN-1 ')).toEqual({ id: 'DRN-1', cloud: false })
    expect(parseBatchQr('https://demo.test/#/unit/demo?batchId=DRN-1')).toEqual({ id: 'DRN-1', cloud: false })
    expect(parseBatchQr(`https://demo.test/#/cloud?batchId=${id}`)).toEqual({ id, cloud: true })
    expect(parseBatchQr('https://demo.test/#/cloud?batchId=not-a-uuid').cloud).toBe(false)
    expect(parseBatchQr(`https://untrusted.test/?batchId=${id}`).cloud).toBe(false)
  })
})
