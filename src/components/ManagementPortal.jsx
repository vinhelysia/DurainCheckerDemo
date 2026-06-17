import { useState, useEffect } from 'react'
import { BrowserProvider, JsonRpcProvider, Contract } from 'ethers'
import { useLanguage } from './LanguageContext'
import { Sprout, Plus, Compass, ShieldCheck, Cpu, Wallet, Send, CheckCircle2, AlertTriangle, FileText, ArrowLeft, RefreshCw, X, ShieldAlert, Award } from 'lucide-react'
import BatchQRLabel from './BatchQRLabel'

const RISK_LEVELS = ['low', 'medium', 'high']

function mapRiskLevel(enumVal) {
  const index = Number(enumVal)
  return RISK_LEVELS[index] || 'low'
}

export default function ManagementPortal() {
  const { language, copy } = useLanguage()
  
  // Navigation back to home
  const handleBackToHome = (e) => {
    e.preventDefault()
    window.location.hash = '#/'
  }

  // State
  const [contractInfo, setContractInfo] = useState(null)
  const [account, setAccount] = useState('')
  const [providerMode, setProviderMode] = useState('fallback') // 'chain' | 'fallback'
  const [loading, setLoading] = useState(false)
  const [txMessage, setTxMessage] = useState({ text: '', type: '' }) // type: 'success' | 'error' | 'info'
  const [registeredIds, setRegisteredIds] = useState([])
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Gating & Roles
  const [userRoles, setUserRoles] = useState({
    isOwner: false,
    isFarmer: false,
    isLab: false,
    isLogistics: false
  })
  const [simulatedRole, setSimulatedRole] = useState('owner') // 'owner' | 'farmer' | 'lab' | 'logistics' | 'norole'
  const [activeTab, setActiveTab] = useState('farmer') // 'farmer' | 'lab' | 'logistics' | 'admin'

  // Registration Form State (Farmer)
  const [batchId, setBatchId] = useState('')
  const [farmVi, setFarmVi] = useState('')
  const [farmEn, setFarmEn] = useState('')
  const [provinceVi, setProvinceVi] = useState('Lâm Đồng')
  const [provinceEn, setProvinceEn] = useState('Lam Dong')
  const [harvestDate, setHarvestDate] = useState('')
  const [cadmiumPpm, setCadmiumPpm] = useState('0.030')
  const [violations, setViolations] = useState(0)
  const [rainfall, setRainfall] = useState(150)
  const [aiPredicting, setAiPredicting] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState('')
  const [newlyRegisteredBatchId, setNewlyRegisteredBatchId] = useState('')

  // Disease Risk Form State (Farmer/Extension)
  const [temperature, setTemperature] = useState('28.0')
  const [humidity, setHumidity] = useState('80.0')
  const [leafWetness, setLeafWetness] = useState('6.0')
  const [soilDrainage, setSoilDrainage] = useState('good')
  const [treeAge, setTreeAge] = useState('8.0')
  const [priorInfection, setPriorInfection] = useState(0) // 0 or 1
  const [diseasePredicting, setDiseasePredicting] = useState(false)
  const [diseaseResult, setDiseaseResult] = useState(null)
  const [diseaseError, setDiseaseError] = useState('')

  // Timeline Form State (Logistics)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [stageVi, setStageVi] = useState('Thu hoạch')
  const [stageEn, setStageEn] = useState('Harvest')
  const [locationVi, setLocationVi] = useState('')
  const [locationEn, setLocationEn] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStatus, setEventStatus] = useState(1) // 1 = Complete, 0 = Pending

  // Lab Report Form State (Lab)
  const [cadmiumPpmLab, setCadmiumPpmLab] = useState('0.030')
  const [thresholdPpmLab, setThresholdPpmLab] = useState('0.050')
  const [labHistory, setLabHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Role Management State (Admin/Owner)
  const [targetAddress, setTargetAddress] = useState('')
  const [targetRole, setTargetRole] = useState('farmer') // 'farmer' | 'lab' | 'logistics'

  // Provinces mapping for auto-translation
  const PROVINCES = {
    'Lâm Đồng': 'Lam Dong',
    'Tiền Giang': 'Tien Giang',
    'Đắk Lắk': 'Dak Lak',
    'Bến Tre': 'Ben Tre',
    'Đồng Nai': 'Dong Nai'
  }

  // Pre-fill mock button helper
  const handlePreFill = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    setBatchId(`DRN-2026-TG-${randomNum}`)
    setFarmVi('Hợp tác xã Mỹ Tho')
    setFarmEn('My Tho Cooperative')
    setProvinceVi('Tiền Giang')
    setProvinceEn('Tien Giang')
    setHarvestDate(new Date().toISOString().split('T')[0])
    
    const randomCd = (Math.random() * 0.07 + 0.01).toFixed(3)
    setCadmiumPpm(randomCd)
    setViolations(Math.floor(Math.random() * 4))
    setRainfall(Math.floor(Math.random() * 250 + 50))

    // Pre-fill environmental details for pathogen prediction
    setTemperature((Math.random() * 12 + 20).toFixed(1))
    setHumidity((Math.random() * 40 + 60).toFixed(1))
    setLeafWetness((Math.random() * 18 + 1).toFixed(1))
    setSoilDrainage(['good', 'medium', 'poor'][Math.floor(Math.random() * 3)])
    setTreeAge((Math.random() * 20 + 2).toFixed(1))
    setPriorInfection(Math.random() > 0.7 ? 1 : 0)

    setTxMessage({ text: '', type: '' })
  }

  // Pure quality audit auditor (reused across Farmer/Lab forms)
  const runRuleAuditor = (cdVal) => {
    const cd = parseFloat(cdVal) || 0
    const cdInt = Math.round(cd * 1000)
    let riskLevel = 'low'
    let ruleResultVi = 'Đạt chuẩn xuất khẩu'
    let ruleResultEn = 'Export-ready'
    let confidence = 90 + (cdInt % 9)
    let riskCauseVi = 'Cadimi và Vàng O trong ngưỡng cho phép'
    let riskCauseEn = 'Cadmium and Yellow O within limits'

    if (cd > 0.05) {
      riskLevel = 'high'
      ruleResultVi = 'Không đạt - giữ lô'
      ruleResultEn = 'Hold - does not pass'
      confidence = 82 + (cdInt % 14)
      riskCauseVi = 'Hàm lượng Cadimi vượt ngưỡng an toàn cho phép (> 0.05 ppm)'
      riskCauseEn = 'Cadmium level exceeds safe limits (> 0.05 ppm)'
    } else if (cd >= 0.045) {
      riskLevel = 'medium'
      ruleResultVi = 'Cần kiểm tra lại'
      ruleResultEn = 'Needs re-check'
      confidence = 62 + (cdInt % 15)
      riskCauseVi = 'Hàm lượng Cadimi gần ngưỡng cảnh báo, đề nghị kiểm tra bổ sung'
      riskCauseEn = 'Cadmium level near threshold; supplementary assay recommended'
    }

    return { riskLevel, aiResultVi: ruleResultVi, aiResultEn: ruleResultEn, confidence, riskCauseVi, riskCauseEn }
  }

  const ruleAudit = runRuleAuditor(cadmiumPpm)
  const ruleAuditLab = runRuleAuditor(cadmiumPpmLab)

  // Pure disease risk auditor mirroring python rules
  const runDiseaseAuditor = (tempVal, humVal, rainVal, wetVal, drainageVal, priorVal) => {
    const temp = parseFloat(tempVal) || 28.0
    const hum = parseFloat(humVal) || 80.0
    const rain = parseFloat(rainVal) || 150.0
    const wet = parseFloat(wetVal) || 6.0
    const prior = Number(priorVal) || 0
    const drain = drainageVal === 'poor' ? 2.0 : (drainageVal === 'medium' ? 1.0 : 0.0)

    let phyScore = 0.0
    if (hum > 85.0 && drain === 2.0 && rain > 200.0) {
      phyScore = 6.0 + prior * 1.5
    } else {
      phyScore = (hum - 85.0) * 0.04 + (drain - 1.0) * 0.5 + (rain - 200.0) * 0.003 + prior * 0.4
    }

    let antScore = 0.0
    if (hum > 80.0 && temp >= 24.0 && temp <= 32.0) {
      antScore = 5.0
    } else {
      antScore = (hum - 80.0) * 0.04 + (temp >= 24.0 && temp <= 32.0 ? 1.5 : -1.5)
    }

    let blightScore = 0.0
    if (wet > 12.0) {
      blightScore = 4.0
    } else {
      blightScore = (wet - 12.0) * 0.3
    }

    const healthyScore = 1.0

    const scores = [
      { name: 'healthy', val: healthyScore },
      { name: 'phytophthora', val: phyScore },
      { name: 'anthracnose', val: antScore },
      { name: 'leaf_blight', val: blightScore }
    ]

    scores.sort((a, b) => b.val - a.val)
    const best = scores[0]

    let prob = 0.85
    if (best.name === 'healthy') {
      prob = 0.7 + (Math.abs(temp - 25.0) % 0.15)
    } else if (best.name === 'phytophthora') {
      prob = 0.5 + ((hum - 85.0) * 0.02)
    } else if (best.name === 'anthracnose') {
      prob = 0.6 + ((temp - 24.0) * 0.02)
    } else if (best.name === 'leaf_blight') {
      prob = 0.55 + ((wet - 12.0) * 0.03)
    }
    prob = Math.min(0.99, Math.max(0.4, prob))

    const risk = best.name === 'healthy' ? 'low' : (prob >= 0.5 ? 'high' : 'medium')

    return {
      disease: best.name,
      probability: parseFloat(prob.toFixed(4)),
      risk: risk,
      source: 'fallback'
    }
  }

  // Debounced AI Disease Prediction (Extension feature)
  useEffect(() => {
    if (!harvestDate) {
      setDiseaseResult(null)
      return
    }

    const fetchDiseasePrediction = async () => {
      setDiseasePredicting(true)
      setDiseaseError('')
      
      const parsedMonth = new Date(harvestDate).getMonth() + 1
      const month = Number.isNaN(parsedMonth) ? 6 : parsedMonth
      
      const tempVal = parseFloat(temperature) || 28.0
      const humVal = parseFloat(humidity) || 80.0
      const rainVal = parseFloat(rainfall) || 150.0
      const wetVal = parseFloat(leafWetness) || 6.0
      const ageVal = parseFloat(treeAge) || 8.0
      const priorVal = Number(priorInfection) || 0

      try {
        const response = await fetch('/api/predict_disease', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            temperature_c: tempVal,
            humidity_pct: humVal,
            rainfall_mm: rainVal,
            leaf_wetness_hours: wetVal,
            soil_drainage: soilDrainage,
            harvest_month: month,
            tree_age_years: ageVal,
            prior_infection: priorVal
          })
        })

        if (response.ok) {
          const data = await response.json()
          setDiseaseResult({
            ...data,
            source: 'model'
          })
        } else {
          throw new Error('API server returned error status')
        }
      } catch (err) {
        console.warn('Disease AI backend offline. Falling back to local JS auditor simulation.', err)
        const fallbackRes = runDiseaseAuditor(
          tempVal,
          humVal,
          rainVal,
          wetVal,
          soilDrainage,
          priorVal
        )
        setDiseaseResult(fallbackRes)
      } finally {
        setDiseasePredicting(false)
      }
    }

    const timer = setTimeout(fetchDiseasePrediction, 300)
    return () => clearTimeout(timer)
  }, [temperature, humidity, rainfall, leafWetness, soilDrainage, harvestDate, treeAge, priorInfection])

  // Listen for account switching in Metamask
  useEffect(() => {
    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
        } else {
          setAccount('')
        }
        setReloadTrigger(prev => prev + 1)
      }
      window.ethereum.on('accountsChanged', handleAccounts)
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccounts)
        }
      }
    }
  }, [])

  // Initialize blockchain client connection and read user roles
  useEffect(() => {
    async function loadContract() {
      try {
        const configRes = await fetch(`${import.meta.env.BASE_URL}contracts/DurianTrust.json`)
        if (!configRes.ok) throw new Error('Contract config not found')
        const config = await configRes.json()
        setContractInfo(config)

        let provider
        let currentAccount = ''

        if (window.ethereum) {
          provider = new BrowserProvider(window.ethereum)
          try {
            const accounts = await provider.send('eth_accounts', [])
            if (accounts.length > 0) {
              currentAccount = accounts[0]
            }
          } catch (e) {
            console.warn('Metamask accounts request failed', e)
          }
        }

        if (!currentAccount) {
          try {
            const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'
            const tempProvider = new JsonRpcProvider(rpcUrl)
            const signers = await tempProvider.listAccounts()
            if (signers.length > 0) {
              provider = tempProvider
              currentAccount = signers[0].address
            }
          } catch (e) {
            console.warn('RPC/Hardhat node unreachable', e)
          }
        }

        if (currentAccount && provider) {
          setAccount(currentAccount)
          setProviderMode('chain')
          
          const contract = new Contract(config.address, config.abi, provider)
          
          // Role detection calls
          let ownerAddr = ''
          let isFarmer = false
          let isLab = false
          let isLogistics = false

          try {
            ownerAddr = await contract.owner()
          } catch(e) { console.warn('owner() read failed', e) }

          try {
            isFarmer = await contract.isFarmer(currentAccount)
          } catch(e) { console.warn('isFarmer() read failed', e) }

          try {
            isLab = await contract.isLab(currentAccount)
          } catch(e) { console.warn('isLab() read failed', e) }

          try {
            isLogistics = await contract.isLogistics(currentAccount)
          } catch(e) { console.warn('isLogistics() read failed', e) }

          setUserRoles({
            isOwner: ownerAddr.toLowerCase() === currentAccount.toLowerCase(),
            isFarmer: isFarmer,
            isLab: isLab,
            isLogistics: isLogistics
          })

          const ids = await contract.getBatchIds()
          setRegisteredIds(ids)
          if (ids.length > 0 && !selectedBatchId) {
            setSelectedBatchId(ids[ids.length - 1])
          }
        } else {
          setupLocalStorageFallback()
        }
      } catch (err) {
        console.warn('Blockchain provider setup failed. Using localStorage simulator.', err)
        setupLocalStorageFallback()
      }
    }

    function setupLocalStorageFallback() {
      setProviderMode('fallback')
      setAccount('0xDevSimulatorAccountAddress000000000000')
      
      const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
      const staticIds = ['DRN-2026-LD-0428', 'DRN-2026-TG-0115', 'DRN-2026-DL-0892']
      const allIds = [...staticIds, ...localBatches.map(b => b.id)]
      setRegisteredIds(allIds)
      if (allIds.length > 0 && !selectedBatchId) {
        setSelectedBatchId(allIds[allIds.length - 1])
      }
    }

    loadContract()
  }, [reloadTrigger])

  // Lab Tab: Fetch testing history for selected batch
  useEffect(() => {
    if (activeTab !== 'lab' || !selectedBatchId) {
      setLabHistory([])
      return
    }

    let active = true

    async function fetchHistory() {
      if (providerMode === 'chain' && contractInfo) {
        try {
          setLoadingHistory(true)
          let provider
          if (window.ethereum) {
            provider = new BrowserProvider(window.ethereum)
          } else {
            const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'
            provider = new JsonRpcProvider(rpcUrl)
          }
          const contract = new Contract(contractInfo.address, contractInfo.abi, provider)
          const reports = await contract.getLabReportHistory(selectedBatchId)
          const formatted = reports.map(r => ({
            cadmiumPpm: Number(r.cadmiumPpm) / 10000,
            thresholdPpm: Number(r.thresholdPpm) / 10000,
            aiResult: { vi: r.aiResultVi, en: r.aiResultEn },
            confidence: Number(r.confidence) / 10000,
            riskLevel: mapRiskLevel(r.riskLevel),
            riskCause: { vi: r.riskCauseVi, en: r.riskCauseEn },
            timestamp: Number(r.timestamp),
            reporter: r.reporter
          }))
          if (active) {
            setLabHistory(formatted)
          }
        } catch (e) {
          console.warn('Could not fetch lab reports history', e)
        } finally {
          if (active) setLoadingHistory(false)
        }
      } else {
        // Fallback simulated batches
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const matched = localBatches.find(b => b.id === selectedBatchId)
        if (matched && matched.labReports) {
          setLabHistory(matched.labReports)
        } else {
          setLabHistory([{
            cadmiumPpm: 0.030,
            thresholdPpm: 0.05,
            aiResult: { vi: 'Đạt chuẩn xuất khẩu', en: 'Export-ready' },
            confidence: 0.95,
            riskLevel: 'low',
            riskCause: { vi: 'Hàm lượng trong ngưỡng cho phép', en: 'Within safe limits' },
            timestamp: Math.floor(Date.now() / 1000) - 3600 * 24,
            reporter: '0xDevSimulatorAccountAddress000000000000'
          }])
        }
      }
    }

    fetchHistory()
    return () => { active = false }
  }, [selectedBatchId, activeTab, providerMode, contractInfo, reloadTrigger])

  // Resolve roles based on current active providerMode
  const activeRoles = providerMode === 'chain' ? {
    isOwner: userRoles.isOwner,
    isFarmer: userRoles.isFarmer,
    isLab: userRoles.isLab,
    isLogistics: userRoles.isLogistics,
    hasAnyRole: userRoles.isOwner || userRoles.isFarmer || userRoles.isLab || userRoles.isLogistics
  } : {
    isOwner: simulatedRole === 'owner',
    isFarmer: simulatedRole === 'farmer',
    isLab: simulatedRole === 'lab',
    isLogistics: simulatedRole === 'logistics',
    hasAnyRole: simulatedRole !== 'norole'
  }

  // Pre-lab AI predictions
  useEffect(() => {
    if (!provinceVi) {
      setAiResult(null)
      return
    }

    const fetchAiPrediction = async () => {
      setAiPredicting(true)
      setAiError('')
      
      const parsedMonth = new Date(harvestDate).getMonth() + 1
      const month = Number.isNaN(parsedMonth) ? 6 : parsedMonth
      
      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            province: provinceVi,
            harvest_month: month,
            farm_violation_history: Number(violations),
            rainfall_mm: Number(rainfall)
          })
        })

        if (response.ok) {
          const data = await response.json()
          setAiResult({
            ...data,
            source: 'model'
          })
        } else {
          throw new Error('API server returned error status')
        }
      } catch (err) {
        let baseline = 0.1
        if (provinceVi === 'Đắk Lắk' || provinceVi === 'Dak Lak') baseline = 1.2
        else if (provinceVi === 'Tiền Giang' || provinceVi === 'Tien Giang') baseline = 0.5
        else if (provinceVi === 'Đồng Nai' || provinceVi === 'Dong Nai') baseline = 0.4
        else if (provinceVi === 'Bến Tre' || provinceVi === 'Ben Tre') baseline = 0.3

        const score = baseline + Number(violations) * 0.5 + Number(rainfall) * 0.004
        
        let risk = 'low'
        let probability = 0.9
        if (score >= 2.0) {
          risk = 'high'
          probability = Math.min(0.99, 0.7 + (score - 2.0) * 0.1)
        } else if (score >= 1.0) {
          risk = 'medium'
          probability = Math.min(0.89, 0.6 + (score - 1.0) * 0.25)
        } else {
          probability = Math.min(0.99, 0.8 + (1.0 - score) * 0.19)
        }

        setAiResult({
          risk,
          probability: parseFloat(probability.toFixed(2)),
          needs_full_testing: risk !== 'low',
          source: 'fallback'
        })
      } finally {
        setAiPredicting(false)
      }
    }

    const timer = setTimeout(fetchAiPrediction, 300)
    return () => clearTimeout(timer)
  }, [provinceVi, harvestDate, violations, rainfall])

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng cài đặt Metamask!' : 'Please install MetaMask!',
        type: 'error'
      })
      return
    }
    try {
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
      setReloadTrigger(prev => prev + 1)
    } catch (e) {
      console.error('Wallet connection failed', e)
    }
  }

  const handleProvinceChange = (val) => {
    setProvinceVi(val)
    setProvinceEn(PROVINCES[val] || val)
  }

  const handleStageSelect = (viVal) => {
    setStageVi(viVal)
    const STAGE_MAP = {
      'Thu hoạch': 'Harvest',
      'Kiểm nghiệm': 'Lab test',
      'Đóng gói': 'Packing',
      'Xuất khẩu': 'Export'
    }
    setStageEn(STAGE_MAP[viVal] || viVal)
  }

  // Farmer Tab Form Submit Handler
  const handleRegisterBatch = async (e) => {
    e.preventDefault()
    if (!batchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng nhập Mã Lô hàng!' : 'Please enter Batch ID!',
        type: 'error'
      })
      return
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setNewlyRegisteredBatchId('')

    const cadmiumValueScaled = Math.round(parseFloat(cadmiumPpm) * 10000)
    const thresholdValueScaled = 500 // 0.05 ppm * 10000
    const confidenceScaled = Math.round(ruleAudit.confidence * 100)
    const riskLevelEnum = ruleAudit.riskLevel === 'low' ? 0 : ruleAudit.riskLevel === 'medium' ? 1 : 2

    if (providerMode === 'chain' && contractInfo) {
      try {
        let provider
        if (window.ethereum) {
          provider = new BrowserProvider(window.ethereum)
        } else {
          provider = new JsonRpcProvider('http://127.0.0.1:8545')
        }
        const signer = await provider.getSigner()
        const contract = new Contract(contractInfo.address, contractInfo.abi, signer)

        const tx = await contract.registerBatch(
          batchId,
          farmVi,
          farmEn,
          provinceVi,
          provinceEn,
          harvestDate || new Date().toISOString().split('T')[0],
          cadmiumValueScaled,
          thresholdValueScaled,
          ruleAudit.aiResultVi,
          ruleAudit.aiResultEn,
          confidenceScaled,
          riskLevelEnum,
          ruleAudit.riskCauseVi,
          ruleAudit.riskCauseEn
        )

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch lên Blockchain...' : 'Broadcasting transaction to blockchain...',
          type: 'info'
        })

        try {
          const localHashes = JSON.parse(localStorage.getItem('duriantrust_tx_hashes') || '{}')
          localHashes[batchId] = tx.hash
          localStorage.setItem('duriantrust_tx_hashes', JSON.stringify(localHashes))
        } catch (e) {
          console.warn('Failed to save tx hash to localStorage', e)
        }

        await tx.wait()
        
        const txEvt = await contract.addTimelineEvent(
          batchId,
          'Thu hoạch',
          'Harvest',
          `${farmVi}, ${provinceVi}`,
          `${farmEn}, ${provinceEn}`,
          harvestDate || new Date().toISOString().split('T')[0],
          1
        )
        await txEvt.wait()

        setTxMessage({
          text: language === 'vi' 
            ? `Đăng ký thành công! Lô hàng đã ghi vào Blockchain. Mã Tx: ${tx.hash.slice(0, 16)}...` 
            : `Success! Batch registered in Blockchain. Tx Hash: ${tx.hash.slice(0, 16)}...`,
          type: 'success'
        })

        setNewlyRegisteredBatchId(batchId)
        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        console.error(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${err.message.slice(0, 120)}` : `Blockchain Error: ${err.message.slice(0, 120)}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    } else {
      // LocalStorage Simulation mode
      try {
        await new Promise(r => setTimeout(r, 600))
        
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        
        if (localBatches.some(b => b.id === batchId) || ['DRN-2026-LD-0428', 'DRN-2026-TG-0115', 'DRN-2026-DL-0892'].includes(batchId)) {
          throw new Error('Batch already exists')
        }

        const newBatch = {
          id: batchId,
          farm: { vi: farmVi, en: farmEn },
          province: { vi: provinceVi, en: provinceEn },
          harvestDate: harvestDate || new Date().toISOString().split('T')[0],
          cadmiumPpm: parseFloat(cadmiumPpm),
          thresholdPpm: 0.05,
          aiResult: { vi: ruleAudit.aiResultVi, en: ruleAudit.aiResultEn },
          confidence: ruleAudit.confidence / 100,
          riskLevel: ruleAudit.riskLevel,
          riskCause: { vi: ruleAudit.riskCauseVi, en: ruleAudit.riskCauseEn },
          timeline: [
            {
              stage: { vi: 'Thu hoạch', en: 'Harvest' },
              location: { vi: `${farmVi}, ${provinceVi}`, en: `${farmEn}, ${provinceEn}` },
              date: harvestDate || new Date().toISOString().split('T')[0],
              status: 'complete'
            }
          ],
          blockchainHash: 'simulated, not on-chain',
          labReports: [
            {
              cadmiumPpm: parseFloat(cadmiumPpm),
              thresholdPpm: 0.05,
              aiResult: { vi: ruleAudit.aiResultVi, en: ruleAudit.aiResultEn },
              confidence: ruleAudit.confidence / 100,
              riskLevel: ruleAudit.riskLevel,
              riskCause: { vi: ruleAudit.riskCauseVi, en: ruleAudit.riskCauseEn },
              timestamp: Math.floor(Date.now() / 1000),
              reporter: account
            }
          ]
        }

        localBatches.push(newBatch)
        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

        setTxMessage({
          text: language === 'vi' 
            ? 'Đăng ký thành công! Đã ghi nhận vào Sổ cái giả lập (LocalStorage).' 
            : 'Success! Registered batch in Simulated Local Ledger.',
          type: 'success'
        })

        setNewlyRegisteredBatchId(batchId)
        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${err.message}` : `Error: ${err.message}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Lab Tab Form Submit Handler
  const handleUpdateLabReport = async (e) => {
    e.preventDefault()
    if (!selectedBatchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng chọn Lô sầu riêng!' : 'Please select a Batch ID!',
        type: 'error'
      })
      return
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })

    const cadmiumValueScaled = Math.round(parseFloat(cadmiumPpmLab) * 10000)
    const thresholdValueScaled = Math.round(parseFloat(thresholdPpmLab) * 10000)
    const audit = runRuleAuditor(cadmiumPpmLab)
    const confidenceScaled = Math.round(audit.confidence * 100)
    const riskLevelEnum = audit.riskLevel === 'low' ? 0 : audit.riskLevel === 'medium' ? 1 : 2

    if (providerMode === 'chain' && contractInfo) {
      try {
        let provider
        if (window.ethereum) {
          provider = new BrowserProvider(window.ethereum)
        } else {
          provider = new JsonRpcProvider('http://127.0.0.1:8545')
        }
        const signer = await provider.getSigner()
        const contract = new Contract(contractInfo.address, contractInfo.abi, signer)

        const tx = await contract.updateLabReport(
          selectedBatchId,
          cadmiumValueScaled,
          thresholdValueScaled,
          audit.aiResultVi,
          audit.aiResultEn,
          confidenceScaled,
          riskLevelEnum,
          audit.riskCauseVi,
          audit.riskCauseEn
        )

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi báo cáo kiểm định chất lượng lên Blockchain...' : 'Sending lab report update transaction to blockchain...',
          type: 'info'
        })

        await tx.wait()

        // Also add a timeline stage automatically for the update
        try {
          const txEvt = await contract.addTimelineEvent(
            selectedBatchId,
            'Kiểm nghiệm cập nhật',
            'Testing updated',
            'Phòng phân tích độc học',
            'Toxicology analysis lab',
            new Date().toISOString().split('T')[0],
            1
          )
          await txEvt.wait()
        } catch (evtErr) {
          console.warn('Failed to add testing update timeline event', evtErr)
        }

        setTxMessage({
          text: language === 'vi' 
            ? `Thành công! Đã cập nhật kết quả kiểm định mới cho lô ${selectedBatchId} trên Blockchain.` 
            : `Success! Appended new laboratory chemical audit for batch ${selectedBatchId} on-chain.`,
          type: 'success'
        })

        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        console.error(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${err.message.slice(0, 120)}` : `Blockchain Error: ${err.message.slice(0, 120)}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    } else {
      // LocalStorage update
      try {
        await new Promise(r => setTimeout(r, 600))
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const index = localBatches.findIndex(b => b.id === selectedBatchId)

        if (index === -1) {
          throw new Error('Kết quả kiểm nghiệm chỉ có thể cập nhật cho các lô hàng được tạo mới ở Cổng Quản lý (để tránh sửa đổi dữ liệu tĩnh).')
        }

        const newReport = {
          cadmiumPpm: parseFloat(cadmiumPpmLab),
          thresholdPpm: parseFloat(thresholdPpmLab),
          aiResult: { vi: audit.aiResultVi, en: audit.aiResultEn },
          confidence: audit.confidence / 100,
          riskLevel: audit.riskLevel,
          riskCause: { vi: audit.riskCauseVi, en: audit.riskCauseEn },
          timestamp: Math.floor(Date.now() / 1000),
          reporter: account
        }

        localBatches[index].cadmiumPpm = newReport.cadmiumPpm
        localBatches[index].thresholdPpm = newReport.thresholdPpm
        localBatches[index].aiResult = newReport.aiResult
        localBatches[index].confidence = newReport.confidence
        localBatches[index].riskLevel = newReport.riskLevel
        localBatches[index].riskCause = newReport.riskCause

        if (!localBatches[index].labReports) {
          localBatches[index].labReports = []
        }
        localBatches[index].labReports.push(newReport)

        // Add simulated timeline event
        localBatches[index].timeline.push({
          stage: { vi: 'Kiểm nghiệm cập nhật', en: 'Testing updated' },
          location: { vi: 'Phòng kiểm định giả lập', en: 'Simulated Lab Center' },
          date: new Date().toISOString().split('T')[0],
          status: 'complete'
        })

        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

        setTxMessage({
          text: language === 'vi' 
            ? 'Thành công! Đã thêm kết quả kiểm nghiệm mới vào Sổ cái giả lập.' 
            : 'Success! New lab audit appended in Simulated Local Ledger.',
          type: 'success'
        })

        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${err.message}` : `Error: ${err.message}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Logistics Tab Form Submit Handler
  const handleAddTimeline = async (e) => {
    e.preventDefault()
    if (!selectedBatchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng chọn Lô sầu riêng!' : 'Please select a Batch ID!',
        type: 'error'
      })
      return
    }
    if (!locationVi) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng nhập địa điểm!' : 'Please enter location!',
        type: 'error'
      })
      return
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })

    if (providerMode === 'chain' && contractInfo) {
      try {
        let provider
        if (window.ethereum) {
          provider = new BrowserProvider(window.ethereum)
        } else {
          provider = new JsonRpcProvider('http://127.0.0.1:8545')
        }
        const signer = await provider.getSigner()
        const contract = new Contract(contractInfo.address, contractInfo.abi, signer)

        const tx = await contract.addTimelineEvent(
          selectedBatchId,
          stageVi,
          stageEn,
          locationVi,
          locationEn || locationVi,
          eventDate || new Date().toISOString().split('T')[0],
          Number(eventStatus)
        )

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi sự kiện lên Blockchain...' : 'Sending timeline event to blockchain...',
          type: 'info'
        })

        await tx.wait()

        setTxMessage({
          text: language === 'vi' ? `Thành công! Đã thêm chặng [${stageVi}] vào Blockchain.` : `Success! Added stage [${stageEn}] to Blockchain.`,
          type: 'success'
        })

        setLocationVi('')
        setLocationEn('')
        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        console.error(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${err.message.slice(0, 120)}` : `Blockchain Error: ${err.message.slice(0, 120)}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    } else {
      // LocalStorage Simulation mode
      try {
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const index = localBatches.findIndex(b => b.id === selectedBatchId)

        if (index === -1) {
          throw new Error('Sự kiện chỉ có thể thêm vào các lô hàng được tạo mới ở Cổng Quản lý (để tránh sửa đổi dữ liệu gốc tĩnh).')
        }

        localBatches[index].timeline.push({
          stage: { vi: stageVi, en: stageEn },
          location: { vi: locationVi, en: locationEn || locationVi },
          date: eventDate || new Date().toISOString().split('T')[0],
          status: Number(eventStatus) === 1 ? 'complete' : 'pending'
        })

        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

        setTxMessage({
          text: language === 'vi' ? `Thành công! Đã thêm chặng [${stageVi}] vào Sổ cái giả lập.` : `Success! Added stage [${stageEn}] to Simulated Ledger.`,
          type: 'success'
        })

        setLocationVi('')
        setLocationEn('')
        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${err.message}` : `Error: ${err.message}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Admin Tab: Role Management Submission Handler
  const handleRoleAction = async (actionType) => {
    if (!targetAddress || !targetAddress.startsWith('0x') || targetAddress.length !== 42) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng điền đúng định dạng địa chỉ ví (0x...)' : 'Please enter a valid wallet address starting with 0x!',
        type: 'error'
      })
      return
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })

    if (providerMode === 'chain' && contractInfo) {
      try {
        let provider
        if (window.ethereum) {
          provider = new BrowserProvider(window.ethereum)
        } else {
          provider = new JsonRpcProvider('http://127.0.0.1:8545')
        }
        const signer = await provider.getSigner()
        const contract = new Contract(contractInfo.address, contractInfo.abi, signer)

        let tx
        if (actionType === 'assign') {
          if (targetRole === 'farmer') tx = await contract.addFarmer(targetAddress)
          else if (targetRole === 'lab') tx = await contract.addLab(targetAddress)
          else if (targetRole === 'logistics') tx = await contract.addLogistics(targetAddress)
        } else {
          if (targetRole === 'farmer') tx = await contract.removeFarmer(targetAddress)
          else if (targetRole === 'lab') tx = await contract.removeLab(targetAddress)
          else if (targetRole === 'logistics') tx = await contract.removeLogistics(targetAddress)
        }

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch phân quyền lên Blockchain...' : 'Sending role transaction to blockchain...',
          type: 'info'
        })

        await tx.wait()

        setTxMessage({
          text: language === 'vi' 
            ? `Thành công! Đã ${actionType === 'assign' ? 'gán' : 'thu hồi'} quyền [${targetRole.toUpperCase()}] cho ví ${targetAddress.slice(0, 10)}...`
            : `Success! Role [${targetRole.toUpperCase()}] ${actionType === 'assign' ? 'assigned to' : 'revoked from'} address ${targetAddress.slice(0, 10)}...`,
          type: 'success'
        })

        setTargetAddress('')
        setReloadTrigger(prev => prev + 1)
      } catch (err) {
        console.error(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${err.message.slice(0, 120)}` : `Error: ${err.message.slice(0, 120)}`,
          type: 'error'
        })
      } finally {
        setLoading(false)
      }
    } else {
      // Fallback offline simulator
      try {
        await new Promise(r => setTimeout(r, 400))
        setTxMessage({
          text: language === 'vi'
            ? `Thành công (Giả lập)! Đã ${actionType === 'assign' ? 'cấp' : 'thu hồi'} vai trò cho địa chỉ ví này.`
            : `Success (Simulated)! Role ${actionType === 'assign' ? 'assigned' : 'revoked'} for target address.`,
          type: 'success'
        })
        setTargetAddress('')
      } catch (e) {
        setTxMessage({ text: e.message, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
  }

  // Resolved role string for displaying on wallet chip
  const getRoleLabel = () => {
    if (activeRoles.isOwner) return language === 'vi' ? 'Chủ Sở Hữu (Admin)' : 'Owner (Admin)'
    if (activeRoles.isFarmer) return language === 'vi' ? 'Nông Dân' : 'Farmer'
    if (activeRoles.isLab) return language === 'vi' ? 'Kiểm Nghiệm (Lab)' : 'Lab Tester'
    if (activeRoles.isLogistics) return language === 'vi' ? 'Vận Chuyển' : 'Logistics'
    return language === 'vi' ? 'Không có vai trò' : 'No Role'
  }

  // Sub-Render functions for tabs
  const renderFarmerPanel = () => {
    return (
      <div className="dashboard-card telemetry-card">
        <div className="card-header-with-icon">
          <Sprout className="card-icon" size={20} />
          <h2>{language === 'vi' ? 'Đăng Ký Lô Hàng Sầu Riêng' : 'Register New Durian Batch'}</h2>
        </div>
        
        <form onSubmit={handleRegisterBatch} className="manage-form">
          <div className="form-row">
            <button 
              type="button" 
              onClick={handlePreFill}
              className="button button-secondary w-full text-xs py-2 mb-3 min-h-0"
            >
              ✨ {language === 'vi' ? 'Tự điền nhanh dữ liệu mẫu' : 'Quick pre-fill sample data'}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="m-batch-id">{language === 'vi' ? 'Mã Lô Sầu Riêng (Batch ID)' : 'Batch ID (Unique)'}</label>
            <input 
              id="m-batch-id"
              type="text" 
              value={batchId} 
              onChange={(e) => setBatchId(e.target.value.toUpperCase())}
              placeholder="Ví dụ: DRN-2026-TG-8812"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-farm-vi">Tên vườn (Tiếng Việt)</label>
              <input 
                id="m-farm-vi"
                type="text" 
                value={farmVi} 
                onChange={(e) => {
                  setFarmVi(e.target.value)
                  if (!farmEn) setFarmEn(e.target.value)
                }}
                placeholder="Nông trại Tân Phú"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-farm-en">Farm Name (English)</label>
              <input 
                id="m-farm-en"
                type="text" 
                value={farmEn} 
                onChange={(e) => setFarmEn(e.target.value)}
                placeholder="Tan Phu Farm"
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-province-vi">Tỉnh thành</label>
              <select 
                id="m-province-vi"
                value={provinceVi}
                onChange={(e) => handleProvinceChange(e.target.value)}
              >
                <option value="Lâm Đồng">Lâm Đồng</option>
                <option value="Tiền Giang">Tiền Giang</option>
                <option value="Đắk Lắk">Đắk Lắk</option>
                <option value="Bến Tre">Bến Tre</option>
                <option value="Đồng Nai">Đồng Nai</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="m-harvest-date">{language === 'vi' ? 'Ngày thu hoạch' : 'Harvest Date'}</label>
              <input 
                id="m-harvest-date"
                type="date" 
                value={harvestDate} 
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-violations">
                {language === 'vi' ? 'Lịch sử vi phạm của vườn (0-5)' : 'Farm Violation History (0-5)'}
              </label>
              <select
                id="m-violations"
                value={violations}
                onChange={(e) => setViolations(Number(e.target.value))}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="m-rainfall">
                {language === 'vi' ? 'Lượng mưa ước tính (mm)' : 'Estimated Rainfall (mm)'}
              </label>
              <input
                id="m-rainfall"
                type="number"
                min="0"
                max="1000"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Environmental & Orchard Conditions (Extension Feature) */}
          <div style={{
            margin: '24px 0 12px 0',
            borderTop: '1px solid rgba(31, 71, 52, 0.1)',
            paddingTop: '16px'
          }}>
            <h3 style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-green-deep)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Compass size={16} />
              <span>
                {copy.diseaseModel.title}
              </span>
            </h3>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-temperature">{copy.diseaseModel.tempLabel}</label>
              <input
                id="m-temperature"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-humidity">{copy.diseaseModel.humidityLabel}</label>
              <input
                id="m-humidity"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-leaf-wetness">{copy.diseaseModel.wetnessLabel}</label>
              <input
                id="m-leaf-wetness"
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={leafWetness}
                onChange={(e) => setLeafWetness(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-soil-drainage">{copy.diseaseModel.drainageLabel}</label>
              <select
                id="m-soil-drainage"
                value={soilDrainage}
                onChange={(e) => setSoilDrainage(e.target.value)}
              >
                <option value="good">{copy.diseaseModel.drainageOptions.good}</option>
                <option value="medium">{copy.diseaseModel.drainageOptions.medium}</option>
                <option value="poor">{copy.diseaseModel.drainageOptions.poor}</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label htmlFor="m-tree-age">{copy.diseaseModel.ageLabel}</label>
              <input
                id="m-tree-age"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={treeAge}
                onChange={(e) => setTreeAge(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-prior-infection">{copy.diseaseModel.priorLabel}</label>
              <select
                id="m-prior-infection"
                value={priorInfection}
                onChange={(e) => setPriorInfection(Number(e.target.value))}
              >
                <option value={0}>{copy.diseaseModel.priorNo}</option>
                <option value={1}>{copy.diseaseModel.priorYes}</option>
              </select>
            </div>
          </div>

          {/* AI Predicted Risk Panel */}
          {provinceVi && (
            <div className={`ai-preview-panel risk-${aiResult ? aiResult.risk : 'low'}`} style={{ marginBottom: '18px' }}>
              <div className="ai-preview-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} />
                  <span>
                    {language === 'vi' ? 'DỰ BÁO NGUY CƠ Cd BỞI AI (TRƯỚC PHÒNG LAB)' : 'AI RISK PRE-LAB FORECAST'}
                  </span>
                </div>
                {aiResult && (
                  <span className={`status-badge-pill ${aiResult.source === 'model' ? 'chain-mode' : 'fallback-mode'}`} style={{ fontSize: '0.68rem', padding: '1px 8px', textTransform: 'none', height: 'fit-content', lineHeight: 'normal' }}>
                    {aiResult.source === 'model' ? '🧠 AI Model' : '⚠️ Simulated'}
                  </span>
                )}
              </div>
              <div className="ai-preview-body">
                {aiPredicting ? (
                  <div className="text-xs py-2 opacity-80" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>{language === 'vi' ? 'Đang phân tích dữ liệu...' : 'Analyzing farm data...'}</span>
                  </div>
                ) : aiError ? (
                  <div className="text-xs text-red-500 py-1">{aiError}</div>
                ) : aiResult ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold">
                        {language === 'vi' 
                          ? `Nguy cơ: ${aiResult.risk === 'low' ? 'Thấp' : aiResult.risk === 'medium' ? 'Trung bình' : 'Cao'}`
                          : `Risk Level: ${aiResult.risk.toUpperCase()}`}
                      </span>
                      <span className={`risk-badge risk-${aiResult.risk}`}>
                        {aiResult.risk === 'low' 
                          ? (language === 'vi' ? 'Đạt chuẩn' : 'Safe') 
                          : aiResult.risk === 'medium' 
                            ? (language === 'vi' ? 'Cần kiểm tra' : 'Review') 
                            : (language === 'vi' ? 'Nguy cơ cao' : 'Critical')}
                      </span>
                    </div>
                    <div className="text-xs opacity-80 mb-1">
                      <strong>{language === 'vi' ? 'Khả năng xảy ra: ' : 'Probability: '}</strong> 
                      {Math.round(aiResult.probability * 100)}%
                    </div>
                    <div className="text-xs font-semibold mt-1">
                      {aiResult.needs_full_testing ? (
                        <span className="text-red-500" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                          <AlertTriangle size={12} />
                          {language === 'vi' 
                            ? 'Yêu cầu kiểm nghiệm đầy đủ trong phòng thí nghiệm' 
                            : 'Requires comprehensive lab assay'}
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                          <CheckCircle2 size={12} />
                          {language === 'vi' 
                            ? 'Đạt điều kiện miễn giảm quy trình kiểm nghiệm phụ' 
                            : 'Eligible for fast-track processing'}
                        </span>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Disease Risk Forecast AI Result Panel (Extension Feature) */}
          {harvestDate && (
            <div className={`ai-preview-panel risk-${diseaseResult ? diseaseResult.risk : 'low'}`} style={{ marginBottom: '18px' }}>
              <div className="ai-preview-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} />
                  <span>
                    {copy.diseaseModel.kicker}
                  </span>
                </div>
                {diseaseResult && (
                  <span className={`status-badge-pill ${diseaseResult.source === 'model' ? 'chain-mode' : 'fallback-mode'}`} style={{ fontSize: '0.68rem', padding: '1px 8px', textTransform: 'none', height: 'fit-content', lineHeight: 'normal' }}>
                    {diseaseResult.source === 'model' ? '🧠 AI Model' : '⚠️ Simulated'}
                  </span>
                )}
              </div>
              <div className="ai-preview-body">
                {diseasePredicting ? (
                  <div className="text-xs py-2 opacity-80" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>{language === 'vi' ? 'Đang phân tích điều kiện môi trường...' : 'Analyzing environmental variables...'}</span>
                  </div>
                ) : diseaseError ? (
                  <div className="text-xs text-red-500 py-1">{diseaseError}</div>
                ) : diseaseResult ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold">
                        {copy.diseaseModel.diseases[diseaseResult.disease] || diseaseResult.disease}
                      </span>
                      <span className={`risk-badge risk-${diseaseResult.risk}`}>
                        {copy.diseaseModel.riskLabels[diseaseResult.risk]}
                      </span>
                    </div>
                    <div className="text-xs opacity-80 mb-1">
                      <strong>{language === 'vi' ? 'Độ tin cậy dự báo: ' : 'Prediction Confidence: '}</strong> 
                      {Math.round(diseaseResult.probability * 100)}%
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.74rem', color: 'var(--color-ink-soft)', fontStyle: 'italic', lineHeight: '1.4' }}>
                      &ldquo;{copy.diseaseModel[diseaseResult.disease + 'Desc']}&rdquo;
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="m-cadmium">{language === 'vi' ? 'Kết quả kiểm nghiệm Cadimi tạm tính (ppm)' : 'Estimated Cadmium Level (ppm)'}</label>
            <input 
              id="m-cadmium"
              type="number" 
              step="0.001"
              min="0"
              max="1.5"
              value={cadmiumPpm} 
              onChange={(e) => setCadmiumPpm(e.target.value)}
              required
            />
            <span className="input-hint">{language === 'vi' ? 'Ngưỡng an toàn tối đa của Hải quan là 0.050 ppm' : 'Customs safety limit is 0.050 ppm'}</span>
          </div>

          {/* Rule-Based indicator card */}
          <div className={`ai-preview-panel risk-${ruleAudit.riskLevel}`}>
            <div className="ai-preview-header">
              <Cpu size={16} />
              <span>{language === 'vi' ? 'ĐÁNH GIÁ CHẤT LƯỢNG THEO QUY TẮC (TẠM TÍNH)' : 'RULE-BASED REAL-TIME AUDITING PREVIEW'}</span>
            </div>
            <div className="ai-preview-body">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">
                  {language === 'vi' ? ruleAudit.aiResultVi : ruleAudit.aiResultEn}
                </span>
                <span className={`risk-badge risk-${ruleAudit.riskLevel}`}>
                  {ruleAudit.riskLevel === 'low' ? (language === 'vi' ? 'Đạt chuẩn' : 'Safe') : (ruleAudit.riskLevel === 'medium' ? (language === 'vi' ? 'Cần kiểm tra' : 'Review') : (language === 'vi' ? 'Giữ lại' : 'Critical'))}
                </span>
              </div>
              <div className="text-xs opacity-80">
                <strong>{language === 'vi' ? 'Độ tin cậy: ' : 'Confidence: '}</strong> {ruleAudit.confidence}%
              </div>
              <div className="text-xs mt-1 italic opacity-90">
                &ldquo;{language === 'vi' ? ruleAudit.riskCauseVi : ruleAudit.riskCauseEn}&rdquo;
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="button button-primary w-full mt-4"
          >
            <Send size={16} />
            <span>
              {loading ? (language === 'vi' ? 'Đang thực thi Web3...' : 'Executing Web3...') : (language === 'vi' ? 'Ký Giao Dịch & Đăng Ký Lô Hàng' : 'Sign & Register Batch')}
            </span>
          </button>
        </form>
      </div>
    )
  }

  const renderLabPanel = () => {
    return (
      <div className="unit-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', width: '100%' }}>
        {/* Lab Report Form */}
        <div className="dashboard-card telemetry-card">
          <div className="card-header-with-icon">
            <Award className="card-icon" size={20} />
            <h2>{language === 'vi' ? 'Cập Nhật Kết Quả Kiểm Nghiệm Phòng Lab' : 'Submit Lab Chemical Audit Report'}</h2>
          </div>

          <form onSubmit={handleUpdateLabReport} className="manage-form">
            <div className="form-group">
              <label htmlFor="m-lab-select-batch">{language === 'vi' ? 'Chọn Lô Sầu Riêng cần kiểm định' : 'Select Target Batch ID'}</label>
              <select 
                id="m-lab-select-batch"
                value={selectedBatchId} 
                onChange={(e) => setSelectedBatchId(e.target.value)}
                required
              >
                <option value="">-- {language === 'vi' ? 'Chọn lô sầu riêng' : 'Select Batch ID'} --</option>
                {registeredIds.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="m-lab-cadmium">{language === 'vi' ? 'Hàm lượng Cadimi phân tích (ppm)' : 'Assayed Cadmium (ppm)'}</label>
                <input 
                  id="m-lab-cadmium"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1.5"
                  value={cadmiumPpmLab}
                  onChange={(e) => setCadmiumPpmLab(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="m-lab-threshold">{language === 'vi' ? 'Ngưỡng kiểm định tối đa (ppm)' : 'Max Threshold (ppm)'}</label>
                <input 
                  id="m-lab-threshold"
                  type="number"
                  step="0.001"
                  value={thresholdPpmLab}
                  onChange={(e) => setThresholdPpmLab(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Quality gate simulation preview */}
            <div className={`ai-preview-panel risk-${ruleAuditLab.riskLevel}`} style={{ margin: '12px 0' }}>
              <div className="ai-preview-header">
                <Cpu size={16} />
                <span>{language === 'vi' ? 'KẾT QUẢ ĐỐI CHIẾU QUY TẮC' : 'RULE AUDITOR ANALYSIS'}</span>
              </div>
              <div className="ai-preview-body">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">
                    {language === 'vi' ? ruleAuditLab.aiResultVi : ruleAuditLab.aiResultEn}
                  </span>
                  <span className={`risk-badge risk-${ruleAuditLab.riskLevel}`}>
                    {ruleAuditLab.riskLevel === 'low' ? (language === 'vi' ? 'Đạt chuẩn' : 'Safe') : (ruleAuditLab.riskLevel === 'medium' ? (language === 'vi' ? 'Cần khám' : 'Review') : (language === 'vi' ? 'Giữ lại' : 'Critical'))}
                  </span>
                </div>
                <div className="text-xs opacity-80">
                  <strong>{language === 'vi' ? 'Độ tin cậy:' : 'Audit Confidence:'}</strong> {ruleAuditLab.confidence}%
                </div>
                <div className="text-xs mt-1 italic opacity-90">
                  &ldquo;{language === 'vi' ? ruleAuditLab.riskCauseVi : ruleAuditLab.riskCauseEn}&rdquo;
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="button button-primary w-full mt-4"
            >
              <Send size={16} />
              <span>
                {loading ? (language === 'vi' ? 'Đang thực thi Web3...' : 'Executing Web3...') : (language === 'vi' ? 'Ký Giao Dịch & Ghi Phòng Lab' : 'Sign & Broadcast Lab Report')}
              </span>
            </button>
          </form>
        </div>

        {/* History Display Card */}
        <div className="dashboard-card blockchain-logs-card">
          <div className="card-header-with-icon">
            <FileText className="card-icon" size={20} />
            <h2>{language === 'vi' ? 'Lịch Sử Báo Cáo của Lô Hàng' : 'Batch Chemical Assay History'}</h2>
          </div>
          
          {loadingHistory ? (
            <div className="text-center py-8 opacity-75">
              <RefreshCw className="animate-spin inline-block mr-2" size={18} />
              <span>{language === 'vi' ? 'Đang tải lịch sử từ blockchain...' : 'Querying history from smart contract...'}</span>
            </div>
          ) : selectedBatchId && labHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-soft)', margin: '0 0 4px 0' }}>
                {language === 'vi' ? `Có ${labHistory.length} báo cáo hóa chất được tìm thấy:` : `${labHistory.length} reports logged for batch:`}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {labHistory.map((report, idx) => (
                  <li key={idx} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(31,71,52,0.03)',
                    border: '1px solid rgba(31,71,52,0.08)',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--color-green-deep)' }}>{language === 'vi' ? `Lần kiểm nghiệm #${idx + 1}` : `Assay Run #${idx + 1}`}</strong>
                      <span className={`risk-badge risk-${report.riskLevel}`} style={{ transform: 'scale(0.9)', transformOrigin: 'right' }}>
                        {report.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '4px 0' }}>
                      <div>Cadmium: <strong>{report.cadmiumPpm.toFixed(3)} ppm</strong></div>
                      <div>Threshold: <strong>{report.thresholdPpm.toFixed(3)} ppm</strong></div>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--color-ink-soft)', fontStyle: 'italic' }}>
                      &ldquo;{language === 'vi' ? report.riskCause.vi : report.riskCause.en}&rdquo;
                    </p>
                    <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(31,71,52,0.1)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-ink-soft)' }}>
                      <span>Reporter: <code>{report.reporter.slice(0, 6)}...{report.reporter.slice(-6)}</code></span>
                      <span>{new Date(report.timestamp * 1000).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : selectedBatchId ? (
            <p className="text-xs italic py-8 text-center opacity-70">
              {language === 'vi' ? 'Không tìm thấy lịch sử báo cáo nào của lô hàng này.' : 'No chemical assays recorded for this batch yet.'}
            </p>
          ) : (
            <p className="text-xs italic py-8 text-center opacity-70">
              {language === 'vi' ? 'Vui lòng chọn Lô hàng để xem lịch sử.' : 'Please select a Batch ID above to fetch history.'}
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderLogisticsPanel = () => {
    return (
      <div className="dashboard-card blockchain-logs-card">
        <div className="card-header-with-icon">
          <FileText className="card-icon" size={20} />
          <h2>{language === 'vi' ? 'Cập Nhật Lịch Trình (Timeline)' : 'Log Supply Chain Timeline Stage'}</h2>
        </div>

        <form onSubmit={handleAddTimeline} className="manage-form">
          <div className="form-group">
            <label htmlFor="m-select-batch">{language === 'vi' ? 'Chọn Lô Sầu Riêng' : 'Select Registered Batch'}</label>
            <select 
              id="m-select-batch"
              value={selectedBatchId} 
              onChange={(e) => setSelectedBatchId(e.target.value)}
              required
            >
              <option value="">-- {language === 'vi' ? 'Chọn lô hàng' : 'Select Batch'} --</option>
              {registeredIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="m-select-stage">{language === 'vi' ? 'Công đoạn chuỗi cung ứng' : 'Supply Chain Stage'}</label>
            <select 
              id="m-select-stage"
              value={stageVi} 
              onChange={(e) => handleStageSelect(e.target.value)}
            >
              <option value="Thu hoạch">Thu hoạch (Harvest)</option>
              <option value="Kiểm nghiệm">Kiểm nghiệm (Lab test)</option>
              <option value="Đóng gói">Đóng gói (Packing)</option>
              <option value="Xuất khẩu">Xuất khẩu (Export)</option>
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-loc-vi">Địa điểm (Tiếng Việt)</label>
              <input 
                id="m-loc-vi"
                type="text" 
                value={locationVi} 
                onChange={(e) => {
                  setLocationVi(e.target.value)
                  if (!locationEn) setLocationEn(e.target.value)
                }}
                placeholder="Ví dụ: Trung tâm kiểm định Tiền Giang"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-loc-en">Location Name (English)</label>
              <input 
                id="m-loc-en"
                type="text" 
                value={locationEn} 
                onChange={(e) => setLocationEn(e.target.value)}
                placeholder="Tien Giang Testing Center"
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="m-event-date">{language === 'vi' ? 'Ngày ghi nhận' : 'Logging Date'}</label>
              <input 
                id="m-event-date"
                type="date" 
                value={eventDate} 
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="m-event-status">{language === 'vi' ? 'Trạng thái hoạt động' : 'Execution Status'}</label>
              <select 
                id="m-event-status"
                value={eventStatus} 
                onChange={(e) => setEventStatus(Number(e.target.value))}
              >
                <option value={1}>{language === 'vi' ? 'Đã hoàn thành (Complete)' : 'Complete'}</option>
                <option value={0}>{language === 'vi' ? 'Đang thực hiện (Pending)' : 'Pending'}</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="button button-primary w-full mt-4"
          >
            <Plus size={16} />
            <span>
              {loading ? (language === 'vi' ? 'Đang ghi sổ...' : 'Writing Ledger...') : (language === 'vi' ? 'Ghi Sự Kiện Vào Blockchain' : 'Broadcast Timeline Event')}
            </span>
          </button>
        </form>
      </div>
    )
  }

  const renderAdminPanel = () => {
    return (
      <div className="dashboard-card telemetry-card">
        <div className="card-header-with-icon">
          <ShieldAlert className="card-icon" size={20} />
          <h2>{language === 'vi' ? 'Phân Quyền Vai Trò Sổ Cái (Owner Only)' : 'Ledger Role Management (Owner Only)'}</h2>
        </div>
        
        <form onSubmit={(e) => e.preventDefault()} className="manage-form">
          <div className="form-group">
            <label htmlFor="m-target-addr">{language === 'vi' ? 'Địa chỉ ví kiểm định viên (EVM Address)' : 'Target Wallet EVM Address'}</label>
            <input 
              id="m-target-addr"
              type="text" 
              value={targetAddress} 
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="m-target-role">{language === 'vi' ? 'Chọn vai trò cần chỉ định' : 'Select Access Role'}</label>
            <select 
              id="m-target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            >
              <option value="farmer">{language === 'vi' ? 'Nông Dân (Farmer)' : 'Farmer'}</option>
              <option value="lab">{language === 'vi' ? 'Kiểm Nghiệm (Lab Tester)' : 'Lab Tester'}</option>
              <option value="logistics">{language === 'vi' ? 'Vận Chuyển (Logistics)' : 'Logistics Operator'}</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <button
              onClick={() => handleRoleAction('assign')}
              disabled={loading}
              className="button button-primary"
              style={{ flex: 1 }}
              type="button"
            >
              <span>{language === 'vi' ? 'Cấp quyền' : 'Assign Access'}</span>
            </button>
            <button
              onClick={() => handleRoleAction('revoke')}
              disabled={loading}
              className="button button-secondary"
              style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
              type="button"
            >
              <span>{language === 'vi' ? 'Thu hồi quyền' : 'Revoke Access'}</span>
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Pre-flight gating warning if the user renders gated tab
  const renderTabWithGating = () => {
    switch (activeTab) {
      case 'farmer':
        if (!activeRoles.isFarmer && !activeRoles.isOwner) {
          return (
            <div className="tab-gating-alert">
              <AlertTriangle className="text-red-500 animate-bounce" size={42} />
              <h3>{language === 'vi' ? 'Quyền truy cập bị từ chối' : 'Access Denied'}</h3>
              <p>
                {language === 'vi' 
                  ? 'Ví của bạn không được phân quyền Nông Dân (Farmer) để ghi thông tin.' 
                  : 'Your wallet is not authorized as a Farmer to register new batches.'}
              </p>
            </div>
          )
        }
        return renderFarmerPanel()
      case 'lab':
        if (!activeRoles.isLab && !activeRoles.isOwner) {
          return (
            <div className="tab-gating-alert">
              <AlertTriangle className="text-red-500 animate-bounce" size={42} />
              <h3>{language === 'vi' ? 'Quyền truy cập bị từ chối' : 'Access Denied'}</h3>
              <p>
                {language === 'vi' 
                  ? 'Ví của bạn không được phân quyền Kiểm Nghiệm (Lab) để cập nhật kết quả.' 
                  : 'Your wallet is not authorized as a Lab operator to submit chemical reports.'}
              </p>
            </div>
          )
        }
        return renderLabPanel()
      case 'logistics':
        if (!activeRoles.isLogistics && !activeRoles.isOwner) {
          return (
            <div className="tab-gating-alert">
              <AlertTriangle className="text-red-500 animate-bounce" size={42} />
              <h3>{language === 'vi' ? 'Quyền truy cập bị từ chối' : 'Access Denied'}</h3>
              <p>
                {language === 'vi' 
                  ? 'Ví của bạn không được phân quyền Vận Chuyển (Logistics) để ghi chặng.' 
                  : 'Your wallet is not authorized as a Logistics agent to log timeline events.'}
              </p>
            </div>
          )
        }
        return renderLogisticsPanel()
      case 'admin':
        if (!activeRoles.isOwner) {
          return (
            <div className="tab-gating-alert">
              <AlertTriangle className="text-red-500 animate-bounce" size={42} />
              <h3>{language === 'vi' ? 'Quyền truy cập bị từ chối' : 'Access Denied'}</h3>
              <p>
                {language === 'vi' 
                  ? 'Chỉ có Chủ sở hữu Hợp đồng (Contract Owner) mới được cấu hình phân quyền.' 
                  : 'Only the Smart Contract Owner has access to configure roles.'}
              </p>
            </div>
          )
        }
        return renderAdminPanel()
      default:
        return null
    }
  }

  return (
    <div className="unit-details-page manage-theme">
      <div className="section-shell">
        {/* Back Link */}
        <a href="#/" onClick={handleBackToHome} className="back-link">
          <ArrowLeft size={16} />
          <span>{language === 'vi' ? 'Quay lại Trang chủ' : 'Back to Home'}</span>
        </a>

        {/* Page Header */}
        <div className="unit-header-block">
          <div className="unit-icon-wrapper">
            <Compass size={32} className="text-green-mid" />
          </div>
          <div>
            <h1>{language === 'vi' ? 'Cổng Quản Trị Chuỗi Cung Ứng' : 'Supply Chain Operator Console'}</h1>
            <p className="unit-subtitle">
              {language === 'vi' 
                ? 'Ghi nhật ký kiểm nghiệm theo Bộ quy tắc và phân quyền, cập nhật các chặng sổ cái bất biến lên Blockchain' 
                : 'Log rule-based quality reports, manage roles, and record immutable timeline stages on-chain'}
            </p>
          </div>
        </div>

        {/* Connection/Wallet Banner */}
        <div className="status-banner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div className="status-left">
              <Wallet size={22} className="status-shield-icon" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>
                  <strong>{language === 'vi' ? 'Ví kết nối: ' : 'Auditor Wallet: '}</strong>
                  <code className="text-xs">{account ? `${account.slice(0, 8)}...${account.slice(-8)}` : 'Disconnected'}</code>
                </span>
                <span className={`role-badge-pill role-${activeRoles.isOwner ? 'owner' : activeRoles.isFarmer ? 'farmer' : activeRoles.isLab ? 'lab' : activeRoles.isLogistics ? 'logistics' : 'norole'}`}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`status-badge-pill ${providerMode === 'chain' ? 'chain-mode' : 'fallback-mode'}`}>
                {providerMode === 'chain' 
                  ? (language === 'vi' ? '🔗 Blockchain Node Local' : '🔗 Local Blockchain Node')
                  : (language === 'vi' ? '⚠️ Giả Lập LocalLedger' : '⚠️ LocalLedger Simulator')}
              </span>
              {window.ethereum && providerMode !== 'chain' && (
                <button 
                  type="button" 
                  onClick={handleConnectWallet}
                  className="button button-secondary text-xs py-1 px-3 min-h-0"
                >
                  <RefreshCw size={12} className="mr-1" /> {language === 'vi' ? 'Kết nối Ví' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>

          {/* Simulated Role selector for sandbox testing (Refinement #6) */}
          {providerMode === 'fallback' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(217, 164, 65, 0.05)',
              border: '1px solid rgba(217, 164, 65, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginTop: '4px'
            }}>
              <span className="text-xs" style={{ color: 'var(--color-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={14} />
                <span>⚙️ {language === 'vi' ? 'Vai trò giả lập (Chỉ dùng kiểm thử offline):' : 'Offline simulated testing only:'}</span>
              </span>
              <select
                value={simulatedRole}
                onChange={(e) => setSimulatedRole(e.target.value)}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-gold)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                  fontWeight: 600
                }}
              >
                <option value="owner">{language === 'vi' ? 'Quản trị viên (Owner)' : 'Owner / Admin'}</option>
                <option value="farmer">{language === 'vi' ? 'Nông Dân (Farmer)' : 'Farmer'}</option>
                <option value="lab">{language === 'vi' ? 'Phòng Lab (Lab Testing)' : 'Lab Tester'}</option>
                <option value="logistics">{language === 'vi' ? 'Vận Chuyển (Logistics)' : 'Logistics Operator'}</option>
                <option value="norole">{language === 'vi' ? 'Không có vai trò' : 'No Role / Consumer'}</option>
              </select>
            </div>
          )}
        </div>

        {/* Console Operator Navigation Tabs */}
        <div className="portal-tabs" style={{ display: 'flex', gap: '4px', margin: '24px 0', borderBottom: '1px solid rgba(31,71,52,0.1)', paddingBottom: '1px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'farmer' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('farmer')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {language === 'vi' ? 'Nông Dân' : 'Farmer'}
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('lab')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {language === 'vi' ? 'Kiểm Nghiệm' : 'Lab Analyst'}
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('logistics')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {language === 'vi' ? 'Vận Chuyển' : 'Logistics'}
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {language === 'vi' ? 'Quản Trị Hợp Đồng' : 'Role Admin'}
          </button>
        </div>

        {/* Tab content panel */}
        <div style={{ minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
          {renderTabWithGating()}
        </div>

        {/* Success QR display code */}
        {newlyRegisteredBatchId && activeTab === 'farmer' && (
          <div className="dashboard-card qr-success-card" style={{ marginTop: '24px', border: '2px solid var(--color-green-mid)', background: 'rgba(31, 71, 52, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 className="text-green-mid" size={20} />
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-green-deep)', fontWeight: 700 }}>
                  {language === 'vi' ? 'Tạo Nhãn QR Cho Lô Hàng' : 'Batch Printable QR Label Ready'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setNewlyRegisteredBatchId('')} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)' }}
                aria-label="Dismiss QR"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <BatchQRLabel batchId={newlyRegisteredBatchId} language={language} loading={false} />
            </div>
          </div>
        )}

        {/* Transaction Messages & Feedback Panel */}
        {txMessage.text && (
          <div 
            className={`tx-feedback-banner tx-type-${txMessage.type} dashboard-card mt-6`}
            role={txMessage.type === 'error' ? 'alert' : 'status'}
            aria-live={txMessage.type === 'error' ? 'assertive' : 'polite'}
            style={{ marginTop: '24px' }}
          >
            {txMessage.type === 'success' && <CheckCircle2 className="tx-icon text-green-mid" />}
            {txMessage.type === 'error' && <AlertTriangle className="tx-icon text-red-500" />}
            {txMessage.type === 'info' && <RefreshCw className="tx-icon text-gold animate-spin" />}
            <div>
              <h3>{txMessage.type === 'success' ? (language === 'vi' ? 'Thực thi giao dịch thành công' : 'Transaction Success') : (txMessage.type === 'error' ? (language === 'vi' ? 'Lỗi hệ thống' : 'System Error') : (language === 'vi' ? 'Đang gửi giao dịch...' : 'Processing Transaction...'))}</h3>
              <p>{txMessage.text}</p>
            </div>
          </div>
        )}

        {/* Educational Callout */}
        <div className="dashboard-card visual-callout-card mt-6" style={{ marginTop: '24px' }}>
          <div className="card-header-with-icon">
            <ShieldCheck className="card-icon" size={20} />
            <h2>{language === 'vi' ? 'Cơ Chế Bảo Mật Blockchain' : 'Blockchain Ledger Security Architecture'}</h2>
          </div>
          <p className="callout-text">
            {language === 'vi' 
              ? 'Tất cả các giao dịch gửi từ Cổng quản trị này được ký trực tiếp bằng Khóa bí mật (Private Key) của ví kiểm định viên. Dữ liệu khi đã nạp vào chuỗi khối Hardhat sẽ sinh ra một địa chỉ TxHash bất biến duy nhất. Người tiêu dùng sử dụng Trình quét mã QR có thể hoàn toàn yên tâm thông tin kiểm định hóa chất Cadmium này đã được xác thực mã hóa 100%, không bị sửa đổi bởi các bên trung gian.'
              : 'Every log submitted via this Operator console is cryptographically signed by the Inspector\'s private key. Once accepted into the EVM blockchain, it generates an immutable, timestamped transaction proof. Consumers scanning the package QR code can rest assured that this Cadmium assay and quality safety rating was certified directly at the source, preventing any tampering by distributors.'}
          </p>
        </div>

      </div>
    </div>
  )
}
