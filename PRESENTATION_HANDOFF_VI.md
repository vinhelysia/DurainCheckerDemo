# DurianTrust — Handoff thuyết trình (TIẾNG VIỆT)

**Dành cho:** người thuyết trình / slide  
**Giám khảo:** người Việt → **nói và slide bằng tiếng Việt**  
**File slide:** `DurianTrust_Pitch_Deck.pptx` (11 slide, đã Việt hoá)  
**Mạng:** Solana **Devnet** (không phải mainnet)

---

## 1. Pitch 1 câu (nói mở đầu)

> **DurianTrust** gắn bản sao số trên Solana cho từng lô sầu riêng xuất khẩu Việt Nam: thu hoạch → xét nghiệm Cadimi → chuyển giao trách nhiệm 2 chữ ký → quét QR — để hải quan và người mua chứng minh an toàn & quyền nắm lô trong vài giây, không phải vài ngày giấy tờ.

**Câu bắt buộc khi bị hỏi “nông dân có phải chơi crypto không?”:**  
> Nông dân không cần biết Solana. HTX / nhà máy / lab ký bằng hệ thống được cấp quyền. Người mua và cán bộ chỉ quét QR. Blockchain là sổ không sửa được phía sau — không phải app tiền số cho nông hộ.

---

## 2. Kịch bản demo 5–7 phút (nói tiếng Việt)

### Chuẩn bị
1. Mở app (deploy hoặc `npm run dev` → localhost:5173).  
2. Phantom = **Devnet** nếu có phần Accept custody.  
3. Backup: ảnh chụp `#/unit/demo` lô `DRN-2026-LD-0429`.  
4. Ưu tiên huy hiệu xanh **Live on Solana Devnet**.

### 0:00–0:45 — Mở
- Slide 1–2: vấn đề GACC / Cadimi / giấy tờ chậm / trái hỏng cửa khẩu.  
- Bấm **Scan a demo batch** → `#/unit/demo`.

### 0:45–2:30 — Tra cứu không cần ví (quan trọng)
Nói: *“Hải quan hay người mua không cần cài ví.”*

Chỉ lô **`DRN-2026-LD-0429`**:
- Timeline hành trình  
- Lab Cadimi so **0,05 ppm**  
- Chuỗi custody (handoff thật; có thể còn pending accept)  
- Link Solana Explorer  
- (Tuỳ chọn) quét ảnh lá mẫu → AI ONNX  

### 2:30–4:30 — Cổng vận hành (chỉ 1 thao tác ghi)
Mở `#/manage` + Phantom Devnet.

Chọn **một**:
- **A (nên):** nộp / chỉ lab Cadimi + ngưỡng  
- **B:** Accept custody (2 chữ ký)  
- **C:** đăng ký lô mới  

Nói: *“Admin không tịch thu lô. Pause ≠ cướp ownership.”*

### 4:30–5:30 — Kiến trúc 60 giây
Vai trò (được ghi gì) ≠ Custody (ai đang nắm lô).  
Chain = nguồn sự thật. AI chỉ hỗ trợ sớm.

### 5:30–6:30 — Trung thực
- On-chain devnet: thật  
- Custody: thật, không giả offline  
- AI: hỗ trợ, không thay lab  
- Demo Phantom cho nông dân: **chỉ để chứng minh protocol**, pilot thì HTX ký  

### 6:30–7:00 — Kết
Đọc câu kết slide 11.

---

## 3. Q&A ngắn (tiếng Việt)

**Vì sao blockchain, không chỉ database?**  
Nhiều bên xuất khẩu không dùng chung một DB tin cậy. Sổ chỉ ghi thêm + verify công khai + custody cần 2 chữ ký. DB có thể index sau; không nên là bằng chứng duy nhất.

**Nông dân có dùng crypto không?**  
Không. Pilot: HTX/lab giữ khoá; nông hộ form/SMS; người mua quét QR; doanh nghiệp trả phí gas.

**Vì sao Solana?**  
Phí thấp, xác nhận nhanh, Anchor/Phantom phù hợp nhiều sự kiện theo lô.

**Vì sao không NFT?**  
Quyền sở hữu đã enforce trong program. Mint NFT không thêm gì cho bảo đảm custody.

**Admin xấu thì sao?**  
Pause được; không gán lại custody không thuộc mình.

**Mất Wi‑Fi?**  
Vẫn mở demo với huy hiệu Demo data; custody cần chain → dùng ảnh backup.

**0,05 ppm là gì?**  
Ngưỡng cổng an toàn kiểu GACC trong sản phẩm — không thay quy trình pháp lý lab chính thức.

---

## 4. ID cứng (đọc đúng, không bịa)

| Mục | Giá trị |
|-----|---------|
| Program ID | `4EZcqRn9LYK5VMuhLC2bNDaUqVBHxc6KCZ6zhFet3Par` |
| Mạng | Solana Devnet |
| Lô demo | **DRN-2026-LD-0429** |
| Ngưỡng Cadimi | **0,05 ppm** |
| Genesis | `52WpskyDdHaLyAcyTLQrqvLBUh3azKFAe3XmNkYDaFJu` |
| Ví demo | `2BARgkoYQPL7ngMerfCh21CpGRepuZdVtMGr7do1ssko` |
| Route | `#/` · `#/unit/demo` · `#/manage` |

---

## 5. Không được nói

- Đã triển khai toàn quốc / chính phủ đang dùng  
- Mainnet thông quan thật  
- Nông dân bắt buộc cài Phantom  
- AI thay phiếu lab  
- 0,05 ppm = kết luận toà án  
- Fallback giả ownership  

---

## 6. Tin nhắn gửi người thuyết trình (copy)

```
Slide tiếng Việt: DurianTrust_Pitch_Deck.pptx
Script: PRESENTATION_HANDOFF_VI.md

PITCH:
DurianTrust = bản sao số Solana cho lô sầu riêng XK: Cadimi + custody 2 chữ ký + QR — vài giây thay vì vài ngày giấy tờ.

DEMO (không cần ví):
1) Mở app → Scan demo batch
2) Lô: DRN-2026-LD-0429
3) Timeline, lab vs 0,05 ppm, custody, Explorer

CÂU BẮT BUỘC:
Nông dân không cần crypto. HTX/lab ký. Hải quan/người mua chỉ quét QR.

Program: 4EZcqRn9LYK5VMuhLC2bNDaUqVBHxc6KCZ6zhFet3Par (devnet)
```
