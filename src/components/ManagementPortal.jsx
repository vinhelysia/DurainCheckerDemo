import { useState, useEffect } from 'react'
import { BrowserProvider, JsonRpcProvider, Contract } from 'ethers'
import { useLanguage } from './LanguageContext'
import { Sprout, Plus, Compass, ShieldCheck, Cpu, Wallet, Send, CheckCircle2, AlertTriangle, FileText, ArrowLeft, RefreshCw } from 'lucide-react'

export default function ManagementPortal() {
  const { language } = useLanguage()
  
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
  const [txMessage, setTxMessage] = useState({ text: '', type: '' }) // type: 'success' | 'error'
  const [registeredIds, setRegisteredIds] = useState([])
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Registration Form State
  const [batchId, setBatchId] = useState('')
  const [farmVi, setFarmVi] = useState('')
  const [farmEn, setFarmEn] = useState('')
  const [provinceVi, setProvinceVi] = useState('Lâm Đồng')
  const [provinceEn, setProvinceEn] = useState('Lam Dong')
  const [harvestDate, setHarvestDate] = useState('')
  const [cadmiumPpm, setCadmiumPpm] = useState('0.030')

  // Timeline Form State
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [stageVi, setStageVi] = useState('Thu hoạch')
  const [stageEn, setStageEn] = useState('Harvest')
  const [locationVi, setLocationVi] = useState('')
  const [locationEn, setLocationEn] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStatus, setEventStatus] = useState(1) // 1 = Complete, 0 = Pending

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
    
    // Random cadmium level from 0.01 to 0.08
    const randomCd = (Math.random() * 0.07 + 0.01).toFixed(3)
    setCadmiumPpm(randomCd)
    setTxMessage({ text: '', type: '' })
  }

  // Live AI Auditor logic based on input Cadmium (deterministic/pure)
  const runAiAuditor = (cdVal) => {
    const cd = parseFloat(cdVal) || 0
    const cdInt = Math.round(cd * 1000)
    let riskLevel = 'low'
    let aiResultVi = 'Đạt chuẩn xuất khẩu'
    let aiResultEn = 'Export-ready'
    let confidence
    let riskCauseVi = 'Cadimi và Vàng O trong ngưỡng cho phép'
    let riskCauseEn = 'Cadmium and Yellow O within limits'

    if (cd > 0.05) {
      riskLevel = 'high'
      aiResultVi = 'Không đạt - giữ lô'
      aiResultEn = 'Hold - does not pass'
      confidence = 82 + (cdInt % 14)
      riskCauseVi = 'Hàm lượng Cadimi vượt ngưỡng an toàn cho phép (> 0.05 ppm)'
      riskCauseEn = 'Cadmium level exceeds safe limits (> 0.05 ppm)'
    } else if (cd >= 0.045) {
      riskLevel = 'medium'
      aiResultVi = 'Cần kiểm tra lại'
      aiResultEn = 'Needs re-check'
      confidence = 62 + (cdInt % 15)
      riskCauseVi = 'Hàm lượng Cadimi gần ngưỡng cảnh báo, đề nghị kiểm tra bổ sung'
      riskCauseEn = 'Cadmium level near threshold; supplementary assay recommended'
    } else {
      confidence = 90 + (cdInt % 9)
    }

    return { riskLevel, aiResultVi, aiResultEn, confidence, riskCauseVi, riskCauseEn }
  }

  const aiAudit = runAiAuditor(cadmiumPpm)

  // Initialize blockchain client connection
  useEffect(() => {
    async function loadContract() {
      try {
        const configRes = await fetch('/contracts/DurianTrust.json')
        if (!configRes.ok) throw new Error('Contract config not found')
        const config = await configRes.json()
        setContractInfo(config)

        let provider
        let currentAccount = ''

        // 1. Try browser wallet first
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

        // 2. If no browser account, check direct Hardhat Node via localhost
        if (!currentAccount) {
          try {
            const tempProvider = new JsonRpcProvider('http://127.0.0.1:8545')
            const signers = await tempProvider.listAccounts()
            if (signers.length > 0) {
              provider = tempProvider
              currentAccount = signers[0].address
              console.log('Using Hardhat dev account:', currentAccount)
            }
          } catch (e) {
            console.warn('Hardhat local node unreachable', e)
          }
        }

        if (currentAccount && provider) {
          setAccount(currentAccount)
          setProviderMode('chain')
          
          // Get registered batch IDs from contract
          const contract = new Contract(config.address, config.abi, provider)
          const ids = await contract.getBatchIds()
          setRegisteredIds(ids)
          if (ids.length > 0 && !selectedBatchId) {
            setSelectedBatchId(ids[ids.length - 1])
          }
        } else {
          // fallback mode
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTrigger])

  // Connect wallet manual trigger
  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert(language === 'vi' ? 'Vui lòng cài đặt Metamask!' : 'Please install MetaMask!')
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

  // Handle province change and autotranslate
  const handleProvinceChange = (val) => {
    setProvinceVi(val)
    setProvinceEn(PROVINCES[val] || val)
  }

  // Register Batch Submit Handler
  const handleRegisterBatch = async (e) => {
    e.preventDefault()
    if (!batchId) {
      alert(language === 'vi' ? 'Vui lòng nhập Mã Lô hàng!' : 'Please enter Batch ID!')
      return
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })

    const cadmiumValueScaled = Math.round(parseFloat(cadmiumPpm) * 10000)
    const thresholdValueScaled = 500 // 0.05 ppm * 10000
    const confidenceScaled = Math.round(aiAudit.confidence * 100)
    const riskLevelEnum = aiAudit.riskLevel === 'low' ? 0 : aiAudit.riskLevel === 'medium' ? 1 : 2

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
          aiAudit.aiResultVi,
          aiAudit.aiResultEn,
          confidenceScaled,
          riskLevelEnum,
          aiAudit.riskCauseVi,
          aiAudit.riskCauseEn
        )

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch lên Blockchain...' : 'Broadcasting transaction to blockchain...',
          type: 'info'
        })

        await tx.wait()
        
        // Also register an initial harvest timeline event automatically
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

        // Refresh lists
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
        await new Promise(r => setTimeout(r, 800)) // simulated network lag
        
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        
        // Check duplication
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
          aiResult: { vi: aiAudit.aiResultVi, en: aiAudit.aiResultEn },
          confidence: aiAudit.confidence / 100,
          riskLevel: aiAudit.riskLevel,
          riskCause: { vi: aiAudit.riskCauseVi, en: aiAudit.riskCauseEn },
          timeline: [
            {
              stage: { vi: 'Thu hoạch', en: 'Harvest' },
              location: { vi: `${farmVi}, ${provinceVi}`, en: `${farmEn}, ${provinceEn}` },
              date: harvestDate || new Date().toISOString().split('T')[0],
              status: 'complete'
            }
          ],
          blockchainHash: '0x' + Math.random().toString(16).slice(2, 18) + '...simulated'
        }

        localBatches.push(newBatch)
        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

        setTxMessage({
          text: language === 'vi' 
            ? 'Đăng ký thành công! Đã ghi nhận vào Sổ cái giả lập (LocalStorage).' 
            : 'Success! Registered batch in Simulated Local Ledger.',
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

  // Add Timeline Event Submit Handler
  const handleAddTimeline = async (e) => {
    e.preventDefault()
    if (!selectedBatchId) {
      alert(language === 'vi' ? 'Vui lòng chọn Lô sầu riêng!' : 'Please select a Batch ID!')
      return
    }
    if (!locationVi) {
      alert(language === 'vi' ? 'Vui lòng nhập địa điểm!' : 'Please enter location!')
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

  // Helper to sync stages
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
                ? 'Ghi nhật ký kiểm nghiệm AI và cập nhật dòng thời gian minh bạch lên Blockchain' 
                : 'Log AI quality audits and broadcast transparent timeline events on-chain'}
            </p>
          </div>
        </div>

        {/* Connection/Wallet Banner */}
        <div className="status-banner">
          <div className="status-left">
            <Wallet size={22} className="status-shield-icon" />
            <span>
              <strong>{language === 'vi' ? 'Ví kết nối: ' : 'Auditor Wallet: '}</strong>
              <code className="text-xs">{account ? `${account.slice(0, 8)}...${account.slice(-8)}` : 'Disconnected'}</code>
            </span>
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

        {/* Main Grid */}
        <div className="unit-dashboard-grid">
          {/* Card 1: Register New Batch */}
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
                      if (!farmEn) setFarmEn(e.target.value) // simple helper
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

              <div className="form-group">
                <label htmlFor="m-cadmium">{language === 'vi' ? 'Kết quả kiểm nghiệm Cadimi (ppm)' : 'Cadmium Assay Level (ppm)'}</label>
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

              {/* Real-time AI auditor indicator card */}
              <div className={`ai-preview-panel risk-${aiAudit.riskLevel}`}>
                <div className="ai-preview-header">
                  <Cpu size={16} />
                  <span>{language === 'vi' ? 'ĐÁNH GIÁ CHẤT LƯỢNG AI (TẠM TÍNH)' : 'AI REAL-TIME AUDITING PREVIEW'}</span>
                </div>
                <div className="ai-preview-body">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">
                      {language === 'vi' ? aiAudit.aiResultVi : aiAudit.aiResultEn}
                    </span>
                    <span className={`risk-badge risk-${aiAudit.riskLevel}`}>
                      {aiAudit.riskLevel === 'low' ? (language === 'vi' ? 'Đạt chuẩn' : 'Safe') : (aiAudit.riskLevel === 'medium' ? (language === 'vi' ? 'Cần kiểm tra' : 'Review') : (language === 'vi' ? 'Giữ lại' : 'Critical'))}
                    </span>
                  </div>
                  <div className="text-xs opacity-80">
                    <strong>{language === 'vi' ? 'Độ tin cậy: ' : 'Confidence: '}</strong> {aiAudit.confidence}%
                  </div>
                  <div className="text-xs mt-1 italic opacity-90">
                    &ldquo;{language === 'vi' ? aiAudit.riskCauseVi : aiAudit.riskCauseEn}&rdquo;
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

          {/* Card 2: Timeline Stage Adder */}
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
        </div>

        {/* Transaction Messages & Feedback Panel */}
        {txMessage.text && (
          <div className={`tx-feedback-banner tx-type-${txMessage.type} dashboard-card mt-6`}>
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
        <div className="dashboard-card visual-callout-card mt-6">
          <div className="card-header-with-icon">
            <ShieldCheck className="card-icon" size={20} />
            <h2>{language === 'vi' ? 'Cơ Chế Bảo Mật Blockchain' : 'Blockchain Ledger Security Architecture'}</h2>
          </div>
          <p className="callout-text">
            {language === 'vi' 
              ? 'Tất cả các giao dịch gửi từ Cổng quản trị này được ký trực tiếp bằng Khóa bí mật (Private Key) của ví kiểm định viên. Dữ liệu khi đã nạp vào chuỗi khối Hardhat sẽ sinh ra một địa chỉ TxHash bất biến duy nhất. Người tiêu dùng sử dụng Trình quét mã QR có thể hoàn toàn yên tâm thông tin kiểm định hóa chất Cadmium này đã được xác thực mã hóa 100%, không bị sửa đổi bởi các bên trung gian.'
              : 'Every log submitted via this Operator console is cryptographically signed by the Inspector\'s private key. Once accepted into the EVM blockchain, it generates an immutable, timestamped transaction proof. Consumers scanning the package QR code can rest assured that this Cadmium assay and AI safety rating was certified directly at the source, preventing any tampering by distributors.'}
          </p>
        </div>

      </div>
    </div>
  )
}
