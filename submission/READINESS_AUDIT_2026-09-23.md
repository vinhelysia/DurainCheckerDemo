# UniHackFest 2026 — readiness audit (23/09/2026)

## Kết luận

DurianTrust đã có demo đọc dữ liệu Solana Devnet, smart contract và pitch deck 11 slide. **Chưa sẵn sàng nộp**: bản production chưa chứa các sửa lỗi diễn giải kiểm định, GitHub repo đang private, chưa có video dự phòng 60–90 giây, và trạng thái đăng ký/được nhận của đội chưa rõ. Không nên trình bày mô hình synthetic, ngưỡng Cadimi minh họa, QR hoặc custody on-chain như chứng nhận kiểm nghiệm, đủ điều kiện xuất khẩu hay quyền sở hữu pháp lý.

## Yêu cầu và mốc cần xác nhận

- [Trang UniHackFest trên Corelia](https://app.corelia.academy/hackathons/unihackfest-2026) yêu cầu: live/devnet demo, public GitHub repo có lịch sử commit, video dự phòng 60–90 giây quay sản phẩm thật, pitch deck, track/theme và thông tin đội. Trang hiển thị hạn đăng ký/nộp **29/09/2026 22:00**.
- [Thể lệ được chính trang này liên kết](https://docs.google.com/document/d/1gveC_I-KCVGpC9PP94D2TDx_vEP3TXbBHKY0dgvxw5M/edit) lại mô tả vòng loại tháng 8, Final Demo Day **26/09/2026**, và 2 track; Corelia hiển thị 3 track. Thể lệ nói bản chính thức được ký có ưu tiên. Đội cần hỏi BTC/guider ngay: còn nhận đội mới không, hạn nào áp dụng và chọn track nào trong form.
- Đề xuất nếu form cho chọn: **Best Technical Build**; theme **RWA & Tokenization**. Nên gọi sản phẩm là *digital custody/traceability for physical batches*, không nhận là token hóa quyền sở hữu pháp lý.

## Bằng chứng kỹ thuật đã kiểm tra

| Hạng mục | Kết quả | Giới hạn |
| --- | --- | --- |
| Production demo | [durian-web3.vercel.app/#/unit/demo](https://durian-web3.vercel.app/#/unit/demo) đọc được batch `DRN-2026-LD-0429` từ Devnet; leaf sample gọi API và nhận kết quả | Production hiện còn nhãn Cadimi/Vàng O và confidence gây hiểu sai; local đã sửa, chưa deploy |
| Solana transaction | [Explorer transaction](https://explorer.solana.com/tx/SLXtNFUJN9kter2MgfqgVrzX1mASn1A1TERkFe5SgowQt5URn4cMMRRFKyvWdjrQqsyBrBREurxhpnv7BHpEA6o?cluster=devnet) `TransferCustody` finalized | Giao dịch này chứng minh đề xuất bàn giao, không tự chứng minh bên nhận đã ký chấp nhận |
| App | 146 Vitest pass; lint, TypeScript và Vite build pass | Không thay thế browser smoke trên production sau deploy |
| API | 12 Python unit tests pass bằng runtime bundled | Stub không đo độ chính xác ONNX trên dữ liệu thực |
| Contract | 4 Rust unit tests; 19 attestation tests với `solana-test-validator`; snapshot/IDL sync check pass | Attestation v2 mới test local, chưa xác minh binary Devnet khớp source; CI legacy suite chưa được chứng minh pass |
| Deck | [Pitch deck đã rà soát](DurianTrust_Pitch_Deck_reviewed_v2.pptx), 11 slide; PPTX validation và render/layout pass | Cần đội điền speaker/team details nếu form yêu cầu |

## Việc đã sửa trong workspace

1. Tính lại nhãn đối chiếu Cadimi từ số đo + ngưỡng đã lưu, thay vì hiển thị kết luận/confidence tùy ý trong báo cáo chain cũ. Giữ raw report để audit, nhưng không dùng nội dung cũ làm kết luận hiện hành.
2. Sửa nhãn UI/seed data: không kết luận Vàng O, đạt chuẩn xuất khẩu hay “94% độ tin cậy kiểm định”; nói rõ ngưỡng demo và dữ liệu do người dùng nhập. Link QR hiện gọi đúng là hồ sơ lô, custody là người giữ lô trên chain.
3. Sửa README và deck để phân biệt chữ ký, custody, AI synthetic và việc chứng minh hàng thật. Sửa helper test khiến lint fail.

## Ưu tiên trước khi nộp

1. **P0 — Nộp được hay không:** xác nhận đăng ký và deadline với BTC; tạo/cập nhật submission trên Corelia. Chọn đúng track/theme và điền đội.
2. **P0 — Public artifacts:** review full Git history để chắc không có bí mật; đổi repo private → public, commit/push các sửa đã review, deploy Vercel và smoke production. Workspace đang có nhiều thay đổi từ trước audit, nên review diff trước khi publish. Không public `.keys/` hoặc secret.
3. **P0 — Video:** quay màn hình 60–90 giây từ bản production mới. Kịch bản: 0–10s vấn đề/hứa hẹn; 10–35s QR mở batch Devnet, chỉ số đo Cadimi và ngưỡng minh họa; 35–55s timeline/custody và Explorer; 55–75s leaf sample AI với nhãn demo; 75–90s giới hạn và link repo. Tránh thao tác wallet mất thời gian trong video dự phòng.
4. **P1 — Bằng chứng contract:** nếu demo live chuyển custody, cần riêng transaction `AcceptCustody` và người nhận ký; transaction `TransferCustody` hiện được kiểm tra chỉ là đề xuất. Kiểm tra đúng program ID, deployed binary và current source trước khi nói attestation v2 đang live.
5. **P2 — Sau cuộc thi:** đánh giá ML với tập test độc lập có provenance, calibration/unknown handling; kiểm tra giá trị ngưỡng Cadimi với chuyên gia và tiêu chuẩn thị trường đích trước ứng dụng thực tế.

**Ranh giới sản phẩm:** Solana chứng minh ai đã ký/gửi bản ghi số; app chưa xác thực người đo, mẫu vật, chứng thư lab, liên kết QR với trái thật hoặc quyền sở hữu theo pháp luật.
