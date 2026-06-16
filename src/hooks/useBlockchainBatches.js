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
        const configRes = await fetch('/contracts/DurianTrust.json')
        if (!configRes.ok) {
          throw new Error('Could not fetch contract config')
        }
        const contractConfig = await configRes.json()

        if (!contractConfig.address || contractConfig.address === '0x0000000000000000000000000000000000000000') {
          throw new Error('Contract address is not yet set')
        }

        // Try connecting to the local Hardhat node via Vite proxy `/rpc` first.
        // If that fails, try http://127.0.0.1:8545 directly.
        let provider
        try {
          provider = new JsonRpcProvider('/rpc')
          await provider.getNetwork()
        } catch (e) {
          console.warn('Vite proxy /rpc failed, attempting direct localhost:8545...', e)
          provider = new JsonRpcProvider('http://127.0.0.1:8545')
          await provider.getNetwork()
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
        await loadBatchDetails(contract, selectedBatchId || ids[0])
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

        const formattedMatched = {
          ...matched,
          tokenId: tokenId
        }

        setActiveBatch(formattedMatched)
        setSource('fallback')
        setLoading(false)
      }
    }

    async function loadBatchDetails(contract, id) {
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
          blockchainHash: '0x' + id.split('').map(c => c.charCodeAt(0).toString(16)).join('').slice(0, 16) + '...verify'
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
