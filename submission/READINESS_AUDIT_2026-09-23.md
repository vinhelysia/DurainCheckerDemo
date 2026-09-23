# UniHackFest 2026 — readiness audit (23/09/2026)

## Kết luận

DurianTrust đã có demo Devnet, [public repo](https://github.com/vinhelysia/DurainCheckerDemo), bản production đã smoke, pitch deck 11 slide và [hồ sơ Corelia](https://app.corelia.academy/projects/duriantrust). Tài khoản Corelia hiển thị **Đã đăng ký** và dự án xuất hiện trong danh sách UniHackFest. **Còn thiếu trước khi nộp đầy đủ**: video dự phòng 60–90 giây và thành viên đội (nếu có). Không nên trình bày mô hình synthetic, ngưỡng Cadimi minh họa, QR hoặc custody on-chain như chứng nhận kiểm nghiệm, đủ điều kiện xuất khẩu hay quyền sở hữu pháp lý.

## Yêu cầu và mốc cần xác nhận

- [Trang UniHackFest trên Corelia](https://app.corelia.academy/hackathons/unihackfest-2026) yêu cầu: live/devnet demo, public GitHub repo có lịch sử commit, video dự phòng 60–90 giây quay sản phẩm thật, pitch deck, track/theme và thông tin đội. Trang hiển thị hạn đăng ký/nộp **29/09/2026 22:00**.
- [Thể lệ được chính trang này liên kết](https://docs.google.com/document/d/1gveC_I-KCVGpC9PP94D2TDx_vEP3TXbBHKY0dgvxw5M/edit) lại mô tả vòng loại tháng 8, Final Demo Day **26/09/2026**, và 2 track; Corelia hiển thị 3 track. Thể lệ nói bản chính thức được ký có ưu tiên. Đội cần hỏi BTC/guider ngay: còn nhận đội mới không, hạn nào áp dụng và chọn track nào trong form.
- Hồ sơ Corelia đang hiển thị **Best Technical Build** và **Best AI Product** theo lựa chọn của đội; form cho chọn nhiều track dù trang tổng quan nói mỗi đội chọn một track chính. Nếu BTC yêu cầu một track duy nhất, ưu tiên Best Technical Build. Chủ đề đề xuất: **RWA & Tokenization**; form hiện không có trường chủ đề riêng. Nên gọi sản phẩm là *digital custody/traceability for physical batches*, không nhận là token hóa quyền sở hữu pháp lý.

## Bằng chứng kỹ thuật đã kiểm tra

| Hạng mục | Kết quả | Giới hạn |
| --- | --- | --- |
| Production demo | [durian-web3.vercel.app/#/unit/demo](https://durian-web3.vercel.app/#/unit/demo) đọc batch `DRN-2026-LD-0429` từ Devnet; nhãn Cadimi/Vàng O đã sửa; ảnh lá mẫu trả kết quả từ API sau deploy | Giá trị lab do người dùng nhập, không xác minh chứng thư hay mẫu vật |
| Solana transaction | [Explorer transaction](https://explorer.solana.com/tx/SLXtNFUJN9kter2MgfqgVrzX1mASn1A1TERkFe5SgowQt5URn4cMMRRFKyvWdjrQqsyBrBREurxhpnv7BHpEA6o?cluster=devnet) `TransferCustody` finalized | Giao dịch này chứng minh đề xuất bàn giao, không tự chứng minh bên nhận đã ký chấp nhận |
| App | 146 Vitest pass; lint, TypeScript và Vite build pass; browser smoke production pass; frontend GitHub CI pass | Không đo hiệu năng hoặc tải cao |
| API | 12 Python unit tests pass bằng runtime bundled | Stub không đo độ chính xác ONNX trên dữ liệu thực |
| Contract | 4 Rust unit tests; 19 attestation và 20 custody/authority tests với local validator; snapshot/IDL sync check pass; [GitHub CI #7](https://github.com/vinhelysia/DurainCheckerDemo/actions/runs/35815889952) thành công cả Anchor và frontend | Attestation v2 mới test local, chưa xác minh binary Devnet khớp source |
| Deck | [Pitch deck chính đã rà soát](../DurianTrust_Pitch_Deck.pptx), 11 slide; PPTX validation và render/layout pass | Cần đội điền speaker/team details nếu form yêu cầu |

## Việc đã sửa trong workspace

1. Tính lại nhãn đối chiếu Cadimi từ số đo + ngưỡng đã lưu, thay vì hiển thị kết luận/confidence tùy ý trong báo cáo chain cũ. Giữ raw report để audit, nhưng không dùng nội dung cũ làm kết luận hiện hành.
2. Sửa nhãn UI/seed data: không kết luận Vàng O, đạt chuẩn xuất khẩu hay “94% độ tin cậy kiểm định”; nói rõ ngưỡng demo và dữ liệu do người dùng nhập. Link QR hiện gọi đúng là hồ sơ lô, custody là người giữ lô trên chain.
3. Sửa README và deck để phân biệt chữ ký, custody, AI synthetic và việc chứng minh hàng thật. Sửa helper test khiến lint fail.

## Ưu tiên trước khi nộp

1. **P0 — Hồ sơ dự thi:** dự án đã công khai trên Corelia và tài khoản hiển thị Đã đăng ký. Bổ sung thành viên (nếu có), video, rồi xác nhận deadline với BTC vì trang thể lệ liên kết và Corelia mâu thuẫn.
2. **Đã xong — Public artifacts:** repo public, commit đã push, Vercel production và ảnh lá mẫu smoke pass. `.keys/` vẫn bị ignore; rà tên file trong lịch sử và pattern secret ở workspace không thấy key được track. Tiếp tục giữ key ngoài Git.
3. **P0 — Video:** quay màn hình 60–90 giây từ bản production mới. Kịch bản: 0–10s vấn đề/hứa hẹn; 10–35s QR mở batch Devnet, chỉ số đo Cadimi và ngưỡng minh họa; 35–55s timeline/custody và Explorer; 55–75s leaf sample AI với nhãn demo; 75–90s giới hạn và link repo. Tránh thao tác wallet mất thời gian trong video dự phòng.
   [Video giới thiệu 73 giây](../public/DurianTrust_Intro_73s.mp4) là hình dựng bằng code, có thể dùng cho mục Video thuyết trình; không thay thế video quay thao tác thật.
   [Video hướng dẫn mô phỏng 72 giây](../public/DurianTrust_Guided_Walkthrough_72s.mp4) có con trỏ và highlight theo luồng production, được gắn nhãn hình dựng trong toàn bộ video; cũng không thay thế video quay màn hình thật.
4. **P1 — Bằng chứng contract:** nếu demo live chuyển custody, cần riêng transaction `AcceptCustody` và người nhận ký; transaction `TransferCustody` hiện được kiểm tra chỉ là đề xuất. Kiểm tra đúng program ID, deployed binary và current source trước khi nói attestation v2 đang live.
5. **P2 — Sau cuộc thi:** đánh giá ML với tập test độc lập có provenance, calibration/unknown handling; kiểm tra giá trị ngưỡng Cadimi với chuyên gia và tiêu chuẩn thị trường đích trước ứng dụng thực tế.

**Ranh giới sản phẩm:** Solana chứng minh ai đã ký/gửi bản ghi số; app chưa xác thực người đo, mẫu vật, chứng thư lab, liên kết QR với trái thật hoặc quyền sở hữu theo pháp luật.
