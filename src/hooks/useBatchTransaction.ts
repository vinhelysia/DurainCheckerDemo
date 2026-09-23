import { useState } from 'react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import {
  getConfigPda,
  getBatchPda,
  getTimelinePda,
  getLabPda,
  getCustodyPda,
  getFarmerPda,
  getLabRolePda,
  getLogisticsPda,
} from '../lib/pda'
import { readLocalBatches, writeLocalBatches, STATIC_BATCH_IDS } from '../lib/localLedger'
import { DEFAULT_CADMIUM_THRESHOLD_PPM, runRuleAuditor } from '../lib/ruleAuditor'
import { toPpmScaled } from '../lib/units'
import type { AnchorRiskLevel, AnchorTimelineStatus, DurianTrustProgram, UIBatch } from '../types/durian_trust'

type Language = 'vi' | 'en'
type ProviderMode = 'chain' | 'fallback'
type RoleType = 'farmer' | 'lab' | 'logistics'
type RoleAction = 'assign' | 'revoke'

interface WalletAdapter {
  publicKey: PublicKey | null
}

interface ActiveRoles {
  isOwner: boolean
  [key: string]: boolean
}

interface TxMessage {
  text: string
  type: 'success' | 'error' | 'info' | ''
  txSig?: string
}

type TxStage = 'idle' | 'sending' | 'confirming' | 'confirmed' | 'error'

// Anchor encodes a Rust enum variant as a single-key object. Index matches the
// program's CustodyRole discriminants.
const CUSTODY_ROLE_VARIANTS = [
  { farmer: {} },
  { packer: {} },
  { exporter: {} },
  { importer: {} },
  { customs: {} },
]

// Anchor Rust enums → `{ variantName: {} }`. Raw numbers fail instruction encoding.
const riskEnum = (r: 'low' | 'medium' | 'high'): AnchorRiskLevel => ({ [r]: {} }) as AnchorRiskLevel

// Completed harvest/lab milestones are Delivered; UI "pending" maps to Pending.
// Shipping/export legs from logistics should pass inTransit via eventStatus when needed.
const timelineStatusEnum = (s: number | string): AnchorTimelineStatus =>
  Number(s) === 1 ? { delivered: {} } : { pending: {} }

const TIMELINE_DELIVERED: AnchorTimelineStatus = { delivered: {} }

// Wraps a send/confirm call with a cosmetic staged status (sending -> confirming -> confirmed/error).
// Does not alter what is sent, signed, or awaited - purely a UI-timing layer around the same call.
async function trackStagedTx<T>(
  setStage: (stage: TxStage) => void,
  task: () => Promise<T>,
  confirmingDelay = 600
): Promise<T> {
  setStage('sending')
  const timer = setTimeout(() => setStage('confirming'), confirmingDelay)
  try {
    const result = await task()
    setStage('confirmed')
    return result
  } finally {
    clearTimeout(timer)
  }
}

function humanizeTxError(rawMessage: string, language: Language): string {
  const msg = rawMessage.toLowerCase()
  if (msg.includes('user rejected') || msg.includes('rejected the request')) {
    return language === 'vi'
      ? 'Bạn đã từ chối ký giao dịch trong ví.'
      : 'You rejected the signature request in your wallet.'
  }
  if (msg.includes('insufficient') || msg.includes('no record of a prior credit')) {
    return language === 'vi'
      ? 'Ví không đủ SOL trên Devnet. Lấy SOL miễn phí tại faucet.solana.com.'
      : 'Wallet has insufficient devnet SOL. Get free SOL at faucet.solana.com.'
  }
  if (msg.includes('blockhash not found') || msg.includes('block height exceeded')) {
    return language === 'vi'
      ? 'Giao dịch hết hạn, vui lòng thử lại.'
      : 'Transaction expired. Please try again.'
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return language === 'vi'
      ? 'Không thể kết nối đến Solana Devnet. Kiểm tra kết nối mạng và thử lại.'
      : 'Could not reach Solana devnet. Check your connection and try again.'
  }
  return rawMessage.slice(0, 120)
}

interface RuleAudit {
  valid: boolean
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  aiResultVi: string
  aiResultEn: string
  riskCauseVi: string
  riskCauseEn: string
}

