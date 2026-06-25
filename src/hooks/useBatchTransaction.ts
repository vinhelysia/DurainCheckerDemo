import { useState } from 'react'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import {
  getConfigPda,
  getBatchPda,
  getTimelinePda,
  getLabPda,
  getFarmerPda,
  getLabRolePda,
  getLogisticsPda,
} from '../lib/pda'
import type { DurianTrustProgram } from '../types'

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

interface RuleAudit {
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
    if (!batchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng nhập Mã Lô hàng!' : 'Please enter Batch ID!',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })
    setNewlyRegisteredBatchId('')

    const cadmiumValueScaled = Math.round(parseFloat(String(cadmiumPpm)) * 10000)
    const thresholdValueScaled = 500
    const confidenceScaled = Math.round(ruleAudit.confidence * 100)
    const riskLevelEnum = ruleAudit.riskLevel === 'low' ? 0 : ruleAudit.riskLevel === 'medium' ? 1 : 2

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)
        const batchPda = getBatchPda(batchId, program.programId)
        const firstLabReportPda = getLabPda(batchId, 0, program.programId)
        const farmerRolePda = getFarmerPda(wallet.publicKey, program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch lên Blockchain...' : 'Broadcasting transaction to blockchain...',
          type: 'info',
        })

        // Timeline index is always 0 for a newly registered batch (no prior events exist)
        const timelineEventPda = getTimelinePda(batchId, 0, program.programId)
        const logisticsRolePda = getLogisticsPda(wallet.publicKey, program.programId)
        const date = harvestDate || new Date().toISOString().split('T')[0]

        const registerIx = await program.methods.registerBatch(
          batchId,
          farmVi,
          provinceVi,
          date,
          new BN(cadmiumValueScaled),
          new BN(thresholdValueScaled),
          new BN(confidenceScaled),
          riskLevelEnum,
          ruleAudit.aiResultVi,
          ruleAudit.riskCauseVi
        ).accounts({
          config: configPda,
          batch: batchPda,
          labReport: firstLabReportPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          farmerRole: activeRoles.isOwner ? null : farmerRolePda,
        }).instruction()

        const harvestTimelineIx = await program.methods.addTimelineEvent(
          batchId,
          'Thu hoạch',
          `${farmVi}, ${provinceVi}`,
          date,
          1
        ).accounts({
          batch: batchPda,
          timelineEvent: timelineEventPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          logisticsRole: activeRoles.isOwner ? null : logisticsRolePda,
        }).instruction()

        const tx = new Transaction().add(registerIx, harvestTimelineIx)
        const txSig = await program.provider.sendAndConfirm(tx)

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
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${msg.slice(0, 120)}` : `Blockchain Error: ${msg.slice(0, 120)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await new Promise(r => setTimeout(r, 600))

        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')

        if (localBatches.some((b: { id: string }) => b.id === batchId) || ['DRN-2026-LD-0428', 'DRN-2026-TG-0115', 'DRN-2026-DL-0892'].includes(batchId)) {
          throw new Error('Batch already exists')
        }

        const newBatch = {
          id: batchId,
          farm: { vi: farmVi, en: farmEn },
          province: { vi: provinceVi, en: provinceEn },
          harvestDate: harvestDate || new Date().toISOString().split('T')[0],
          cadmiumPpm: parseFloat(String(cadmiumPpm)),
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
              status: 'complete',
            },
          ],
          blockchainHash: 'simulated, not on-chain',
          labReports: [
            {
              cadmiumPpm: parseFloat(String(cadmiumPpm)),
              thresholdPpm: 0.05,
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
        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

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
    if (!selectedBatchId) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng chọn Lô sầu riêng!' : 'Please select a Batch ID!',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })

    const cadmiumValueScaled = Math.round(parseFloat(String(cadmiumPpmLab)) * 10000)
    const thresholdValueScaled = Math.round(parseFloat(String(thresholdPpmLab)) * 10000)
    const confidenceScaled = Math.round(audit.confidence * 100)
    const riskLevelEnum = audit.riskLevel === 'low' ? 0 : audit.riskLevel === 'medium' ? 1 : 2

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const batchPda = getBatchPda(selectedBatchId, program.programId)
        const batchAccount = await program.account.batch.fetch(batchPda)
        const currentLabCount = batchAccount.labCount
        const currentTimelineCount = batchAccount.timelineCount

        const labReportPda = getLabPda(selectedBatchId, currentLabCount, program.programId)
        const timelineEventPda = getTimelinePda(selectedBatchId, currentTimelineCount, program.programId)
        const labRolePda = getLabRolePda(wallet.publicKey, program.programId)
        const logisticsRolePda = getLogisticsPda(wallet.publicKey, program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi báo cáo kiểm định chất lượng lên Blockchain...' : 'Sending lab report update transaction to blockchain...',
          type: 'info',
        })

        const updateIx = await program.methods.updateLabReport(
          selectedBatchId,
          new BN(cadmiumValueScaled),
          new BN(thresholdValueScaled),
          new BN(confidenceScaled),
          riskLevelEnum,
          audit.aiResultVi,
          audit.riskCauseVi
        ).accounts({
          batch: batchPda,
          labReport: labReportPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          labRole: activeRoles.isOwner ? null : labRolePda,
        }).instruction()

        const labTimelineIx = await program.methods.addTimelineEvent(
          selectedBatchId,
          'Kiểm nghiệm cập nhật',
          'Phòng phân tích độc học',
          new Date().toISOString().split('T')[0],
          1
        ).accounts({
          batch: batchPda,
          timelineEvent: timelineEventPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          logisticsRole: activeRoles.isOwner ? null : logisticsRolePda,
        }).instruction()

        const tx = new Transaction().add(updateIx, labTimelineIx)
        const txSig = await program.provider.sendAndConfirm(tx)

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
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${msg.slice(0, 120)}` : `Blockchain Error: ${msg.slice(0, 120)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await new Promise(r => setTimeout(r, 600))

        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
        const index = localBatches.findIndex((b: { id: string }) => b.id === selectedBatchId)
        if (index === -1) throw new Error('Batch not found')

        const newReport = {
          cadmiumPpm: parseFloat(String(cadmiumPpmLab)),
          thresholdPpm: parseFloat(String(thresholdPpmLab)),
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

        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

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

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const batchPda = getBatchPda(selectedBatchId, program.programId)
        const batchAccount = await program.account.batch.fetch(batchPda)
        const currentCount = batchAccount.timelineCount

        const timelineEventPda = getTimelinePda(selectedBatchId, currentCount, program.programId)
        const logisticsRolePda = getLogisticsPda(wallet.publicKey, program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi sự kiện lên Blockchain...' : 'Sending timeline event to blockchain...',
          type: 'info',
        })

        const txSig = await program.methods.addTimelineEvent(
          selectedBatchId,
          stageVi,
          locationVi,
          eventDate || new Date().toISOString().split('T')[0],
          Number(eventStatus)
        ).accounts({
          batch: batchPda,
          timelineEvent: timelineEventPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          logisticsRole: activeRoles.isOwner ? null : logisticsRolePda,
        }).rpc()

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
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi Blockchain: ${msg.slice(0, 120)}` : `Blockchain Error: ${msg.slice(0, 120)}`,
          type: 'error',
        })
        return false
      } finally {
        setLoading(false)
      }
    } else {
      try {
        const localBatches = JSON.parse(localStorage.getItem('duriantrust_local_batches') || '[]')
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

        localStorage.setItem('duriantrust_local_batches', JSON.stringify(localBatches))

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
    if (!targetAddress || !targetAddress.startsWith('0x') || targetAddress.length !== 42) {
      setTxMessage({
        text: language === 'vi' ? 'Vui lòng điền đúng định dạng địa chỉ ví (0x...)' : 'Please enter a valid wallet address starting with 0x!',
        type: 'error',
      })
      return false
    }

    setLoading(true)
    setTxMessage({ text: '', type: '' })

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)
        const targetPubkey = new PublicKey(targetAddress)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch phân quyền lên Blockchain...' : 'Sending role transaction to blockchain...',
          type: 'info',
        })

        let txSig: string | undefined
        if (actionType === 'assign') {
          if (targetRole === 'farmer') {
            const farmerRolePda = getFarmerPda(targetPubkey, program.programId)
            txSig = await program.methods.addFarmer(targetPubkey).accounts({
              config: configPda,
              farmerRole: farmerRolePda,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            }).rpc()
          } else if (targetRole === 'lab') {
            const labRolePda = getLabRolePda(targetPubkey, program.programId)
            txSig = await program.methods.addLab(targetPubkey).accounts({
              config: configPda,
              labRole: labRolePda,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            }).rpc()
          } else if (targetRole === 'logistics') {
            const logisticsRolePda = getLogisticsPda(targetPubkey, program.programId)
            txSig = await program.methods.addLogistics(targetPubkey).accounts({
              config: configPda,
              logisticsRole: logisticsRolePda,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            }).rpc()
          }
        } else {
          if (targetRole === 'farmer') {
            const farmerRolePda = getFarmerPda(targetPubkey, program.programId)
            txSig = await program.methods.removeFarmer(targetPubkey).accounts({
              config: configPda,
              farmerRole: farmerRolePda,
              authority: wallet.publicKey,
            }).rpc()
          } else if (targetRole === 'lab') {
            const labRolePda = getLabRolePda(targetPubkey, program.programId)
            txSig = await program.methods.removeLab(targetPubkey).accounts({
              config: configPda,
              labRole: labRolePda,
              authority: wallet.publicKey,
            }).rpc()
          } else if (targetRole === 'logistics') {
            const logisticsRolePda = getLogisticsPda(targetPubkey, program.programId)
            txSig = await program.methods.removeLogistics(targetPubkey).accounts({
              config: configPda,
              logisticsRole: logisticsRolePda,
              authority: wallet.publicKey,
            }).rpc()
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
        const msg = err instanceof Error ? err.message : String(err)
        setTxMessage({
          text: language === 'vi' ? `Lỗi: ${msg.slice(0, 120)}` : `Error: ${msg.slice(0, 120)}`,
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

    if (providerMode === 'chain' && program && wallet.publicKey) {
      try {
        const configPda = getConfigPda(program.programId)

        setTxMessage({
          text: language === 'vi' ? 'Đang gửi giao dịch khởi tạo...' : 'Sending initialization transaction...',
          type: 'info',
        })

        const txSig = await program.methods.initialize().accounts({
          config: configPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc()

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
            text: language === 'vi' ? `Lỗi khởi tạo: ${errMsg.slice(0, 120)}` : `Initialization Error: ${errMsg.slice(0, 120)}`,
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

  return {
    loading,
    txMessage,
    setTxMessage,
    newlyRegisteredBatchId,
    setNewlyRegisteredBatchId,
    registerBatch,
    updateLabReport,
    addTimelineEvent,
    handleRoleAction,
    handleInitializeProgram,
  }
}
