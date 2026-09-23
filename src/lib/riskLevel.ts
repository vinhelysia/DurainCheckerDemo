import type { RiskLevel } from '../types/durian_trust'

const levels: Record<string, RiskLevel> = {
  safe: 'low', low: 'low', medium: 'medium', high: 'high', critical: 'high',
}
const indices = ['safe', 'low', 'medium', 'high', 'critical']

export function mapRiskLevel(value: unknown): RiskLevel {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return levels[indices[value]] ?? 'unknown'
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1) return levels[keys[0]] ?? 'unknown'
  }
  return 'unknown'
}
