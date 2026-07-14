# DurianTrust — roadmap sau hackathon

Tài liệu vận hành / sản phẩm. **Không** thay README judge quickstart.

## Trạng thái hiện tại

| Mức | Trạng thái |
|-----|------------|
| MVP demo UniHackfest | Đủ để thi (devnet, QR, custody, lab, dual mode, deck VI) |
| GitHub `main` | Đã push protocol fix + pitch (2026-07-14) |
| Pilot HTX / gasless | Chưa code — thiết kế bên dưới |
| Indexer DB / mainnet / LIMS | Hoãn cho đến khi có đối tác |

## Thứ tự ưu tiên

```
0  Pre-demo: git + rehearsal + backup ảnh     ✅ / ops
1  Vercel API smoke (leaf + predict)           optional
2  HTX ký thay nông hộ + (sau) fee-payer       1–3 tuần sau thi
3  Indexer read-only khi RPC/search đau        khi cần
4  Mainnet + pháp lý + LIMS/gov                theo MoU
```

## Phase 2 — Nông dân không đụng ví

**Quy tắc:** role on-chain (`farmer` / `lab` / `logistics`) giữ nguyên. Ví ký = HTX / lab. Nông hộ chỉ form + mã lô + QR.

```
Nông hộ (form/SMS) → HTX console (#/manage + Phantom)
                          → register_batch / lab (signer = ví HTX có role)
                          → Solana
```

1. **Level A (pilot tối thiểu):** staff HTX đăng nhập portal, điền hộ, ký Phantom, trả phí gas.  
2. **Level B:** server chỉ giữ **fee-payer**; ví role vẫn ký instruction.  
3. **Level C (sau):** meta-tx / ed25519 user payload — không làm sớm.

Program **không** cần rewrite nếu HTX đã được `addFarmer`.

## Phase 3 — Indexer (khi cần)

Chain = nguồn sự thật. DB = cache đọc: `batches`, `lab_reports`, `timeline_events`, `custody_records`, `indexer_cursor`.  
Không ghi “truth” chỉ vào DB.

## Phase 4 — Mainnet / pháp lý / LIMS

Checklist (không code):

- Deploy mainnet + upgrade authority / multisig + pause runbook  
- Entity pháp lý, disclaimer AI ≠ phiếu lab, ngưỡng 0,05 ppm là hằng số sản phẩm  
- Map LIMS → `updateLabReport`; PDF off-chain; lab role ký  
- Hải quan: portal QR read-only (đã có hướng)

## Việc không làm trước pitch

- Redeploy program “cho chắc”  
- Viết DB / gasless full stack  
- Claim đã triển khai toàn quốc  

## Liên quan

- Pitch: `DurianTrust_Pitch_Deck.pptx`, `PRESENTATION_HANDOFF_VI.md`  
- Smoke: `npm run smoke:farmer`, `npm run smoke:lab`  
- Program ID (devnet): `4EZcqRn9LYK5VMuhLC2bNDaUqVBHxc6KCZ6zhFet3Par`
