import { useState, useEffect } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, utils } from '@coral-xyz/anchor'
import { batches as staticBatches } from '../data/batches'
import { getBatchPda, getTimelinePda, getLabPda, getCustodyPda } from '../lib/pda'
import { readLocalBatches } from '../lib/localLedger'
import { fromPpm } from '../lib/units'
import type {
  DurianTrustProgram,
  BatchAccount,
  TimelineEventAccount,
  LabReportAccount,
  CustodyRecordAccount,
  UIBatch,
  UIBatchSummary,
  UITimelineEvent,
  UILabReport,
  UICustodyRecord,
  CustodyRole,
  RiskLevel,
} from '../types/durian_trust'

// Anchor discriminator for the Batch account type: sha256("account:Batch")[0..8]
const BATCH_DISCRIMINATOR = Buffer.from([156, 194, 70, 44, 22, 88, 137, 44])
const MAX_BATCHES = 200

// 8-byte discriminator + Batch::INIT_SPACE (365) — verified against devnet.
//
// Batches written before the custody fields existed are 69 bytes shorter, and Anchor
// does NOT reject them: buffer-layout reads past the end of the account and silently
// returns zeros, so a stale record decodes "successfully" with an all-zero owner and
// an empty custody chain. Nothing throws — it just renders as live, verified chain
// data that says nobody owns the batch. Size is the only reliable way to tell a
// current record from a legacy one, since the discriminator is unchanged.
//
// Every read path must check it: the list query filters on it, and loadBatchDetails
// re-checks because it fetches by id and never goes through that filter.
export const BATCH_ACCOUNT_SIZE = 373

// Program enum RiskLevel { Safe, Low, Medium, High, Critical } → UI 3-level scale.
// Anchor decodes enums as single-key objects ({ low: {} }); numbers cover legacy data.
const CHAIN_RISK: Record<string, RiskLevel> = {
  safe: 'low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'high',
}
const CHAIN_RISK_BY_INDEX = ['safe', 'low', 'medium', 'high', 'critical']

function mapRiskLevel(enumVal: unknown): RiskLevel {
  if (enumVal && typeof enumVal === 'object') {
    return CHAIN_RISK[Object.keys(enumVal)[0]] ?? 'low'
  }
  return CHAIN_RISK[CHAIN_RISK_BY_INDEX[Number(enumVal)]] ?? 'low'
}

// Program enum CustodyRole { Farmer, Packer, Exporter, Importer, Customs }
const CUSTODY_ROLES: CustodyRole[] = ['farmer', 'packer', 'exporter', 'importer', 'customs']

function mapCustodyRole(enumVal: unknown): CustodyRole {
  if (enumVal && typeof enumVal === 'object') {
    const key = Object.keys(enumVal)[0] as CustodyRole
    return CUSTODY_ROLES.includes(key) ? key : 'farmer'
  }
  return CUSTODY_ROLES[Number(enumVal)] ?? 'farmer'
}

// Program enum TimelineStatus { Pending, InTransit, Delivered, Rejected } → UI complete/pending
function mapTimelineStatus(enumVal: unknown): 'complete' | 'pending' {
  if (enumVal && typeof enumVal === 'object') {
    return 'delivered' in enumVal ? 'complete' : 'pending'
  }
  return Number(enumVal) === 2 ? 'complete' : 'pending'
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries > 0) {
      const delay = 500 + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      return await fn()
    }
    throw err
  }
}

