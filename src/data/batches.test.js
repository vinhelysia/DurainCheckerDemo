import { expect, it } from 'vitest'
import { filterCloudBatches, formatDate, missingCloudBatchFields } from './batches'

it('reports missing record fields without treating a variety and weight as a complete record', () => {
  expect(missingCloudBatchFields({ variety: 'Ri6', weight_kg: 850 })).toEqual(['farm', 'province', 'harvest_date'])
  const batch = { farm: 'TEST', province: 'Lâm Đồng', variety: 'Ri6', harvest_date: '2026-09-30', weight_kg: '850' }
  expect(missingCloudBatchFields(batch)).toEqual([])
  for (const weight of [null, '', 0, -1, 'invalid', Infinity]) expect(missingCloudBatchFields({ ...batch, farm: '  ', weight_kg: weight })).toEqual(['farm', 'weight_kg'])
})

it('filters loaded cloud batches by code, farm or region without changing the rows', () => {
  const rows = [{ code: 'TEST-01', farm: 'Vườn Bình An', province: 'Đắk Lắk' }, { code: 'TEST-02', farm: 'HTX Mẫu', province: 'Lâm Đồng' }]
  for (const language of ['vi', 'en']) {
    for (const term of [' test-01 ', 'BÌNH AN', 'ĐẮK LẮK']) expect(filterCloudBatches(rows, term, language)).toEqual([rows[0]])
    expect(filterCloudBatches(rows, '   ', language)).toEqual(rows)
    expect(filterCloudBatches(rows, 'missing', language)).toEqual([])
    expect(filterCloudBatches([], 'test', language)).toEqual([])
  }
  expect(rows).toHaveLength(2)
})

it('preserves the recorded calendar day for viewers west of UTC', () => {
  const previous = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'
  try {
    expect(formatDate('2026-09-27', 'vi')).toBe('27/09/2026')
    expect(formatDate('2026-09-27', 'en')).toBe('09/27/2026')
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
