import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'

export default function AdminPanel({
  language,
  loading,
  handleRoleAction
}) {
  const [targetAddress, setTargetAddress] = useState('')
  const [targetRole, setTargetRole] = useState('farmer') // 'farmer' | 'lab' | 'logistics'

  const onAction = async (actionType) => {
    const success = await handleRoleAction(actionType, targetAddress, targetRole)
    if (success) {
      setTargetAddress('')
    }
  }

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
            onClick={() => onAction('assign')}
            disabled={loading}
            className="button button-primary"
            style={{ flex: 1 }}
            type="button"
          >
            <span>{language === 'vi' ? 'Cấp quyền' : 'Assign Access'}</span>
          </button>
          <button
            onClick={() => onAction('revoke')}
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
