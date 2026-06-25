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
    if (activeRoles.isOwner) return copy.managePortal.rolesDetail.owner
    if (activeRoles.isFarmer) return copy.managePortal.rolesDetail.farmer
    if (activeRoles.isLab) return copy.managePortal.rolesDetail.lab
    if (activeRoles.isLogistics) return copy.managePortal.rolesDetail.logistics
    return copy.managePortal.rolesDetail.norole
  }

  // Sub-Render functions for tabs with role gating
  const renderTabWithGating = () => {
    switch (activeTab) {
      case 'farmer':
        if (!activeRoles.isFarmer && !activeRoles.isOwner) {
          return (
            <div className="tab-gating-alert">
              <AlertTriangle className="text-red-500 animate-bounce" size={42} />
              <h3>{copy.managePortal.gating.accessDenied}</h3>
              <p>
                {copy.managePortal.gating.farmerDenied}
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
              <h3>{copy.managePortal.gating.accessDenied}</h3>
              <p>
                {copy.managePortal.gating.labDenied}
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
              <h3>{copy.managePortal.gating.accessDenied}</h3>
              <p>
                {copy.managePortal.gating.logisticsDenied}
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
              <h3>{copy.managePortal.gating.accessDenied}</h3>
              <p>
                {copy.managePortal.gating.adminDenied}
              </p>
              {wallet.publicKey && (
                <div className="manage-init-btn-wrap">
                  <button
                    onClick={handleInitializeProgram}
                    disabled={loading}
                    className="button button-primary"
                  >
                    <span>{copy.managePortal.gating.initProgram}</span>
                  </button>
                </div>
              )}
            </div>
          )
        }
        return (
          <div className="manage-admin-container">
            {wallet.publicKey && (
              <div className="dashboard-card telemetry-card">
                <div className="card-header-with-icon">
                  <ShieldCheck className="card-icon" size={20} />
                  <h2>{copy.managePortal.admin.initTitle}</h2>
                </div>
                <div className="manage-init-body">
                  <p className="manage-init-text">
                    {copy.managePortal.admin.initDesc}
                  </p>
                  <button
                    onClick={handleInitializeProgram}
                    disabled={loading}
                    className="button button-primary"
                  >
                    <span>{copy.managePortal.gating.initProgram}</span>
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
          <span>{copy.managePortal.backToHome}</span>
        </a>

        {/* Page Header */}
        <div className="unit-header-block">
          <div className="unit-icon-wrapper">
            <Compass size={32} className="text-green-mid" />
          </div>
          <div>
            <h1>{copy.managePortal.title}</h1>
            <p className="unit-subtitle">
              {copy.managePortal.subtitle}
            </p>
          </div>
        </div>

        {/* Connection/Wallet Banner */}
        <div className="status-banner manage-status-banner">
          <div className="manage-status-row">
            <div className="status-left">
              <Wallet size={22} className="status-shield-icon" />
              <div className="manage-status-left-details">
                <span>
                  <strong>{copy.managePortal.walletLabel}</strong>
                  <code className="text-xs">{account ? `${account.slice(0, 8)}...${account.slice(-8)}` : 'Disconnected'}</code>
                </span>
                <span className={`role-badge-pill role-${activeRoles.isOwner ? 'owner' : activeRoles.isFarmer ? 'farmer' : activeRoles.isLab ? 'lab' : activeRoles.isLogistics ? 'logistics' : 'norole'}`}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>
            
            <div className="manage-status-right-details">
              <span className={`status-badge-pill ${providerMode === 'chain' ? 'chain-mode' : 'fallback-mode'}`}>
                {providerMode === 'chain' 
                  ? copy.managePortal.devnet
                  : copy.managePortal.fallbackMode}
              </span>
              <Suspense fallback={<span className="text-xs opacity-70">Loading Wallet...</span>}>
                <WalletMultiButton className="button button-secondary text-xs py-1 px-3 min-h-0 manage-wallet-button" />
              </Suspense>
            </div>
          </div>
          
          {/* Simulated Role selector for sandbox testing */}
          {providerMode === 'fallback' && (
            <div className="sim-role-box">
              <span className="text-xs sim-role-label">
                <RefreshCw size={14} />
                <span>⚙️ {copy.managePortal.simulatedLabel}</span>
              </span>
              <select
                value={simulatedRole}
                onChange={(e) => setSimulatedRole(e.target.value)}
                className="sim-role-select"
                aria-label={copy.managePortal.simulatedRoleSelector}
              >
                <option value="owner">{copy.managePortal.simulatedRoles.owner}</option>
                <option value="farmer">{copy.managePortal.simulatedRoles.farmer}</option>
                <option value="lab">{copy.managePortal.simulatedRoles.lab}</option>
                <option value="logistics">{copy.managePortal.simulatedRoles.logistics}</option>
                <option value="norole">{copy.managePortal.simulatedRoles.norole}</option>
              </select>
            </div>
          )}
        </div>

        {/* Console Operator Navigation Tabs */}
        <div className="portal-tabs" role="tablist" aria-label={copy.managePortal.tabsAriaLabel}>
          <button
            id="tab-farmer"
            type="button"
            role="tab"
            aria-selected={activeTab === 'farmer'}
            aria-controls="manage-tab-panel"
            tabIndex={activeTab === 'farmer' ? 0 : -1}
            className={`portal-tab-btn ${activeTab === 'farmer' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('farmer')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {copy.managePortal.tabs.farmer}
          </button>
          <button
            id="tab-lab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'lab'}
            aria-controls="manage-tab-panel"
            tabIndex={activeTab === 'lab' ? 0 : -1}
            className={`portal-tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('lab')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {copy.managePortal.tabs.lab}
          </button>
          <button
            id="tab-logistics"
            type="button"
            role="tab"
            aria-selected={activeTab === 'logistics'}
            aria-controls="manage-tab-panel"
            tabIndex={activeTab === 'logistics' ? 0 : -1}
            className={`portal-tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('logistics')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {copy.managePortal.tabs.logistics}
          </button>
          <button
            id="tab-admin"
            type="button"
            role="tab"
            aria-selected={activeTab === 'admin'}
            aria-controls="manage-tab-panel"
            tabIndex={activeTab === 'admin' ? 0 : -1}
            className={`portal-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin')
              setTxMessage({ text: '', type: '' })
            }}
          >
            {copy.managePortal.tabs.admin}
          </button>
        </div>

        {/* Tab content panel */}
        <div id="manage-tab-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="manage-tab-content">
          {renderTabWithGating()}
        </div>

        {/* Success QR display code */}
        {newlyRegisteredBatchId && activeTab === 'farmer' && (
          <div className="dashboard-card qr-success-card">
            <div className="qr-success-header">
              <div className="qr-success-title-wrap">
                <CheckCircle2 className="text-green-mid" size={20} />
                <h3 className="qr-success-title">
                  {copy.managePortal.qr.ready}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setNewlyRegisteredBatchId('')} 
                className="qr-success-close"
                aria-label="Dismiss QR"
              >
                <X size={18} />
              </button>
            </div>
            <div className="qr-success-body">
              <Suspense fallback={<div className="qr-fallback">{copy.managePortal.qr.loading}</div>}>
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
          >
            {txMessage.type === 'success' && <CheckCircle2 className="tx-icon text-green-mid" />}
            {txMessage.type === 'error' && <AlertTriangle className="tx-icon text-red-500" />}
            {txMessage.type === 'info' && <RefreshCw className="tx-icon text-gold animate-spin" />}
            <div>
              <h3>
                {txMessage.type === 'success' 
                  ? copy.managePortal.tx.success 
                  : txMessage.type === 'error' 
                    ? copy.managePortal.tx.error 
                    : copy.managePortal.tx.processing}
              </h3>
              <p>{txMessage.text}</p>
              {txMessage.type === 'success' && txMessage.txSig && (
                <div className="tx-feedback-link-wrap">
                  <a
                    href={`https://explorer.solana.com/tx/${txMessage.txSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    {copy.managePortal.tx.viewExplorer}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Educational Callout */}
        <div className="dashboard-card visual-callout-card mt-6">
          <div className="card-header-with-icon">
            <ShieldCheck className="card-icon" size={20} />
            <h2>{copy.managePortal.security.title}</h2>
          </div>
          <p className="callout-text">
            {copy.managePortal.security.desc}
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
