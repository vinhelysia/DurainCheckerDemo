import { useState, useEffect } from 'react'
import { ArrowRightLeft, Check } from 'lucide-react'
import { getBatchPda } from '../../lib/pda'

const ROLES = [
  { value: 1, vi: 'Nhà đóng gói', en: 'Packhouse' },
  { value: 2, vi: 'Nhà xuất khẩu', en: 'Exporter' },
  { value: 3, vi: 'Nhà nhập khẩu', en: 'Importer' },
  { value: 4, vi: 'Hải quan', en: 'Customs' },
  { value: 0, vi: 'Nông trại', en: 'Farm' },
]

export default function CustodyPanel({
  language,
  loading,
  registeredIds,
  selectedBatchId,
  setSelectedBatchId,
  transferCustody,
  acceptCustody,
  walletAddress,
  program,
  reloadTrigger,
}) {
  const [recipient, setRecipient] = useState('')
  const [role, setRole] = useState(1)
  const [location, setLocation] = useState('')
  const [batch, setBatch] = useState(null)

  const vi = language === 'vi'

  // Which form to show depends on who currently holds the batch, so read that from
  // chain rather than guessing — offering an "Accept" button to a wallet the program
  // will reject is worse than offering nothing.
  useEffect(() => {
    let alive = true
    if (!program || !selectedBatchId) return
    ;(async () => {
      try {
        const account = await program.account.batch.fetch(
          getBatchPda(selectedBatchId, program.programId)
        )
        if (alive) {
          setBatch({
            id: selectedBatchId,
            owner: account.owner.toString(),
            pendingOwner: account.pendingOwner ? account.pendingOwner.toString() : null,
          })
        }
      } catch {
        // not on chain (simulated ledger), or an unreadable legacy record
        if (alive) setBatch({ id: selectedBatchId, owner: null, pendingOwner: null })
      }
    })()
    return () => { alive = false }
  }, [program, selectedBatchId, reloadTrigger])

  // Tag the fetched record with the id it belongs to, so a batch that is still being
  // fetched never renders the *previous* batch's owner and offers the wrong action.
  const current = batch && batch.id === selectedBatchId && batch.owner ? batch : null
  const isOwner = current && current.owner === walletAddress
  const isPendingRecipient = current && current.pendingOwner === walletAddress

  const onPropose = async (e) => {
    e.preventDefault()
    const ok = await transferCustody(selectedBatchId, recipient.trim())
    if (ok) setRecipient('')
  }

  const onAccept = async (e) => {
    e.preventDefault()
    const ok = await acceptCustody(selectedBatchId, Number(role), location.trim())
    if (ok) setLocation('')
  }

  return (
    <div className="dashboard-card blockchain-logs-card">
      <div className="card-header-with-icon">
        <h2>{vi ? 'Chuyển Quyền Sở Hữu Lô Hàng' : 'Transfer Batch Custody'}</h2>
      </div>

      <div className="form-group">
        <label htmlFor="c-select-batch">{vi ? 'Chọn Lô Sầu Riêng' : 'Select Registered Batch'}</label>
        <select
          id="c-select-batch"
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          required
        >
          <option value="">-- {vi ? 'Chọn lô hàng' : 'Select Batch'} --</option>
          {registeredIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      {isPendingRecipient && (
        <form onSubmit={onAccept} className="manage-form">
          <p className="custody-callout">
            {vi
              ? 'Lô hàng này đang được đề nghị chuyển cho ví của bạn. Ký để nhận quyền sở hữu.'
              : 'This batch has been handed off to your wallet. Sign to take custody.'}
          </p>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="c-role">{vi ? 'Vai trò của bạn' : 'Your role'}</label>
              <select id="c-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{vi ? r.vi : r.en}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="c-location">{vi ? 'Địa điểm nhận hàng' : 'Handover location'}</label>
              <input
                id="c-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={vi ? 'VD: Cảng Cát Lái' : 'e.g. Cat Lai Port'}
                required
              />
            </div>
          </div>

          <button type="submit" className="button button-primary w-full mt-4" disabled={loading}>
            <Check size={16} aria-hidden="true" />
            {vi ? 'Nhận quyền sở hữu' : 'Accept custody'}
          </button>
        </form>
      )}

      {isOwner && (
        <form onSubmit={onPropose} className="manage-form">
          <div className="form-group">
            <label htmlFor="c-recipient">{vi ? 'Ví của bên nhận' : 'Recipient wallet'}</label>
            <input
              id="c-recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={vi ? 'Địa chỉ ví Solana' : 'Solana wallet address'}
              required
            />
            <small className="form-hint">
              {vi
                ? 'Quyền sở hữu chỉ chuyển khi bên nhận ký chấp nhận — không thể đẩy lô hàng cho ví không đồng ý.'
                : 'Ownership only moves once the recipient signs to accept — a batch cannot be pushed onto a wallet that did not consent.'}
            </small>
          </div>

          <button type="submit" className="button button-primary w-full mt-4" disabled={loading}>
            <ArrowRightLeft size={16} aria-hidden="true" />
            {vi ? 'Đề nghị chuyển giao' : 'Propose handoff'}
          </button>
        </form>
      )}

      {current && !isOwner && !isPendingRecipient && (
        <p className="custody-callout custody-callout--muted">
          {vi
            ? 'Ví của bạn không nắm giữ lô hàng này, nên không thể chuyển giao. Chỉ bên đang giữ quyền sở hữu mới chuyển được.'
            : 'Your wallet does not hold this batch, so it cannot be transferred. Only the current holder can move it.'}
        </p>
      )}
    </div>
  )
}
