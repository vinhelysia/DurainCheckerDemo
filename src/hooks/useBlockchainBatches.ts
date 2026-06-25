import { useState, useEffect } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
// @ts-ignore – bs58 is a transitive dep of @coral-xyz/anchor with no bundled types
import bs58 from 'bs58'
import { batches as staticBatches } from '../data/batches'
import { getBatchPda, getTimelinePda, getLabPda } from '../lib/pda'
import { fromPpm, fromBps } from '../lib/units'
import type {
  DurianTrustProgram,
  BatchAccount,
  TimelineEventAccount,
  LabReportAccount,
  UIBatch,
  UIBatchSummary,
  UITimelineEvent,
  UILabReport,
  RiskLevel,
} from '../types'

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high']

// Anchor discriminator for the Batch account type (from IDL)
const BATCH_DISCRIMINATOR = Buffer.from([100, 111, 122, 133, 144, 155, 166, 177])
const MAX_BATCHES = 200

function mapRiskLevel(enumVal: unknown): RiskLevel {
  const index = Number(enumVal)
  return RISK_LEVELS[index] ?? 'low'
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
              { memcmp: { offset: 0, bytes: bs58.encode(BATCH_DISCRIMINATOR) } },
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

        const localBatches: UIBatch[] = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const allBatches = [...staticBatches, ...localBatches]

        const list: UIBatchSummary[] = allBatches.map(b => ({
          id: b.id,
          riskLevel: b.riskLevel as RiskLevel,
        }))
        setBatches(list)

        const matched = allBatches.find(b => b.id === selectedBatchId) || allBatches[0]

        const staticTokenIds: Record<string, number> = {
          'DRN-2026-LD-0428': 8801,
          'DRN-2026-TG-0115': 8802,
          'DRN-2026-DL-0892': 8803,
        }

        let tokenId = staticTokenIds[matched.id]
        if (!tokenId) {
          let sum = 0
          for (let i = 0; i < matched.id.length; i++) sum += matched.id.charCodeAt(i)
          tokenId = 8800 + (sum % 1000)
        }

        const labReports = matched.labReports || [{
          cadmiumPpm: matched.cadmiumPpm,
          thresholdPpm: matched.thresholdPpm,
          aiResult: matched.aiResult,
          confidence: matched.confidence,
          riskLevel: matched.riskLevel,
          riskCause: matched.riskCause,
          timestamp: Math.floor(Date.now() / 1000),
          reporter: 'durian1111111111111111111111111111111111111',
        }]

        const formattedMatched: UIBatch = {
          ...matched,
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
        const b: BatchAccount = await program.account.batch.fetch(batchPda)

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
            status: evt.status === 1 ? 'complete' : 'pending',
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
            confidence: fromBps(r.confidence),
            riskLevel: mapRiskLevel(r.riskLevel),
            riskCause: { vi: r.riskCause, en: r.riskCause },
            timestamp: Number(r.timestamp),
            reporter: r.reporter.toString(),
          }))

        const formattedBatch: UIBatch = {
          id,
          tokenId: Number(b.tokenId),
          farm: { vi: b.farm, en: b.farm },
          province: { vi: b.province, en: b.province },
          harvestDate: b.harvestDate,
          cadmiumPpm: fromPpm(b.cadmiumPpm),
          thresholdPpm: fromPpm(b.thresholdPpm),
          aiResult: { vi: b.aiResult, en: b.aiResult },
          confidence: fromBps(b.confidence),
          riskLevel: mapRiskLevel(b.riskLevel),
          riskCause: { vi: b.riskCause, en: b.riskCause },
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
