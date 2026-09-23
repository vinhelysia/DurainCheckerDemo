import type { UIBatch } from '../types/durian_trust'

// Demo fallback "simulated ledger" persisted in localStorage when no chain is reachable.
const KEY = 'duriantrust_local_batches'

// Batches bundled in src/data/batches.js — shown alongside the ledger, never written to it.
export const STATIC_BATCH_IDS = ['DRN-2026-LD-0429', 'DRN-2026-TG-0115', 'DRN-2026-DL-0892']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const isText = (value: unknown) => typeof value === 'string'
const isLocalized = (value: unknown) => isRecord(value) && isText(value.vi) && isText(value.en)
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const isRisk = (value: unknown) => ['low', 'medium', 'high', 'unknown'].includes(value as string)
const isTimestamp = (value: unknown) => isNumber(value) && Number.isFinite(new Date(Number(value) * 1000).getTime())

function isLabResult(value: Record<string, unknown>) {
  return isNumber(value.cadmiumPpm) && Number(value.cadmiumPpm) >= 0 &&
    isNumber(value.thresholdPpm) && Number(value.thresholdPpm) > 0 &&
    isNumber(value.confidence) && Number(value.confidence) >= 0 && Number(value.confidence) <= 1 &&
    isRisk(value.riskLevel) && isLocalized(value.aiResult) && isLocalized(value.riskCause)
}

function isBatch(value: unknown): value is UIBatch {
  if (!isRecord(value)) return false
  return isText(value.id) && String(value.id).trim().length > 0 &&
    isLocalized(value.farm) && isLocalized(value.province) &&
    isText(value.harvestDate) && isText(value.blockchainHash) && isLabResult(value) &&
    (value.tokenId === undefined || isNumber(value.tokenId)) &&
    Array.isArray(value.timeline) && value.timeline.every(event =>
      isRecord(event) && isLocalized(event.stage) && isLocalized(event.location) &&
      isText(event.date) && ['complete', 'pending'].includes(event.status as string)) &&
    (value.labReports === undefined || (Array.isArray(value.labReports) && value.labReports.every(report =>
      isRecord(report) && isLabResult(report) && isTimestamp(report.timestamp) && isText(report.reporter)))) &&
    (value.owner === undefined || isText(value.owner)) &&
    (value.pendingOwner == null || isText(value.pendingOwner)) &&
    (value.custody === undefined || (Array.isArray(value.custody) && value.custody.every(hop =>
      isRecord(hop) && isText(hop.from) && isText(hop.to) && isText(hop.location) &&
      isTimestamp(hop.timestamp) && ['farmer', 'packer', 'exporter', 'importer', 'customs'].includes(hop.role as string))))
}

export function readLocalLedger(): { batches: UIBatch[]; error: string | null } {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return { batches: [], error: 'Local storage is unavailable. Local demo batches cannot be read or saved.' }
  }
  if (raw === null) return { batches: [], error: null }

  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch {
    return { batches: [], error: 'Local demo ledger contains invalid JSON. Stored data has been preserved; restore it before saving.' }
  }
  if (!Array.isArray(stored)) {
    return { batches: [], error: 'Local demo ledger must contain a batch list. Stored data has been preserved; restore it before saving.' }
  }

  const ids = new Set<string>()
  const batches: UIBatch[] = []
  for (const entry of stored) {
    if (isBatch(entry) && !ids.has(entry.id)) {
      ids.add(entry.id)
      batches.push({ ...entry, tokenId: entry.tokenId ?? 0, labReports: entry.labReports ?? [] })
    }
  }
  return {
    batches,
    error: batches.length === stored.length ? null :
      'Some local demo batches are invalid or duplicated and cannot be displayed. Stored data has been preserved; restore it before saving.',
  }
}

export function readLocalBatches() {
  return readLocalLedger().batches
}

export function writeLocalBatches(batches: unknown[]) {
  const { error } = readLocalLedger()
  if (error) throw new Error(error)
  if (!Array.isArray(batches) || !batches.every(isBatch) || new Set(batches.map(batch => batch.id)).size !== batches.length) {
    throw new Error('Cannot save invalid or duplicate local demo batches. Existing stored data has been preserved.')
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(batches))
  } catch {
    throw new Error('Cannot save local demo batches. Local storage may be full or blocked; no success has been recorded.')
  }
}
