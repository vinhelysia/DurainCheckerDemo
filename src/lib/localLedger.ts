// Demo fallback "simulated ledger" persisted in localStorage when no chain is reachable.
const KEY = 'duriantrust_local_batches'

// Batches bundled in src/data/batches.js — shown alongside the ledger, never written to it.
export const STATIC_BATCH_IDS = ['DRN-2026-LD-0428', 'DRN-2026-TG-0115', 'DRN-2026-DL-0892']

export function readLocalBatches() {
  return JSON.parse(localStorage.getItem(KEY) || '[]')
}

export function writeLocalBatches(batches: unknown[]) {
  localStorage.setItem(KEY, JSON.stringify(batches))
}
