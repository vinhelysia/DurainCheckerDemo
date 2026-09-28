import { expect, it } from 'vitest'
import { formatDate } from './batches'

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