interface UseBatchTransactionParams {
  program: DurianTrustProgram | null
  wallet: WalletAdapter
  providerMode: ProviderMode
  language: Language
  account: string
  activeRoles: ActiveRoles
  setReloadTrigger: React.Dispatch<React.SetStateAction<number>>
}

export function useBatchTransaction({
  program,
  wallet,
  providerMode,
  language,
  account,
  activeRoles,
  setReloadTrigger,
}: UseBatchTransactionParams) {
  const [loading, setLoading] = useState(false)
  const [txMessage, setTxMessage] = useState<TxMessage>({ text: '', type: '' })
  const [txStage, setTxStage] = useState<TxStage>('idle')
  const [newlyRegisteredBatchId, setNewlyRegisteredBatchId] = useState('')

  const registerBatch = async (
    batchId: string,
    farmVi: string,
    farmEn: string,
    provinceVi: string,
    provinceEn: string,
    harvestDate: string,
    cadmiumPpm: string | number,
    ruleAudit: RuleAudit
  ): Promise<boolean> => {
    ruleAudit = runRuleAuditor(cadmiumPpm)
    if (!ruleAudit.valid) {
      setTxMessage({ text: language === 'vi' ? ruleAudit.riskCauseVi : ruleAudit.riskCauseEn, type: 'error' })
      return false
    }

    if (!batchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng nhập Mã Lô hàng!' : 'Please enter Batch ID!',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')
    setNewlyRegisteredBatchId('')

    const cadmiumValueScaled = toPpmScaled(cadmiumPpm)
    const thresholdValueScaled = toPpmScaled(DEFAULT_CADMIUM_THRESHOLD_PPM)
    const confidenceScaled = Math.round(ruleAudit.confidence * 100)
    const riskLevel = riskEnum(ruleAudit.riskLevel)

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)
        const batchPda = getBatchPda(batchId, program.programId)
        const firstLabReportPda = getLabPda(batchId, 0, program.programId)
        const farmerRolePda = getFarmerPda(wallet.publicKey, program.programId)
        const date = harvestDate || new Date().toISOString().split('T')[0]

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch lên Blockchain...' : 'Broadcasting transaction to blockchain...',
          type: 'info',
        })

        // Primary write alone — never bundle with add_timeline_event (logistics-gated).
        const txSig = await trackStagedTx(setTxStage, () => program.methods.registerBatch(
          batchId,
          farmVi,
          provinceVi,
          date,
          new BN(cadmiumValueScaled),
          new BN(thresholdValueScaled),
          new BN(confidenceScaled),
          riskLevel,
          ruleAudit.aiResultVi,
          ruleAudit.riskCauseVi
        ).accounts({
          config: configPda,
          batch: batchPda,
          labReport: firstLabReportPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          farmerRole: activeRoles.isOwner ? null : farmerRolePda,
        }).rpc())

        // Best-effort harvest timeline only when signer can pass the logistics gate.
        if (activeRoles.isOwner || activeRoles.isLogistics) {
          try {
            const timelineEventPda = getTimelinePda(batchId, 0, program.programId)
            const logisticsRolePda = getLogisticsPda(wallet.publicKey, program.programId)
            await program.methods.addTimelineEvent(
              batchId,
              'Thu hoạch',
              `${farmVi}, ${provinceVi}`,
              date,
              TIMELINE_DELIVERED
            ).accounts({
              config: configPda,
              batch: batchPda,
              timelineEvent: timelineEventPda,
              signer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
              logisticsRole: activeRoles.isOwner ? null : logisticsRolePda,
            }).rpc()
          } catch (e) {
            console.warn('Harvest timeline follow-up failed (batch still registered):', e)
          }
        }

        setTxMessage({
          text: language === 'vi'
            ? `Đăng ký thành công! Lô hàng đã ghi vào Blockchain. Mã Tx: ${txSig.slice(0, 16)}...`
            : `Success! Batch registered in Blockchain. Tx Signature: ${txSig.slice(0, 16)}...`,
          type: 'success',
          txSig,
        })

        setNewlyRegisteredBatchId(batchId)
        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        console.error(err)
        setTxStage('error')
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${humanizeTxError(msg, language)}` : `Blockchain Error: ${humanizeTxError(msg, language)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await new Promise(r => setTimeout(r, 600))

        const localBatches = readLocalBatches()

        if (localBatches.some((b: { id: string }) => b.id === batchId) || STATIC_BATCH_IDS.includes(batchId)) {
          throw new Error('Batch already exists')
        }

        const newBatch: UIBatch = {
          tokenId: 0,
          id: batchId,
          farm: { vi: farmVi, en: farmEn },
          province: { vi: provinceVi, en: provinceEn },
          harvestDate: harvestDate || new Date().toISOString().split('T')[0],
          cadmiumPpm: Number(cadmiumPpm),
          thresholdPpm: DEFAULT_CADMIUM_THRESHOLD_PPM,
          aiResult: { vi: ruleAudit.aiResultVi, en: ruleAudit.aiResultEn },
          confidence: ruleAudit.confidence / 100,
          riskLevel: ruleAudit.riskLevel,
          riskCause: { vi: ruleAudit.riskCauseVi, en: ruleAudit.riskCauseEn },
          timeline: [
            {
              stage: { vi: 'Thu hoạch', en: 'Harvest' },
              location: { vi: `${farmVi}, ${provinceVi}`, en: `${farmEn}, ${provinceEn}` },
              date: harvestDate || new Date().toISOString().split('T')[0],
              status: 'complete',
            },
          ],
          blockchainHash: 'simulated, not on-chain',
          labReports: [
            {
              cadmiumPpm: Number(cadmiumPpm),
              thresholdPpm: DEFAULT_CADMIUM_THRESHOLD_PPM,
              aiResult: { vi: ruleAudit.aiResultVi, en: ruleAudit.aiResultEn },
              confidence: ruleAudit.confidence / 100,
              riskLevel: ruleAudit.riskLevel,
              riskCause: { vi: ruleAudit.riskCauseVi, en: ruleAudit.riskCauseEn },
              timestamp: Math.floor(Date.now() / 1000),
              reporter: account,
            },
          ],
        }

        localBatches.push(newBatch)
        writeLocalBatches(localBatches)

        setTxMessage({
          text: language === 'vi'
            ? 'Đăng ký thành công! Đã ghi nhận vào Sổ cái giả lập (LocalStorage).'
            : 'Success! Registered batch in Simulated Local Ledger.',
          type: 'success',
        })

        setNewlyRegisteredBatchId(batchId)
        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${msg}` : `Error: ${msg}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    }
  }

  const updateLabReport = async (
    selectedBatchId: string,
    cadmiumPpmLab: string | number,
    thresholdPpmLab: string | number,
    audit: RuleAudit
  ): Promise<boolean> => {
    audit = runRuleAuditor(cadmiumPpmLab, thresholdPpmLab)
    if (!audit.valid) {
      setTxMessage({ text: language === 'vi' ? audit.riskCauseVi : audit.riskCauseEn, type: 'error' })
      return false
    }

    if (!selectedBatchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng chọn Lô sầu riêng!' : 'Please select a Batch ID!',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')

    const cadmiumValueScaled = toPpmScaled(cadmiumPpmLab)
    const thresholdValueScaled = toPpmScaled(thresholdPpmLab)
    const confidenceScaled = Math.round(audit.confidence * 100)
    const riskLevel = riskEnum(audit.riskLevel)

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)
        const batchPda = getBatchPda(selectedBatchId, program.programId)
        const batchAccount = await program.account.batch.fetch(batchPda)
        const currentLabCount = batchAccount.labCount

        const labReportPda = getLabPda(selectedBatchId, currentLabCount, program.programId)
        const labRolePda = getLabRolePda(wallet.publicKey, program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi báo cáo kiểm định chất lượng lên Blockchain...' : 'Sending lab report update transaction to blockchain...',
          type: 'info',
        })

        // Primary write alone — never bundle with add_timeline_event (logistics-gated).
        // `config` is required by UpdateLabReport (pause/authority gate) — omitting it
        // fails Anchor account resolution before Phantom signs.
        const txSig = await trackStagedTx(setTxStage, () => program.methods.updateLabReport(
          selectedBatchId,
          new BN(cadmiumValueScaled),
          new BN(thresholdValueScaled),
          new BN(confidenceScaled),
          riskLevel,
          audit.aiResultVi,
          audit.riskCauseVi
        ).accounts({
          config: configPda,
          batch: batchPda,
          labReport: labReportPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          labRole: activeRoles.isOwner ? null : labRolePda,
        }).rpc())

        // Best-effort lab timeline only when signer can pass the logistics gate.
        // Re-read timelineCount after the primary tx — it may have advanced on-chain.
        if (activeRoles.isOwner || activeRoles.isLogistics) {
          try {
            const freshBatch = await program.account.batch.fetch(batchPda)
            const timelineEventPda = getTimelinePda(selectedBatchId, freshBatch.timelineCount, program.programId)
            const logisticsRolePda = getLogisticsPda(wallet.publicKey, program.programId)
            await program.methods.addTimelineEvent(
              selectedBatchId,
              'Kiểm nghiệm cập nhật',
              'Phòng phân tích độc học',
              new Date().toISOString().split('T')[0],
              TIMELINE_DELIVERED
            ).accounts({
              config: configPda,
              batch: batchPda,
              timelineEvent: timelineEventPda,
              signer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
              logisticsRole: activeRoles.isOwner ? null : logisticsRolePda,
            }).rpc()
          } catch (e) {
            console.warn('Lab timeline follow-up failed (lab report still saved):', e)
          }
        }

        setTxMessage({
          text: language === 'vi'
            ? `Thành công! Đã cập nhật kết quả kiểm định mới cho lô ${selectedBatchId} trên Blockchain. Mã Tx: ${txSig.slice(0, 16)}...`
            : `Success! Appended new laboratory chemical audit for batch ${selectedBatchId} on-chain. Tx Signature: ${txSig.slice(0, 16)}...`,
          type: 'success',
          txSig,
        })

        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        console.error(err)
        setTxStage('error')
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${humanizeTxError(msg, language)}` : `Blockchain Error: ${humanizeTxError(msg, language)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await new Promise(r => setTimeout(r, 600))

        const localBatches = readLocalBatches()
        const index = localBatches.findIndex((b: { id: string }) => b.id === selectedBatchId)
        if (index === -1) throw new Error('Batch not found')

        const newReport = {
          cadmiumPpm: Number(cadmiumPpmLab),
          thresholdPpm: Number(thresholdPpmLab),
          aiResult: { vi: audit.aiResultVi, en: audit.aiResultEn },
          confidence: audit.confidence / 100,
          riskLevel: audit.riskLevel,
          riskCause: { vi: audit.riskCauseVi, en: audit.riskCauseEn },
          timestamp: Math.floor(Date.now() / 1000),
          reporter: account,
        }

        if (!localBatches[index].labReports) {
          localBatches[index].labReports = []
        }
        localBatches[index].labReports.push(newReport)
        localBatches[index].cadmiumPpm = newReport.cadmiumPpm
        localBatches[index].confidence = newReport.confidence
        localBatches[index].riskLevel = newReport.riskLevel
        localBatches[index].aiResult = newReport.aiResult
        localBatches[index].riskCause = newReport.riskCause

        localBatches[index].timeline.push({
          stage: { vi: 'Kiểm nghiệm cập nhật', en: 'Testing updated' },
          location: { vi: 'Phòng phân tích độc học', en: 'Toxicology analysis lab' },
          date: new Date().toISOString().split('T')[0],
          status: 'complete',
        })

        writeLocalBatches(localBatches)

        setTxMessage({
          text: language === 'vi'
            ? `Thành công! Đã ghi nhận báo cáo phân tích mới vào Sổ cái giả lập cho lô ${selectedBatchId}.`
            : `Success! Appended new lab audit to Simulated Local Ledger for batch ${selectedBatchId}.`,
          type: 'success',
        })

        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${msg}` : `Error: ${msg}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    }
  }

  const addTimelineEvent = async (
    selectedBatchId: string,
    stageVi: string,
    stageEn: string,
    locationVi: string,
    locationEn: string,
    eventDate: string,
    eventStatus: number | string
  ): Promise<boolean> => {
    if (!selectedBatchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng chọn Lô sầu riêng!' : 'Please select a Batch ID!',
        type: 'error',
      })
      return false
    }
    if (!locationVi) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng nhập địa điểm!' : 'Please enter location!',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)
        const batchPda = getBatchPda(selectedBatchId, program.programId)
        const batchAccount = await program.account.batch.fetch(batchPda)
        const currentCount = batchAccount.timelineCount

        const timelineEventPda = getTimelinePda(selectedBatchId, currentCount, program.programId)
        const logisticsRolePda = getLogisticsPda(wallet.publicKey, program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi sự kiện lên Blockchain...' : 'Sending timeline event to blockchain...',
          type: 'info',
        })

        const txSig = await trackStagedTx(setTxStage, () => program.methods.addTimelineEvent(
          selectedBatchId,
          stageVi,
          locationVi,
          eventDate || new Date().toISOString().split('T')[0],
          timelineStatusEnum(eventStatus)
        ).accounts({
          config: configPda,
          batch: batchPda,
          timelineEvent: timelineEventPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          logisticsRole: activeRoles.isOwner ? null : logisticsRolePda,
        }).rpc())

        setTxMessage({
          text: language === 'vi'
            ? `Thành công! Đã thêm chặng [${stageVi}] vào Blockchain. Mã Tx: ${txSig.slice(0, 16)}...`
            : `Success! Added stage [${stageVi}] to Blockchain. Tx Signature: ${txSig.slice(0, 16)}...`,
          type: 'success',
          txSig,
        })

        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        console.error(err)
        setTxStage('error')
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${humanizeTxError(msg, language)}` : `Blockchain Error: ${humanizeTxError(msg, language)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        const localBatches = readLocalBatches()
        const index = localBatches.findIndex((b: { id: string }) => b.id === selectedBatchId)

        if (index === -1) {
          throw new Error('Sự kiện chỉ có thể thêm vào các lô hàng được tạo mới ở Cổng Quản lý (để tránh sửa đổi dữ liệu gốc tĩnh).')
        }

        localBatches[index].timeline.push({
          stage: { vi: stageVi, en: stageEn },
          location: { vi: locationVi, en: locationEn || locationVi },
          date: eventDate || new Date().toISOString().split('T')[0],
          status: Number(eventStatus) === 1 ? 'complete' : 'pending',
        })

        writeLocalBatches(localBatches)

        setTxMessage({
          text: language === 'vi'
            ? `Thành công! Đã thêm chặng [${stageVi}] vào Sổ cái giả lập.`
            : `Success! Added stage [${stageEn}] to Simulated Ledger.`,
          type: 'success',
        })

        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${msg}` : `Error: ${msg}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    }
  }

  const handleRoleAction = async (
    actionType: RoleAction,
    targetAddress: string,
    targetRole: RoleType
  ): Promise<boolean> => {
    // Solana addresses are base58 pubkeys (~32–44 chars), not Ethereum 0x hex.
    let targetPubkey: PublicKey
    try {
      targetPubkey = new PublicKey(targetAddress.trim())
    } catch {
      setTxMessage({
        text: language === 'vi'
          ? 'Vui lòng nhập địa chỉ ví Solana hợp lệ (base58).'
          : 'Please enter a valid Solana wallet address (base58).',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch phân quyền lên Blockchain...' : 'Sending role transaction to blockchain...',
          type: 'info',
        })

        let txSig: string | undefined
        if (actionType === 'assign') {
          if (targetRole === 'farmer') {
            const farmerRolePda = getFarmerPda(targetPubkey, program.programId)
            txSig = await trackStagedTx(setTxStage, () => program.methods.addFarmer(targetPubkey).accounts({
              config: configPda,
              farmerRole: farmerRolePda,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            }).rpc())
          } else if (targetRole === 'lab') {
            const labRolePda = getLabRolePda(targetPubkey, program.programId)
            txSig = await trackStagedTx(setTxStage, () => program.methods.addLab(targetPubkey).accounts({
              config: configPda,
              labRole: labRolePda,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            }).rpc())
          } else if (targetRole === 'logistics') {
            const logisticsRolePda = getLogisticsPda(targetPubkey, program.programId)
            txSig = await trackStagedTx(setTxStage, () => program.methods.addLogistics(targetPubkey).accounts({
              config: configPda,
              logisticsRole: logisticsRolePda,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            }).rpc())
          }
        } else {
          if (targetRole === 'farmer') {
            const farmerRolePda = getFarmerPda(targetPubkey, program.programId)
            txSig = await trackStagedTx(setTxStage, () => program.methods.removeFarmer(targetPubkey).accounts({
              config: configPda,
              farmerRole: farmerRolePda,
              authority: wallet.publicKey,
            }).rpc())
          } else if (targetRole === 'lab') {
            const labRolePda = getLabRolePda(targetPubkey, program.programId)
            txSig = await trackStagedTx(setTxStage, () => program.methods.removeLab(targetPubkey).accounts({
              config: configPda,
              labRole: labRolePda,
              authority: wallet.publicKey,
            }).rpc())
          } else if (targetRole === 'logistics') {
            const logisticsRolePda = getLogisticsPda(targetPubkey, program.programId)
            txSig = await trackStagedTx(setTxStage, () => program.methods.removeLogistics(targetPubkey).accounts({
              config: configPda,
              logisticsRole: logisticsRolePda,
              authority: wallet.publicKey,
            }).rpc())
          }
        }

        setTxMessage({
          text: language === 'vi'
            ? `Thành công! Đã ${actionType === 'assign' ? 'gán' : 'thu hồi'} quyền [${targetRole.toUpperCase()}] cho ví ${targetAddress.slice(0, 10)}... Mã Tx: ${txSig?.slice(0, 16)}...`
            : `Success! Role [${targetRole.toUpperCase()}] ${actionType === 'assign' ? 'assigned to' : 'revoked from'} address ${targetAddress.slice(0, 10)}... Tx Signature: ${txSig?.slice(0, 16)}...`,
          type: 'success',
          txSig,
        })

        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        console.error(err)
        setTxStage('error')
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${humanizeTxError(msg, language)}` : `Error: ${humanizeTxError(msg, language)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await new Promise(r => setTimeout(r, 400))
        setTxMessage({
          text: language === 'vi'
            ? `Thành công (Giả lập)! Đã ${actionType === 'assign' ? 'cấp' : 'thu hồi'} vai trò cho địa chỉ ví này.`
            : `Success (Simulated)! Role ${actionType === 'assign' ? 'assigned' : 'revoked'} for target address.`,
          type: 'success',
        })
        return true
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setTxMessage({ text: msg, type: 'error' })
        return false
      } finally {
        setLoading(false)
      }
    }
  }

  const handleInitializeProgram = async (): Promise<boolean> => {
    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch khởi tạo...' : 'Sending initialization transaction...',
          type: 'info',
        })

        const txSig = await trackStagedTx(setTxStage, () => program.methods.initialize().accounts({
          config: configPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc())

        setTxMessage({
          text: language === 'vi'
            ? `Khởi tạo thành công! Mã giao dịch: ${txSig.slice(0, 16)}...`
            : `Initialization success! Tx Signature: ${txSig.slice(0, 16)}...`,
          type: 'success',
          txSig,
        })

        setReloadTrigger(prev => prev + 1)
        return true
      } catch (err: unknown) {
        console.error(err)
        setTxStage('error')
        const errMsg = err instanceof Error ? err.message : ''
        if (
          errMsg.toLowerCase().includes('already in use') ||
          errMsg.toLowerCase().includes('already initialized') ||
          errMsg.toLowerCase().includes('custom program error: 0x0') ||
          errMsg.toLowerCase().includes('0x0')
        ) {
          setTxMessage({
            text: language === 'vi' ? 'Chương trình đã được khởi tạo trước đó!' : 'Program already initialized!',
            type: 'error',
          })
        } else {
          setTxMessage({
            text: language === 'vi' ? `Lỗi khởi tạo: ${humanizeTxError(errMsg, language)}` : `Initialization Error: ${humanizeTxError(errMsg, language)}`,
            type: 'error',
          })
        }
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await new Promise(r => setTimeout(r, 400))
        setTxMessage({
          text: language === 'vi'
            ? 'Khởi tạo thành công (Giả lập)!'
            : 'Initialization success (Simulated)!',
          type: 'success',
        })
        setReloadTrigger(prev => prev + 1)
        return true
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setTxMessage({ text: msg, type: 'error' })
        return false
      } finally {
        setLoading(false)
      }
    }
  }

  // Custody is chain-only. The localStorage fallback ledger has no notion of an owner,
  // and simulating a transfer of ownership there would fake the one guarantee this
  // feature exists to prove — so in fallback mode we refuse instead of pretending.
  const requireChain = (): boolean => {
    if (providerMode === 'chain' && program && wallet.publicKey) return true
    setTxMessage({
      text: language === 'vi'
        ? 'Chuyển quyền sở hữu cần kết nối Phantom trên Solana Devnet — sổ cái giả lập không thể xác thực chủ sở hữu.'
        : 'Custody transfer requires Phantom on Solana Devnet — the simulated ledger cannot prove ownership.',
      type: 'error',
    })
    return false
  }

  /// Step 1 of the handoff: the current owner nominates the next custody holder.
  /// Ownership does not move until the recipient calls acceptCustody.
  const transferCustody = async (
    selectedBatchId: string,
    newOwner: string
  ): Promise<boolean> => {
    if (!selectedBatchId || !newOwner) {
      setTxMessage({
        text: language === 'vi' ? 'Cần chọn lô và nhập ví người nhận!' : 'Select a batch and enter the recipient wallet!',
        type: 'error',
      })
      return false
    }
    if (!requireChain()) return false

    let recipient: PublicKey
    try {
      recipient = new PublicKey(newOwner)
    } catch {
      setTxMessage({
        text: language === 'vi' ? 'Địa chỉ ví người nhận không hợp lệ.' : 'The recipient wallet address is not valid.',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')

    try {
      const txSig = await trackStagedTx(setTxStage, () => program!.methods.transferCustody(
        selectedBatchId,
        recipient
      ).accounts({
        config: getConfigPda(program!.programId),
        batch: getBatchPda(selectedBatchId, program!.programId),
        signer: wallet.publicKey!,
      }).rpc())

      setTxMessage({
        text: language === 'vi'
          ? `Đã đề nghị chuyển quyền sở hữu tới ${newOwner.slice(0, 8)}… Người nhận phải ký chấp nhận. Mã Tx: ${txSig.slice(0, 16)}...`
          : `Custody handoff proposed to ${newOwner.slice(0, 8)}… The recipient must sign to accept. Tx: ${txSig.slice(0, 16)}...`,
        type: 'success',
        txSig,
      })

      setReloadTrigger(prev => prev + 1)
      return true
    } catch (err: unknown) {
      console.error(err)
      setTxStage('error')
      const msg = err instanceof Error ? err.message : String(err)
      setTxMessage({
        text: language === 'vi' ? `Lỗi Blockchain: ${humanizeTxError(msg, language)}` : `Blockchain Error: ${humanizeTxError(msg, language)}`,
        type: 'error',
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  /// Step 2: the nominated recipient signs, taking ownership and appending a
  /// CustodyRecord. Only the pending owner can do this.
  const acceptCustody = async (
    selectedBatchId: string,
    role: number,
    location: string
  ): Promise<boolean> => {
    if (!selectedBatchId || !location) {
      setTxMessage({
        text: language === 'vi' ? 'Cần chọn lô và nhập địa điểm nhận hàng!' : 'Select a batch and enter the handover location!',
        type: 'error',
      })
      return false
    }
    if (!requireChain()) return false

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setTxStage('idle')

    try {
      const batchPda = getBatchPda(selectedBatchId, program!.programId)
      const batchAccount = await program!.account.batch.fetch(batchPda)

      const txSig = await trackStagedTx(setTxStage, () => program!.methods.acceptCustody(
        selectedBatchId,
        CUSTODY_ROLE_VARIANTS[role] ?? CUSTODY_ROLE_VARIANTS[0],
        location
      ).accounts({
        config: getConfigPda(program!.programId),
        batch: batchPda,
        custodyRecord: getCustodyPda(selectedBatchId, batchAccount.custodyCount, program!.programId),
        signer: wallet.publicKey!,
        systemProgram: SystemProgram.programId,
      }).rpc())

      setTxMessage({
        text: language === 'vi'
          ? `Đã nhận quyền sở hữu lô ${selectedBatchId}. Mã Tx: ${txSig.slice(0, 16)}...`
          : `Custody of ${selectedBatchId} accepted. Tx: ${txSig.slice(0, 16)}...`,
        type: 'success',
        txSig,
      })

      setReloadTrigger(prev => prev + 1)
      return true
    } catch (err: unknown) {
      console.error(err)
      setTxStage('error')
      const msg = err instanceof Error ? err.message : String(err)
      setTxMessage({
        text: language === 'vi' ? `Lỗi Blockchain: ${humanizeTxError(msg, language)}` : `Blockchain Error: ${humanizeTxError(msg, language)}`,
        type: 'error',
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    txMessage,
    setTxMessage,
    txStage,
    newlyRegisteredBatchId,
    setNewlyRegisteredBatchId,
    registerBatch,
    updateLabReport,
    addTimelineEvent,
    transferCustody,
    acceptCustody,
    handleRoleAction,
    handleInitializeProgram,
  }
}
