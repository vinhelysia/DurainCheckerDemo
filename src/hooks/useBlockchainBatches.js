import { useState, useEffect } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { batches as staticBatches } from '../data/batches'
import { getBatchPda, getTimelinePda, getLabPda } from '../lib/pda'
import { fromPpm, fromBps } from '../lib/units'

// Risk Level mapping
const RISK_LEVELS = ['low', 'medium', 'high']

function mapRiskLevel(enumVal) {
  const index = Number(enumVal)
  return RISK_LEVELS[index] || 'low'
}

async function withRetry(fn, retries = 1) {
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

export function useBlockchainBatches(selectedBatchId) {
  const [batches, setBatches] = useState([])
  const [activeBatch, setActiveBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('fallback') // 'chain' | 'fallback'

  useEffect(() => {
    let active = true

    async function init() {
      try {
        setLoading(true)

        // 1. Fetch Solana program IDL dynamically
        const configRes = await fetch(`${import.meta.env.BASE_URL}solana/idl.json`)
        if (!configRes.ok) {
          throw new Error('Could not fetch IDL config')
        }
        const idlData = await configRes.json()

        const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com'
        const connection = new Connection(rpcUrl, 'confirmed')

        // 2. Setup read-only Anchor provider with dummy wallet
        const dummyWallet = {
          publicKey: PublicKey.default,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        }
        const provider = new AnchorProvider(connection, dummyWallet, {
          commitment: 'confirmed',
        })

        const program = new Program(idlData, provider)

        // 3. Fetch all batch accounts with retry
        const { allBatches, targetId } = await withRetry(async () => {
          const fetchedBatches = await program.account.batch.all()
          const mapped = fetchedBatches.map(item => ({
            id: item.account.id,
            riskLevel: mapRiskLevel(item.account.riskLevel)
          }))
          const tId = selectedBatchId || (mapped[0] ? mapped[0].id : null)
          return { allBatches: mapped, targetId: tId }
        }, 1)

        if (!active) return

        setBatches(allBatches)
        setSource('chain')

        // 4. Fetch details for the selected batch with retry
        if (targetId) {
          await withRetry(() => loadBatchDetails(program, connection, targetId), 1)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.warn('Solana blockchain connection failed. Falling back to static data.', err)
        if (!active) return

        // Offline fallback - load static + locally registered batches
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const allBatches = [...staticBatches, ...localBatches]

        const list = allBatches.map(b => ({
          id: b.id,
          riskLevel: b.riskLevel
        }))
        setBatches(list)

        const matched = allBatches.find(b => b.id === selectedBatchId) || allBatches[0]

        // Map static batches to their corresponding token IDs in fallback mode
        const staticTokenIds = {
          'DRN-2026-LD-0428': 8801,
          'DRN-2026-TG-0115': 8802,
          'DRN-2026-DL-0892': 8803
        }

        let tokenId = staticTokenIds[matched.id]
        if (!tokenId) {
          // generate a deterministic token ID for user created batches
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
          reporter: 'durian1111111111111111111111111111111111111'
        }]

        const formattedMatched = {
          ...matched,
          tokenId: tokenId,
          blockchainHash: 'simulated, not on-chain',
          labReports: labReports
        }

        setActiveBatch(formattedMatched)
        setSource('fallback')
        setLoading(false)
      }
    }

    async function loadBatchDetails(program, connection, id) {
      try {
        const batchPda = getBatchPda(id, program.programId)
        const b = await program.account.batch.fetch(batchPda)

        // Derive TimelineEvent PDAs and fetch
        const timelinePdas = []
        for (let idx = 0; idx < b.timelineCount; idx++) {
          timelinePdas.push(getTimelinePda(id, idx, program.programId))
        }

        let timelineData = []
        if (timelinePdas.length > 0) {
          timelineData = await program.account.timelineEvent.fetchMultiple(timelinePdas)
        }

        const formattedTimeline = timelineData
          .filter(evt => evt !== null)
          .map(evt => ({
            stage: { vi: evt.stage, en: evt.stage },
            location: { vi: evt.location, en: evt.location },
            date: evt.date,
            status: evt.status === 1 ? 'complete' : 'pending'
          }))

        // Resolve transaction signature
        let blockchainHash = 'simulated, not on-chain'
        try {
          const localHashes = JSON.parse(localStorage.getItem('duriantrust_tx_hashes') || '{}')
          if (localHashes[id]) {
            blockchainHash = localHashes[id]
          } else {
            const sigs = await connection.getSignaturesForAddress(batchPda, { limit: 1 })
            if (sigs.length > 0) {
              blockchainHash = sigs[0].signature
            } else {
              blockchainHash = 'on-chain (Solana)'
            }
          }
        } catch (e) {
          console.warn('Could not query transaction signature for batch', id, e)
        }

        // Derive LabReport PDAs and fetch
        const labPdas = []
        for (let idx = 0; idx < b.labCount; idx++) {
          labPdas.push(getLabPda(id, idx, program.programId))
        }

        let reports = []
        if (labPdas.length > 0) {
          reports = await program.account.labReport.fetchMultiple(labPdas)
        }

        const labReports = reports
          .filter(r => r !== null)
          .map(r => ({
            cadmiumPpm: fromPpm(r.cadmiumPpm),
            thresholdPpm: fromPpm(r.thresholdPpm),
            aiResult: { vi: r.aiResult, en: r.aiResult },
            confidence: fromBps(r.confidence),
            riskLevel: mapRiskLevel(r.riskLevel),
            riskCause: { vi: r.riskCause, en: r.riskCause },
            timestamp: Number(r.timestamp),
            reporter: r.reporter.toString()
          }))

        const formattedBatch = {
          id: id,
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
          blockchainHash: blockchainHash,
          labReports: labReports
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
