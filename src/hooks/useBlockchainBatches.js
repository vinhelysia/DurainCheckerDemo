import { useState, useEffect } from 'react'
import { Contract, JsonRpcProvider } from 'ethers'
import { batches as staticBatches } from '../data/batches'

// Risk Level mapping
const RISK_LEVELS = ['low', 'medium', 'high']

function mapRiskLevel(enumVal) {
  const index = Number(enumVal)
  return RISK_LEVELS[index] || 'low'
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

        // 1. Fetch contract address and ABI dynamically at runtime
        const configRes = await fetch(`${import.meta.env.BASE_URL}contracts/DurianTrust.json`)
        if (!configRes.ok) {
          throw new Error('Could not fetch contract config')
        }
        const contractConfig = await configRes.json()

        if (!contractConfig.address || contractConfig.address === '0x0000000000000000000000000000000000000000') {
          throw new Error('Contract address is not yet set')
        }

        const deployBlock = contractConfig.deployBlock || 0

        // Try connecting to the RPC provider from env, Vite proxy `/rpc`, or localhost:8545
        let provider
        try {
          const rpcUrl = import.meta.env.VITE_RPC_URL || '/rpc'
          provider = new JsonRpcProvider(rpcUrl)
          await provider.getNetwork()
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn('VITE_RPC_URL or proxy /rpc failed, attempting direct localhost:8545...', e)
            provider = new JsonRpcProvider('http://127.0.0.1:8545')
            await provider.getNetwork()
          } else {
            throw e
          }
        }

        const contract = new Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        )

        // 2. Fetch all batch IDs
        const ids = await contract.getBatchIds()

        // 3. Fetch basic info for all batches (for tabs)
        const allBatches = []
        for (const id of ids) {
          const b = await contract.getBatch(id)
          allBatches.push({
            id: id,
            riskLevel: mapRiskLevel(b.riskLevel)
          })
        }

        if (!active) return

        setBatches(allBatches)
        setSource('chain')

        // 4. Fetch full details for the selected batch
        await loadBatchDetails(contract, selectedBatchId || ids[0], deployBlock)
      } catch (err) {
        console.warn('Blockchain connection failed. Falling back to static data.', err)
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
          reporter: '0xDevSimulatorAccountAddress000000000000'
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

    async function loadBatchDetails(contract, id, deployBlock) {
      try {
        const b = await contract.getBatch(id)
        const timelineData = await contract.getTimeline(id)

        // Fetch tokenId from contract for the batch
        let tokenId = 0
        try {
          const tId = await contract.getTokenIdByBatchId(id)
          tokenId = Number(tId)
        } catch (e) {
          console.warn('Could not resolve tokenId for batch', id, e)
        }

        const formattedTimeline = timelineData.map(evt => ({
          stage: { vi: evt.stageVi, en: evt.stageEn },
          location: { vi: evt.locationVi, en: evt.locationEn },
          date: evt.date,
          status: evt.status === 1 ? 'complete' : 'pending'
        }))

        let blockchainHash = 'simulated, not on-chain'
        try {
          const localHashes = JSON.parse(localStorage.getItem('duriantrust_tx_hashes') || '{}')
          if (localHashes[id]) {
            blockchainHash = localHashes[id]
          } else {
            const filter = contract.filters.BatchRegistered(id)
            const events = await contract.queryFilter(filter, deployBlock || 0, 'latest')
            if (events.length > 0) {
              blockchainHash = events[0].transactionHash
            }
          }
        } catch (e) {
          console.warn('Could not query transaction hash for batch', id, e)
        }

        let labReports = []
        try {
          const reports = await contract.getLabReportHistory(id)
          labReports = reports.map(r => ({
            cadmiumPpm: Number(r.cadmiumPpm) / 10000,
            thresholdPpm: Number(r.thresholdPpm) / 10000,
            aiResult: { vi: r.aiResultVi, en: r.aiResultEn },
            confidence: Number(r.confidence) / 10000,
            riskLevel: mapRiskLevel(r.riskLevel),
            riskCause: { vi: r.riskCauseVi, en: r.riskCauseEn },
            timestamp: Number(r.timestamp),
            reporter: r.reporter
          }))
        } catch (e) {
          console.warn('Could not fetch lab report history for batch', id, e)
        }

        const formattedBatch = {
          id: id,
          tokenId: tokenId,
          farm: { vi: b.farmVi, en: b.farmEn },
          province: { vi: b.provinceVi, en: b.provinceEn },
          harvestDate: b.harvestDate,
          cadmiumPpm: Number(b.cadmiumPpm) / 10000,
          thresholdPpm: Number(b.thresholdPpm) / 10000,
          aiResult: { vi: b.aiResultVi, en: b.aiResultEn },
          confidence: Number(b.confidence) / 10000,
          riskLevel: mapRiskLevel(b.riskLevel),
          riskCause: { vi: b.riskCauseVi, en: b.riskCauseEn },
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
