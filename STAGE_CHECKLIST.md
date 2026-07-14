# Checklist sân khấu (5 phút + backup)

## Production URL

- **App + API:** https://durian-web3.vercel.app  
- (URL cũ `durain-checker-demo.vercel.app` = **404** — đừng dùng)

### API smoke đã verify (2026-07-14)

| Endpoint | Kết quả |
|----------|---------|
| `POST /api/predict_leaf` | 200 — healthy / leaf_blight samples (~0.7–1.4s) |
| `POST /api/predict` | 200 — Cadmium risk (UTF-8 body) |
| `POST /api/predict_disease` | 200 |
| CORS `ALLOWED_ORIGIN` | `https://durian-web3.vercel.app` |

Lần gọi leaf đầu có thể chậm hơn (cold start) — click sample **trước** khi lên sân để warm.

## Trước khi lên sân

- [ ] Mở **https://durian-web3.vercel.app** (hoặc `npm run dev`)
- [ ] `#/unit/demo` → lô **DRN-2026-LD-0429**
- [ ] Huy hiệu **Live on Solana Devnet** (không phải chỉ Demo data)
- [ ] Warm leaf: bấm 1 sample thumbnail trên dossier
- [ ] Phantom = **Devnet** nếu demo Accept custody / lab
- [ ] Slide: `DurianTrust_Pitch_Deck.pptx` + PDF export trên USB
- [ ] Hotspot điện thoại sẵn
- [ ] Ảnh chụp / video 20–30s của dossier lô flagship (timeline + custody + lab)

## Kịch bản click (không ví)

1. Landing → Scan demo batch  
2. `DRN-2026-LD-0429`  
3. Timeline + Cadimi 0,05 ppm  
4. Custody + Explorer  
5. (Tuỳ chọn) leaf sample — nếu API chậm thì bỏ qua, nói “AI hỗ trợ, lab là chuẩn”

## Nếu vỡ

| Sự cố | Xử lý |
|-------|--------|
| RPC / Live badge mất | Mở ảnh backup; nói dual mode có chủ đích |
| Phantom kẹt | Bỏ phần ghi; giữ QR verify |
| Leaf API timeout | Skip AI; nhấn lab + custody |

## Sau sự kiện

- Không redeploy trừ khi có bug chặn demo  
- Xem `ROADMAP_POST_CONTEST.md` cho HTX / Vercel / mainnet  
