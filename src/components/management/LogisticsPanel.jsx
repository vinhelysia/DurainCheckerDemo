import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'

export default function LogisticsPanel({
  language,
  loading,
  registeredIds,
  selectedBatchId,
  setSelectedBatchId,
  addTimelineEvent
}) {
  const [stageVi, setStageVi] = useState('Thu hoạch')
  const [stageEn, setStageEn] = useState('Harvest')
  const [locationVi, setLocationVi] = useState('')
  const [locationEn, setLocationEn] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStatus, setEventStatus] = useState(1) // 1 = Complete, 0 = Pending

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

  const onSubmit = async (e) => {
    e.preventDefault()
    const success = await addTimelineEvent(
      selectedBatchId,
      stageVi,
      stageEn,
      locationVi,
      locationEn,
      eventDate,
      eventStatus
    )
    if (success) {
      setLocationVi('')
      setLocationEn('')
    }
  }

  return (
    <div className="dashboard-card blockchain-logs-card">
      <div className="card-header-with-icon">
        <FileText className="card-icon" size={20} />
        <h2>{language === 'vi' ? 'Cập Nhật Lịch Trình (Timeline)' : 'Log Supply Chain Timeline Stage'}</h2>
      </div>

      <form onSubmit={onSubmit} className="manage-form">
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
