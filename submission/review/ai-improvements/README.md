# Local AI UI QA

Kết quả cuối: **PASS** trong `checks.json` và `lifecycle-checks.json`, không có app exception hoặc upload/cloud write.

## Chạy lại

Trong PowerShell, tại `C:/Stuff/DurianBlockchainWeb3/durian-web3`:

```powershell
& 'C:/Users/Vinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' submission/review/ai-improvements/check-ai-improvements.mjs
& 'C:/Users/Vinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' submission/review/ai-improvements/check-ai-improvements.mjs --document-lifecycle
```

Script tự mở Vite local ở port 5178, headless Chromium và đóng cả hai khi hoàn tất. Cần runtime Node/Playwright, Python/ReportLab và Chromium theo đường dẫn trong script. Startup local có thể mất khoảng 90 giây.

Lệnh `--document-lifecycle` dùng và bổ sung `checks.json` từ full run đã có; hãy chạy lệnh đầu trước. Full run trả exit khác 0 nếu actual OCR không chạy được, dù manual fallback vẫn đúng.

## Phạm vi đã kiểm tra

- UI VI/EN, desktop 1440 và mobile 390; không horizontal overflow trong ảnh component.
- Leaf responses là fixture: score 97% vẫn yêu cầu manual review, điểm chưa hiệu chuẩn, blank image chưa đủ tin cậy. Notes reset khi đổi ảnh; không gửi trong request hoặc lưu vào browser storage. Loading/error/giới hạn 5 MB có xử lý.
- OCR ảnh và PDF text extraction chạy **thật**. Tài liệu Việt trả đúng `HTX Kiểm thử QA`, `2026-09-27`; ảnh English trả đúng `QA English Lab`, `2026-09-27`.
- Đọc tài liệu không tự điền form. Apply cần checkbox xác nhận, chỉ điền source/date, giữ metadata sau resize 1440/390, không upload. Form trợ lý chỉ xuất hiện trong workspace owner fixture; public/sample không có.
- Ngày mơ hồ không được đoán; PDF scan chuyển sang nhập thủ công. Tệp HTML, empty, corrupt và trên 5 MB bị từ chối; metadata vẫn nhập tay được.
- Targeted lifecycle giữ model GET để kiểm tra đổi/xóa tệp giữa lúc đọc. Kết quả cũ không ghi đè replacement PDF, abandoned worker kết thúc và reset form xóa tệp/kết quả/metadata.

## Dữ liệu và network

Mọi ảnh/PDF trong `fixtures/` là dữ liệu QA tự tạo, có nhãn test; không phải phiếu lab hoặc mẫu lá thật. Auth/cloud dùng fixture local, mọi thao tác ghi bị chặn. Chỉ cho phép GET hai OCR model từ URL CDN có Git commit cố định; cả hai trả 200. Network khác, gồm Solana RPC và fonts, bị chặn.

Các kiểm tra này xác nhận workflow UI và OCR trên fixture; không đo độ chính xác bệnh lá, OCR thực địa hoặc kiểm soát quyền backend. Ảnh component có thể ẩn Header cố định để tránh overlay do cách chụp phần tử dài.
