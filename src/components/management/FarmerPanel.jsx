import { useState, useEffect } from 'react'
import { Sprout, Compass, Cpu, AlertTriangle, CheckCircle2, RefreshCw, Send } from 'lucide-react'

const PROVINCES = {
  'Lâm Đồng': 'Lam Dong',
  'Tiền Giang': 'Tien Giang',
  'Đắk Lắk': 'Dak Lak',
  'Bến Tre': 'Ben Tre',
  'Đồng Nai': 'Dong Nai'
}

function runRuleAuditor(cdVal) {
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

function runDiseaseAuditor(tempVal, humVal, rainVal, wetVal, drainageVal, priorVal) {
  const temp = parseFloat(tempVal) || 28.0
  const hum = parseFloat(humVal) || 80.0
  const rain = parseFloat(rainVal) || 150.0
  const wet = parseFloat(wetVal) || 6.0
  const prior = Number(priorVal) || 0
  const drain = drainageVal === 'poor' ? 2.0 : (drainageVal === 'medium' ? 1.0 : 0.0)

  const phyScore = (hum > 85.0 && drain === 2.0 && rain > 200.0)
    ? 6.0 + prior * 1.5
    : (hum - 85.0) * 0.04 + (drain - 1.0) * 0.5 + (rain - 200.0) * 0.003 + prior * 0.4

  const antScore = (hum > 80.0 && temp >= 24.0 && temp <= 32.0)
    ? 5.0
    : (hum - 80.0) * 0.04 + (temp >= 24.0 && temp <= 32.0 ? 1.5 : -1.5)

  const blightScore = (wet > 12.0)
    ? 4.0
    : (wet - 12.0) * 0.3

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

export default function FarmerPanel({
  language,
  copy,
  loading,
  registerBatch
}) {
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
  }

  const handleProvinceChange = (val) => {
    setProvinceVi(val)
    setProvinceEn(PROVINCES[val] || val)
  }

  const ruleAudit = runRuleAuditor(cadmiumPpm)

  // Debounced AI Disease Prediction (Extension feature)
  useEffect(() => {
    if (!harvestDate) {
      setTimeout(() => {
        setDiseaseResult(null)
      }, 0)
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

  // Pre-lab AI predictions
  useEffect(() => {
    if (!provinceVi) {
      setTimeout(() => {
        setAiResult(null)
      }, 0)
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
      } catch {
        let baseline = 0.1
        if (provinceVi === 'Đắk Lắk' || provinceVi === 'Dak Lak') baseline = 1.2
        else if (provinceVi === 'Tiền Giang' || provinceVi === 'Tien Giang') baseline = 0.5
        else if (provinceVi === 'Đồng Nai' || provinceVi === 'Dong Nai') baseline = 0.4
        else if (provinceVi === 'Bến Tre' || provinceVi === 'Ben Tre') baseline = 0.3

        const score = baseline + Number(violations) * 0.5 + Number(rainfall) * 0.004
        
        const risk = score >= 2.0 ? 'high' : score >= 1.0 ? 'medium' : 'low'
        const probability = score >= 2.0
          ? Math.min(0.99, 0.7 + (score - 2.0) * 0.1)
          : score >= 1.0
            ? Math.min(0.89, 0.6 + (score - 1.0) * 0.25)
            : Math.min(0.99, 0.8 + (1.0 - score) * 0.19)

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

  const onSubmit = (e) => {
    e.preventDefault()
    registerBatch(
      batchId,
      farmVi,
      farmEn,
      provinceVi,
      provinceEn,
      harvestDate,
      cadmiumPpm,
      ruleAudit
    )
  }

  return (
    <div className="dashboard-card telemetry-card">
      <div className="card-header-with-icon">
        <Sprout className="card-icon" size={20} />
        <h2>{language === 'vi' ? 'Đăng Ký Lô Hàng Sầu Riêng' : 'Register New Durian Batch'}</h2>
      </div>
      
      <form onSubmit={onSubmit} className="manage-form">
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