export function useBlockchainBatches(selectedBatchId: string | null | undefined) {
  const [batches, setBatches] = useState<UIBatchSummary[]>([])
  const [activeBatch, setActiveBatch] = useState<UIBatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'chain' | 'fallback'>('fallback')

  useEffect(() => {
    let active = true

    async function init() {
      try {
        setLoading(true)

        const configRes = await fetch(`${import.meta.env.BASE_URL}solana/idl.json`)
        if (!configRes.ok) {
          throw new Error('Could not fetch IDL config')
        }
        const idlData = await configRes.json()

        const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com'
        const connection = new Connection(rpcUrl, 'confirmed')

        const dummyWallet = {
          publicKey: PublicKey.default,
          signTransaction: async (tx: unknown) => tx,
          signAllTransactions: async (txs: unknown[]) => txs,
        }
        const provider = new AnchorProvider(connection, dummyWallet as never, {
          commitment: 'confirmed',
        })

        const program = new Program(idlData, provider) as unknown as DurianTrustProgram

        const { allBatches, targetId } = await withRetry(async () => {
          // Fetch only the first 64 bytes per account (discriminator + id string)
          // to avoid transferring full account data for every batch on-chain.
          const rawAccounts = await connection.getProgramAccounts(program.programId, {
            commitment: 'confirmed',
            dataSlice: { offset: 0, length: 64 },
            filters: [
              { dataSize: BATCH_ACCOUNT_SIZE },
              { memcmp: { offset: 0, bytes: utils.bytes.bs58.encode(BATCH_DISCRIMINATOR) } },
            ],
          })
          const mapped: UIBatchSummary[] = rawAccounts
            .slice(0, MAX_BATCHES)
            .map(acct => {
              const data = Buffer.from(acct.account.data as Buffer)
              const idLen = data.readUInt32LE(8)
              const id = data.slice(12, 12 + Math.min(idLen, 52)).toString('utf8')
              return { id, riskLevel: 'low' as RiskLevel }
            })
            .filter(b => b.id.length > 0)
          const tId = selectedBatchId || (mapped[0] ? mapped[0].id : null)
          return { allBatches: mapped, targetId: tId }
        }, 1)

        if (!active) return

        setBatches(allBatches)
        setSource('chain')

        if (targetId) {
          await withRetry(() => loadBatchDetails(program, connection, targetId), 1)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.warn('Solana blockchain connection failed. Falling back to static data.', err)
        if (!active) return

        const localBatches: UIBatch[] = readLocalBatches()
        const allBatches = [...staticBatches, ...localBatches]

        const list: UIBatchSummary[] = allBatches.map(b => ({
          id: b.id,
          riskLevel: b.riskLevel as RiskLevel,
        }))
        setBatches(list)

        const matched = allBatches.find(b => b.id === selectedBatchId) || allBatches[0]

        const staticTokenIds: Record<string, number> = {
          'DRN-2026-LD-0429': 8801,
          'DRN-2026-TG-0115': 8802,
          'DRN-2026-DL-0892': 8803,
        }

        let tokenId = staticTokenIds[matched.id]
        if (!tokenId) {
          let sum = 0
          for (let i = 0; i < matched.id.length; i++) sum += matched.id.charCodeAt(i)
          tokenId = 8800 + (sum % 1000)
        }

        const matchedRiskLevel = matched.riskLevel as RiskLevel
        const matchedTimeline: UITimelineEvent[] = matched.timeline.map(evt => ({
          ...evt,
          status: evt.status === 'complete' ? 'complete' : 'pending',
        }))

        const labReports: UILabReport[] = matched.labReports || [{
          cadmiumPpm: matched.cadmiumPpm,
          thresholdPpm: matched.thresholdPpm,
          aiResult: matched.aiResult,
          confidence: matched.confidence,
          riskLevel: matchedRiskLevel,
          riskCause: matched.riskCause,
          timestamp: Math.floor(Date.now() / 1000),
          reporter: 'durian1111111111111111111111111111111111111',
        }]

        const formattedMatched: UIBatch = {
          ...matched,
          riskLevel: matchedRiskLevel,
          timeline: matchedTimeline,
          tokenId,
          blockchainHash: 'simulated, not on-chain',
          labReports,
        }

        setActiveBatch(formattedMatched)
        setSource('fallback')
        setLoading(false)
      }
    }

    async function loadBatchDetails(
      program: DurianTrustProgram,
      connection: Connection,
      id: string
    ) {
      try {
        const batchPda = getBatchPda(id, program.programId)

        // Read the raw account rather than program.account.batch.fetch(), because the
        // size is the only thing that distinguishes a current record from a legacy one
        // and fetch() throws that information away. Decoding by hand costs no extra RPC
        // round trip — fetch() would do exactly this getAccountInfo + decode internally.
        const rawBatch = await connection.getAccountInfo(batchPda)
        if (!rawBatch || rawBatch.data.length !== BATCH_ACCOUNT_SIZE) {
          throw new Error(
            `Batch ${id} is not a current-layout on-chain record ` +
            `(${rawBatch ? rawBatch.data.length : 'missing'} bytes, expected ${BATCH_ACCOUNT_SIZE})`
          )
        }
        // 'batch', not 'Batch': the coder keys accounts by the camelCase name Anchor
        // exposes on program.account, not by the PascalCase name in the IDL.
        const b: BatchAccount = program.coder.accounts.decode('batch', rawBatch.data)

        const timelinePdas: PublicKey[] = []
        for (let idx = 0; idx < b.timelineCount; idx++) {
          timelinePdas.push(getTimelinePda(id, idx, program.programId))
        }

        let timelineData: Array<TimelineEventAccount | null> = []
        if (timelinePdas.length > 0) {
          timelineData = await program.account.timelineEvent.fetchMultiple(timelinePdas)
        }

        const formattedTimeline: UITimelineEvent[] = timelineData
          .filter((evt): evt is TimelineEventAccount => evt !== null)
          .map(evt => ({
            stage: { vi: evt.stage, en: evt.stage },
            location: { vi: evt.location, en: evt.location },
            date: evt.date,
            status: mapTimelineStatus(evt.status),
          }))

        let blockchainHash = 'simulated, not on-chain'
        try {
          const localHashes: Record<string, string> = JSON.parse(
            localStorage.getItem('duriantrust_tx_hashes') || '{}'
          )
          if (localHashes[id]) {
            blockchainHash = localHashes[id]
          } else {
            const sigs = await connection.getSignaturesForAddress(batchPda, { limit: 1 })
            blockchainHash = sigs.length > 0 ? sigs[0].signature : 'on-chain (Solana)'
          }
        } catch (e) {
          console.warn('Could not query transaction signature for batch', id, e)
        }

        const labPdas: PublicKey[] = []
        for (let idx = 0; idx < b.labCount; idx++) {
          labPdas.push(getLabPda(id, idx, program.programId))
        }

        let reports: Array<LabReportAccount | null> = []
        if (labPdas.length > 0) {
          reports = await program.account.labReport.fetchMultiple(labPdas)
        }

        const labReports: UILabReport[] = reports
          .filter((r): r is LabReportAccount => r !== null)
          .map(r => ({
            cadmiumPpm: fromPpm(r.cadmiumPpm),
            thresholdPpm: fromPpm(r.thresholdPpm),
            aiResult: { vi: r.aiResult, en: r.aiResult },
            confidence: fromPpm(r.confidence),
            riskLevel: mapRiskLevel(r.riskLevel),
            riskCause: { vi: r.riskCause, en: r.riskCause },
            timestamp: Number(r.timestamp),
            reporter: r.reporter.toString(),
          }))

        const custodyPdas: PublicKey[] = []
        for (let idx = 0; idx < b.custodyCount; idx++) {
          custodyPdas.push(getCustodyPda(id, idx, program.programId))
        }

        let custodyData: Array<CustodyRecordAccount | null> = []
        if (custodyPdas.length > 0) {
          custodyData = await program.account.custodyRecord.fetchMultiple(custodyPdas)
        }

        const custody: UICustodyRecord[] = custodyData
          .filter((c): c is CustodyRecordAccount => c !== null)
          .map(c => ({
            from: c.from.toString(),
            to: c.to.toString(),
            role: mapCustodyRole(c.role),
            location: c.location,
            timestamp: Number(c.timestamp),
          }))

        // Quality fields live in the lab reports, not the Batch account.
        // On-chain index order is authoritative: last report is the latest.
        const primary = labReports.length > 0 ? labReports[labReports.length - 1] : undefined
        const formattedBatch: UIBatch = {
          id,
          tokenId: Number(b.tokenId),
          custody,
          owner: b.owner.toString(),
          pendingOwner: b.pendingOwner ? b.pendingOwner.toString() : null,
          farm: { vi: b.farm, en: b.farm },
          province: { vi: b.province, en: b.province },
          harvestDate: b.harvestDate,
          cadmiumPpm: primary?.cadmiumPpm ?? 0,
          thresholdPpm: primary?.thresholdPpm ?? 0,
          aiResult: primary?.aiResult ?? { vi: '', en: '' },
          confidence: primary?.confidence ?? 0,
          riskLevel: primary?.riskLevel ?? 'low',
          riskCause: primary?.riskCause ?? { vi: '', en: '' },
          timeline: formattedTimeline,
          blockchainHash,
          labReports,
        }

        if (!active) return
        setActiveBatch(formattedBatch)
        setLoading(false)
      } catch (e) {
        console.error('Error fetching active batch details', e)
        throw e
      }
    }

    init()

    return () => {
      active = false
    }
  }, [selectedBatchId])

  return { batches, activeBatch, loading, source }
}
