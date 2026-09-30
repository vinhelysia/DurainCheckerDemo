# DurianTrust — Hồ sơ lô sầu riêng từ HTX đến bên mua

## Mô tả ngắn

DurianTrust là prototype giúp nhà vườn và hợp tác xã (HTX) chuẩn bị hồ sơ theo từng lô sầu riêng: tạo riêng tư, thêm ảnh/tài liệu và lịch sử, rồi chủ động công khai qua QR để bên mua đối chiếu. Solana Devnet và AI là các thử nghiệm riêng, chưa tự đồng bộ với hồ sơ cloud.

## Vấn đề

Xuất khẩu sầu riêng Việt Nam phụ thuộc lớn vào Trung Quốc. Theo họp báo Chính phủ ngày 3/9/2026, trong **8 tháng đầu năm 2026**, thị trường này đóng góp khoảng **95% kim ngạch xuất khẩu sầu riêng Việt Nam**, tương đương 1,85 tỷ USD trên tổng 1,95 tỷ USD ước tính. Đây là số liệu theo giai đoạn, không phải tỷ trọng cố định. [Nguồn: Báo Điện tử Chính phủ](https://baochinhphu.vn/hop-bao-chinh-phu-thuong-ky-thang-8-dai-dien-bo-cong-an-lam-ro-nhieu-van-de-duoc-quan-tam-102260903170016698.htm).

Yêu cầu về chất lượng, kiểm nghiệm và truy xuất khiến việc chuẩn bị hồ sơ đúng lô trở nên quan trọng. DurianTrust thử giải quyết phần quản lý và chia sẻ hồ sơ; chưa có bằng chứng xác định bao nhiêu lô bị trả do hồ sơ phân tán hay chứng minh website giúp giảm số lô bị trả.

Các sự cố năm 2025 cho thấy hậu quả khi lô hàng chưa đáp ứng yêu cầu. Báo Công Thương ngày 20/1/2025 ghi nhận một doanh nghiệp có 5 container bị trả vì thiếu giấy kiểm định Vàng O, đồng thời chủ động quay đầu thêm 5 container. VietnamPlus ngày 19/2/2025 dẫn Hải quan Tân Thanh cho biết 17 xe sầu riêng phải nhập trở lại Việt Nam vì chưa đáp ứng quy định phía Trung Quốc. Không thể quy tất cả các trường hợp này cho cùng một lỗi hồ sơ hoặc một chất cụ thể. [Công Thương](https://congthuong.vn/sau-rieng-gap-kho-khi-xuat-khau-sang-trung-quoc-370377.html) · [VietnamPlus/TTXVN](https://www.vietnamplus.vn/vi-sao-xuat-khau-sau-rieng-qua-cac-cua-khau-tai-lang-son-giam-manh-post1013155.amp).

## Giải pháp và người dùng

Người dùng dự kiến là nhà vườn/HTX chuẩn bị tài liệu cho bên mua. Quy trình chính:

1. Đăng nhập và tạo lô riêng tư với thông tin vườn, ngày thu hoạch, giống và khối lượng.
2. Đính kèm ảnh/tài liệu, khai báo nguồn và ngày tài liệu; thêm sự kiện vào lịch sử lô.
3. Kiểm tra nội dung rồi công khai hồ sơ cùng bằng chứng. Bên mua mở QR để đọc và tải tài liệu, không cần ví blockchain.
4. Chuyển về riêng tư để chặn lượt truy cập công khai mới. Bản đã tải và ảnh chụp màn hình không bị thu hồi.

Giá trị cần kiểm chứng là giảm công sức gom tài liệu và giúp bên mua đối chiếu trước giao nhận. Nhóm chưa có pilot, tài liệu lab thật hay số đo hiệu quả kinh doanh. Tất cả dữ liệu lô và tài liệu TEST trong demo đều là minh họa.

## Công nghệ và phạm vi

- **Ứng dụng chính:** React + Vite trên Vercel; API Python/FastAPI trên Render; Google OAuth qua Supabase Auth; PostgreSQL với Row Level Security và private Supabase Storage. Hồ sơ mới mặc định riêng tư. Khi công khai, người có QR/đường dẫn có thể xem toàn bộ hồ sơ, lịch sử và bằng chứng đính kèm.
- **Thử nghiệm Solana:** Anchor trên Solana Devnet nghiên cứu lịch sử bàn giao giữa ví; bên nhận phải ký chấp nhận. Đây là trạng thái người giữ được ghi nhận, chưa chứng minh quyền sở hữu pháp lý hoặc giao hàng vật lý. Hồ sơ cloud chưa tự ghi lên blockchain.
- **Thử nghiệm AI:** ONNX Runtime cho phân loại ảnh lá và hai pipeline tabular dùng dữ liệu synthetic. AI không phát hiện Cadmium/Vàng O từ ảnh lá, không xác thực tài liệu lab và không chứng nhận an toàn hay đủ điều kiện xuất khẩu. Rule so sánh Cadmium với ngưỡng demo là logic xác định, không phải AI hay kết luận pháp lý.

QR liên kết đến hồ sơ do chủ lô cung cấp; checklist chỉ kiểm tra sự hiện diện của thông tin. Chúng chưa xác thực người phát hành tài liệu, mã vùng trồng hay sự gắn kết nhãn với lô vật lý. QR có thể bị sao chép; database administrators vẫn có quyền quản trị dữ liệu.

## Trạng thái demo và giới hạn

Người dùng đã xác nhận Google sign-in vào được màn hình quản lý. Quy trình production đầy đủ — tạo lô, upload, kiểm tra riêng tư, công khai và thu hồi — **chưa được verify end to end**.

Video 90 giây có thuyết minh nữ AI tiếng Việt (Microsoft HoaiMyNeural), dùng ảnh chụp giao diện local có chú thích, dữ liệu TEST và Auth/API mô phỏng; không phải quay liên tục, bằng chứng production E2E hay pilot tại HTX. Website có hồ sơ mẫu chỉ đọc để xem không cần đăng nhập.

Chi tiết AI nằm trong model card và phụ lục: model API được cấu hình trong repo đạt **80/202 (39,6%)** trên ba nhãn được đối chiếu của Mendeley v2; Phomopsis **0/59**. Chưa xác minh provenance training hoặc hash model đang phục vụ trên Render, nên đây chưa phải independent field test. Candidate mới không vượt gate validation và chưa được promote. Các kết quả chỉ hỗ trợ nghiên cứu, cần manual review.

## Bước tiếp theo

Verify production với hai tài khoản và một người xem ẩn danh; sau đó thử nghiệm với HTX tự nguyện bằng tài liệu có quyền sử dụng. Đo thời gian chuẩn bị, số tài liệu thiếu và khả năng bên mua đối chiếu. Đánh giá AI cần bộ ảnh mới được chuyên gia gán nhãn, chia holdout theo cây/vườn và có ảnh ngoài taxonomy.

## Tài nguyên

- [Website](https://durian-web3.vercel.app/) · [Hồ sơ mẫu](https://durian-web3.vercel.app/#/records/example)
- [Video 90 giây có giọng nữ tiếng Việt](https://durian-web3.vercel.app/submission/DurianTrust_HTX_Demo_90s.mp4)
- [Source code](https://github.com/vinhelysia/DurainCheckerDemo)
- [PowerPoint Morph v11](https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/presentation/output/DurianTrust_Morph_59_VI-HTX-v11.pptx) · [Bản Core 19 slide](https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/presentation/output/DurianTrust_Core_19_VI-HTX-v11.pptx)
- [Kịch bản 10 phút và 22 câu hỏi giám khảo, PDF v8](https://github.com/vinhelysia/DurainCheckerDemo/blob/main/output/pdf/DurianTrust_Kich_ban_va_Hoi_dap_giam_khao_v8.pdf)
- [Model card](https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/review/ai-training/MODEL_CARD.md) · [External evaluation](https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/review/ai-training/MENDELEY_EXTERNAL_EVAL.md)

*Cập nhật 30/09/2026. Bộ trình bày có 19 ý chính và một phụ lục AI; bản Morph có 60 slide tổng cộng.*
