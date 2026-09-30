# DurianTrust - kịch bản cho giới hạn 4 phút

Mục tiêu: 3 phút 45 giây, gồm video 40 giây; còn 15 giây dự phòng. Các mốc dưới đây là mục tiêu luyện tập, chưa phải thời lượng đọc đã đo. Đọc thành tiếng một lượt với đồng hồ trước khi thi. Hộp thao tác trong PDF không đọc thành lời.

## 1. DurianTrust (15s)

Hãy hình dung một hợp tác xã chuẩn bị giao 850 ký sầu riêng. Bên mua hỏi: vườn nào, thu hoạch khi nào, tài liệu đâu? DurianTrust gom thông tin thành hồ sơ theo lô, để chủ hồ sơ chia sẻ bằng QR. Đây là tình huống minh họa.

## 2. Vì sao DurianTrust ra đời? (25s)

Theo họp báo Chính phủ ngày 3 tháng 9, Trung Quốc chiếm khoảng 95% kim ngạch xuất khẩu sầu riêng Việt Nam trong tám tháng đầu năm 2026. Yêu cầu kiểm nghiệm và truy xuất khiến hồ sơ đúng lô rất quan trọng. DurianTrust hỗ trợ chuẩn bị và đối chiếu hồ sơ. Cadimi và Vàng O vẫn cần kiểm nghiệm; website chưa chứng minh giúp giảm lô bị trả.

## 3. Người dùng đầu tiên (15s)

Người dùng dự kiến là nhà vườn, HTX và bên mua như đơn vị thu mua hoặc doanh nghiệp xuất khẩu. Zalo và Drive giúp trao đổi tệp. Nhóm muốn kiểm chứng giá trị của việc gắn tài liệu và lịch sử vào cùng một lô để đối chiếu thuận tiện hơn.

## 4. Luồng hồ sơ lô (20s)

Chủ hồ sơ đăng nhập Google, tạo lô riêng tư, thêm tài liệu có nguồn và ngày, rồi ghi các mốc hành trình. Checklist chỉ rõ phần còn thiếu và mở đúng form để bổ sung. Khi sẵn sàng, họ công khai toàn bộ hồ sơ qua QR. Chuyển lại riêng tư chặn lượt đọc mới, nhưng không thu hồi bản đã tải.

## 5. HTX chuẩn bị hồ sơ cho bên mua (40s)

[THAO TÁC, KHÔNG ĐỌC] Bấm video 40 giây. Clip có giọng nữ tiếng Việt; không nói chồng lên clip. Video dùng giao diện local, dữ liệu TEST và Auth/API mô phỏng. Nếu không phát được, dành tối đa 15 giây tóm tắt: nhập thông tin lô, thêm tài liệu, công khai QR, bên mua đọc, rồi chuyển lại riêng tư. Sau đó sang slide 6.

## 6. Công nghệ và kiến trúc cloud (25s)

Giao diện dùng React và Vite trên Vercel. API Python dùng FastAPI trên Render. Google OAuth qua Supabase cấp phiên đăng nhập; PostgreSQL áp dụng RLS để kiểm tra quyền theo tài khoản. Supabase Storage giữ ảnh và PDF trong bucket riêng tư. Lô mới mặc định riêng tư; khi công khai, bên mua đọc qua QR. Hồ sơ đủ thông tin chưa đồng nghĩa tài liệu đã xác thực hay lô đủ điều kiện xuất khẩu.

## 7. Bàn giao trên Solana (20s)

Thử nghiệm Solana dùng Rust và Anchor trên Devnet. Người đang giữ lô ký đề xuất ví nhận; bên nhận ký chấp nhận thì trạng thái custody mới đổi. Cơ chế này ghi nhận bàn giao giữa ví, chưa chứng minh giao hàng vật lý hoặc quyền sở hữu pháp lý. Luồng cloud hiện chưa tự đồng bộ với Solana.

## 8. AI gợi ý từ ảnh lá (20s)

AI dùng ONNX Runtime để gợi ý một trong năm nhóm ảnh lá và yêu cầu chuyên gia đối chiếu. Điểm model trên một ảnh chưa phải accuracy. Nhóm giữ model cũ vì bản fine-tune chưa tốt hơn; chi tiết đánh giá nằm trong tài liệu phụ lục. Ảnh lá không đo Cadimi hoặc Vàng O và không chứng nhận an toàn thực phẩm.

## 9. Pilot với một hợp tác xã (25s)

Website và API đã deploy. Kiểm thử local và quyền database trên CI đã pass; quy trình production đầy đủ vẫn cần kiểm chứng. Nhóm chưa có pilot HTX hay phiếu lab thật. Bước tiếp theo là thử với một HTX và nhóm lô nhỏ, đo thời gian tìm hồ sơ, tài liệu thiếu và số lần bên mua hỏi lại. Việc trả phí chỉ là giả thuyết cần kiểm tra.

## 10. Demo và mã nguồn (20s)

DurianTrust giúp chuẩn bị hồ sơ theo lô và chia sẻ QR chỉ đọc, do chủ hồ sơ quyết định công khai. Giá trị thực tế sẽ được đo bằng pilot. QR trên màn hình mở hồ sơ mẫu; mã nguồn đã công khai. Chúng tôi mong được kết nối với HTX sẵn sàng thử và đơn vị phát hành tài liệu kiểm nghiệm. Xin cảm ơn.

Tổng thời lượng mục tiêu: 225 giây. Giới hạn tối đa: 240 giây.

Mốc kiểm soát: bắt đầu video lúc 01:15, hết video lúc 01:55, hết phần công nghệ lúc 02:20, bắt đầu kết bài lúc 03:25, kết thúc khoảng 03:45.

Nếu chậm hơn đồng hồ: bỏ câu giải thích Zalo/Drive ở slide 3 và câu cuối về trả phí ở slide 9. Luôn giữ phần kết và giới hạn của Solana/AI. Không mở bài nói AI chi tiết hoặc phần hỏi đáp trong 4 phút.

Nguồn bối cảnh: https://baochinhphu.vn/hop-bao-chinh-phu-thuong-ky-thang-8-dai-dien-bo-cong-an-lam-ro-nhieu-van-de-duoc-quan-tam-102260903170016698.htm

Đối chiếu kỹ thuật: https://github.com/vinhelysia/DurainCheckerDemo ; https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/review/ai-training/MENDELEY_EXTERNAL_EVAL.md
