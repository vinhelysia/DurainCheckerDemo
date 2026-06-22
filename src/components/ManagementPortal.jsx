import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { useConnection, useWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { useLanguage } from './LanguageContext'
import { ArrowLeft, Wallet, Compass, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react'
import '@solana/wallet-adapter-react-ui/styles.css'

import { useBatchTransaction } from '../hooks/useBatchTransaction'
import { getConfigPda, getFarmerPda, getLabRolePda, getLogisticsPda } from '../lib/pda'

import FarmerPanel from './management/FarmerPanel'
import LabPanel from './management/LabPanel'
import LogisticsPanel from './management/LogisticsPanel'
import AdminPanel from './management/AdminPanel'

const BatchQRLabel = lazy(() => import('./BatchQRLabel'))
const WalletMultiButton = lazy(() => import('@solana/wallet-adapter-react-ui').then(module => ({ default: module.WalletMultiButton })))

function ManagementPortalContent() {
  const { language, copy } = useLanguage()
  const { connection } = useConnection()
  const wallet = useWallet()
  
  // Navigation back to home
  const handleBackToHome = (e) => {
    e.preventDefault()
    window.location.hash = '#/'
  }

  // State
  const [contractInfo, setContractInfo] = useState(null)
  const [account, setAccount] = useState('')
  const [providerMode, setProviderMode] = useState('fallback') // 'chain' | 'fallback'
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Derive program from wallet + connection + IDL info
  const program = useMemo(() => {
    if (!wallet.publicKey || !contractInfo) return null
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    }
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
    })
    return new Program(contractInfo, provider)
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, contractInfo])

  // Gating & Roles
  const [userRoles, setUserRoles] = useState({
    isOwner: false,
    isFarmer: false,
    isLab: false,
    isLogistics: false
  })
  const [simulatedRole, setSimulatedRole] = useState('owner') // 'owner' | 'farmer' | 'lab' | 'logistics' | 'norole'
  const [activeTab, setActiveTab] = useState('farmer') // 'farmer' | 'lab' | 'logistics' | 'admin'

  // Global batch selection state shared between panels
  const [registeredIds, setRegisteredIds] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')

  // Resolve roles based on current active providerMode
  const activeRoles = useMemo(() => {
    return providerMode === 'chain' ? {
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
  }, [providerMode, userRoles, simulatedRole])

  // Custom hook containing all blockchain/sandbox mutations
  const {
    loading,
    txMessage,
    setTxMessage,
    newlyRegisteredBatchId,
    setNewlyRegisteredBatchId,
    registerBatch,
    updateLabReport,
    addTimelineEvent,
    handleRoleAction,
    handleInitializeProgram
  } = useBatchTransaction({
    program,
    connection,
    wallet,
    providerMode,
    language,
    account,
    activeRoles,
    setReloadTrigger
  })

  // Initialize blockchain client connection and read user roles
  useEffect(() => {
    async function loadContract() {
      try {
        const configRes = await fetch(`${import.meta.env.BASE_URL}solana/idl.json`)
        if (!configRes.ok) throw new Error('Contract IDL config not found')
        const config = await configRes.json()
        setContractInfo(config)

        if (wallet.publicKey && program) {
          const userPubkey = wallet.publicKey
          setAccount(userPubkey.toString())
          setProviderMode('chain')
          
          // 1. Fetch Config to get authority
          const configPda = getConfigPda(program.programId)
          
          let isOwner = false
          try {
            const configAccount = await program.account.config.fetch(configPda)
            isOwner = configAccount.authority.equals(userPubkey)
          } catch (e) {
            console.warn('Could not fetch Config PDA account info', e)
          }

          // Helper to check if a PDA account exists
          const checkPdaExists = async (pda) => {
            const accountInfo = await connection.getAccountInfo(pda)
            return accountInfo !== null
          }

          const isFarmer = await checkPdaExists(getFarmerPda(userPubkey, program.programId))
          const isLab = await checkPdaExists(getLabRolePda(userPubkey, program.programId))
          const isLogistics = await checkPdaExists(getLogisticsPda(userPubkey, program.programId))

          setUserRoles({
            isOwner,
            isFarmer,
            isLab,
            isLogistics
          })

          const fetched = await program.account.batch.all()
          const ids = fetched.map(item => item.account.id)
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
      setAccount('')
      
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
  }, [wallet.publicKey, connection, program, reloadTrigger])

  // Resolved role string for displaying on wallet chip
  const getRoleLabel = () => {
    if (activeRoles.isOwner) return language === 'vi' ? 'Chủ Sở Hữu (Admin)' : 'Owner (Admin)'
    if (activeRoles.isFarmer) return language === 'vi' ? 'Nông Dân' : 'Farmer'
    if (activeRoles.isLab) return language === 'vi' ? 'Kiểm Nghiệm (Lab)' : 'Lab Tester'
    if (activeRoles.isLogistics) return language === 'vi' ? 'Vận Chuyển' : 'Logistics'
    return language === 'vi' ? 'Không có vai trò' : 'No Role'
  }

  // Sub-Render functions for tabs with role gating
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
        return (
          <FarmerPanel
            language={language}
            copy={copy}
            loading={loading}
            registerBatch={registerBatch}
            newlyRegisteredBatchId={newlyRegisteredBatchId}
            setNewlyRegisteredBatchId={setNewlyRegisteredBatchId}
          />
        )
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
        return (
          <LabPanel
            language={language}
            copy={copy}
            loading={loading}
            registeredIds={registeredIds}
            selectedBatchId={selectedBatchId}
            setSelectedBatchId={setSelectedBatchId}
            updateLabReport={updateLabReport}
            account={account}
            providerMode={providerMode}
            contractInfo={contractInfo}
            program={program}
            reloadTrigger={reloadTrigger}
          />
        )
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
        return (
          <LogisticsPanel
            language={language}
            copy={copy}
            loading={loading}
            registeredIds={registeredIds}
            selectedBatchId={selectedBatchId}
            setSelectedBatchId={setSelectedBatchId}
            addTimelineEvent={addTimelineEvent}
          />
        )
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
              {wallet.publicKey && (
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={handleInitializeProgram}
                    disabled={loading}
                    className="button button-primary"
                  >
                    <span>{language === 'vi' ? 'Khởi tạo Chương trình' : 'Initialize Program'}</span>
                  </button>
                </div>
              )}
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {wallet.publicKey && (
              <div className="dashboard-card telemetry-card">
                <div className="card-header-with-icon">
                  <ShieldCheck className="card-icon" size={20} />
                  <h2>{language === 'vi' ? 'Khởi Tạo Chương Trình' : 'Initialize Program'}</h2>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: 'var(--color-ink-soft)' }}>
                    {language === 'vi'
                      ? 'Chương trình đã được khởi tạo, nhưng bạn có thể chạy lại lệnh khởi tạo nếu cần (nó sẽ báo lỗi nếu đã khởi tạo).'
                      : 'The program is already initialized, but you can trigger initialization again if needed (it will return an error if already initialized).'}
                  </p>
                  <button
                    onClick={handleInitializeProgram}
                    disabled={loading}
                    className="button button-primary"
                  >
                    <span>{language === 'vi' ? 'Khởi tạo Chương trình' : 'Initialize Program'}</span>
                  </button>
                </div>
              </div>
            )}
            <AdminPanel
              language={language}
              copy={copy}
              loading={loading}
              handleRoleAction={handleRoleAction}
            />
          </div>
        )
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-badge-pill ${providerMode === 'chain' ? 'chain-mode' : 'fallback-mode'}`}>
                {providerMode === 'chain' 
                  ? (language === 'vi' ? '🔗 Solana Devnet' : '🔗 Solana Devnet')
                  : (language === 'vi' ? '⚠️ Giả Lập LocalLedger' : '⚠️ LocalLedger Simulator')}
              </span>
              <Suspense fallback={<span className="text-xs opacity-70">Loading Wallet...</span>}>
                <WalletMultiButton className="button button-secondary text-xs py-1 px-3 min-h-0" style={{ height: 'auto', lineHeight: 'normal', padding: '6px 12px', fontSize: '0.75rem', background: 'var(--color-surface-alt)', border: '1px solid var(--color-green-mid)', color: 'var(--color-green-deep)', borderRadius: '4px' }} />
              </Suspense>
            </div>
          </div>

          {/* Simulated Role selector for sandbox testing */}
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
                <RefreshCw size={14} />
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
              <Suspense fallback={<div className="qr-fallback" style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-soft)', fontStyle: 'italic', fontSize: '0.85rem' }}>{language === 'vi' ? 'Đang tải mã QR...' : 'Loading QR Code...'}</div>}>
                <BatchQRLabel batchId={newlyRegisteredBatchId} language={language} loading={false} />
              </Suspense>
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
              {txMessage.type === 'success' && txMessage.txSig && (
                <div style={{ marginTop: '8px' }}>
                  <a
                    href={`https://explorer.solana.com/tx/${txMessage.txSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--color-green-mid)',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      textDecoration: 'underline'
                    }}
                  >
                    {language === 'vi' ? 'Xem giao dịch trên Solana Explorer' : 'View transaction on Solana Explorer'}
                  </a>
                </div>
              )}
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

export default function ManagementPortal() {
  const endpoint = useMemo(() => import.meta.env.VITE_RPC_URL || clusterApiUrl('devnet'), [])
  
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ManagementPortalContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
