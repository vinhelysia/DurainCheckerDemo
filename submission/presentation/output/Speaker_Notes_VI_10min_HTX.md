# DurianTrust - lời thuyết trình khoảng 10 phút (deck v11)

## 1. DurianTrust (35s)

Hãy hình dung một hợp tác xã ở Lâm Đồng chuẩn bị giao 850 ký sầu riêng. Bên mua hỏi: lô này của vườn nào, thu hoạch ngày nào, có tài liệu gì? Trong tình huống giả định này, câu trả lời nằm rải rác trong Zalo, Drive và sổ tay. DurianTrust gom chúng thành một hồ sơ theo từng lô. Chủ hồ sơ chọn công khai hồ sơ, bên mua mở bằng QR. Solana và AI là hai thử nghiệm riêng, chúng tôi sẽ nói rõ phạm vi ở phần sau.

## 2. Vì sao DurianTrust ra đời? (40s)

Trong tám tháng đầu năm 2026, khoảng 95% kim ngạch xuất khẩu sầu riêng Việt Nam đến từ Trung Quốc. Họp báo Chính phủ ngày 3 tháng 9 nêu khoảng 1,85 tỷ USD từ thị trường này trên tổng 1,95 tỷ USD ước tính. Mức phụ thuộc lớn khiến yêu cầu chất lượng và truy xuất của Trung Quốc đặc biệt quan trọng. DurianTrust chọn hỗ trợ phần hồ sơ: gắn thông tin vườn, phiếu lab và lịch sử với đúng lô để HTX và bên mua đối chiếu. Cadimi và Vàng O vẫn cần lấy mẫu, kiểm nghiệm. Nhóm chưa có pilot, nên tác động của website còn cần đo.

## 3. Người dùng đầu tiên (30s)

Người chuẩn bị hồ sơ dự kiến là nông hộ hoặc HTX; bên mua đầu tiên có thể là đơn vị thu mua hay doanh nghiệp xuất khẩu nhận lô từ HTX. Đây chưa phải khách hàng đã xác nhận. Zalo và Drive có thể đủ để trao đổi, lưu tệp. Điều nhóm muốn kiểm chứng là hồ sơ có cấu trúc theo lô giúp tìm và đối chiếu tài liệu dễ hơn. Đơn vị kiểm nghiệm có thể phát hành tài liệu; hệ thống hiện chỉ lưu tệp do chủ hồ sơ cung cấp.

## 4. Luồng hồ sơ lô (25s)

Luồng chính gồm bốn bước. Chủ hồ sơ tạo lô riêng tư. Tiếp theo họ thêm ảnh hoặc tài liệu, kèm nguồn và ngày. Mỗi mốc hành trình lưu thành một bản ghi mới. Khi sẵn sàng, chủ hồ sơ công khai QR cho bên mua. Mỗi bước bổ sung một phần cần thiết để trao đổi về cùng lô. Đăng nhập Google phục vụ workspace này và không yêu cầu ví Solana.

## 5. Thông tin lô (20s)

Tình huống minh họa dùng HTX chuẩn bị lô MAU-2026-01 tại Lâm Đồng, giống Ri6, khối lượng 850 kg và ngày thu hoạch 29/09/2026. Lô mới mặc định riêng tư. Màn quản lý tách thông tin, tài liệu, lịch sử và chia sẻ QR. Ảnh dùng giao diện compact chạy local với dữ liệu TEST và Auth/API mô phỏng. Chưa có kiểm chứng đầy đủ lượt ghi trên production.

## 6. Ảnh và tài liệu gắn với lô (20s)

Mỗi lô có thể đính kèm ảnh JPG, PNG hoặc tài liệu PDF, cùng nguồn và ngày. Tài liệu TEST trong demo mô tả lô minh họa, không phải phiếu kiểm nghiệm. Hệ thống kiểm tra loại tệp và dung lượng tối đa 5 MB. Việc đính kèm chưa xác minh người phát hành hoặc tính thật của phiếu.

## 7. Lịch sử hành trình (18s)

Mỗi mốc lưu tên, ngày, địa điểm và ghi chú thành một bản ghi mới. Ngày sự kiện do người dùng khai báo. Giao hàng trên cloud là ghi nhận một phía, chưa phải chữ ký chấp nhận của bên nhận.

## 8. Hồ sơ bên mua qua QR (20s)

Bên mua mở hồ sơ công khai qua QR mà không cần đăng nhập. QR trên slide dẫn đến hồ sơ mẫu. Với lô thật, chủ hồ sơ chọn công khai cả thông tin và tài liệu. QR có thể bị sao chép, nên không xác thực trái sầu riêng.

## 9. Quyền chia sẻ hồ sơ (20s)

Hồ sơ mới riêng tư. Chủ hồ sơ có thể công khai, rồi chuyển lại riêng tư để chặn lượt đọc mới. Hệ thống không thu hồi được bản đã tải. RLS kiểm tra quyền ở database và Storage. Kiểm thử end-to-end trên production vẫn cần hoàn tất.

## 10. HTX chuẩn bị hồ sơ cho bên mua (90s)

Bấm vào video 90 giây đã nhúng. HTX minh họa tạo lô riêng tư MAU-2026-01, thêm tài liệu TEST mô tả lô, rồi thêm mốc đóng gói. Chủ hồ sơ kiểm tra nội dung trước khi công khai QR. Bên mua mở hồ sơ chỉ đọc và tìm tài liệu đúng lô. Cuối video, HTX chuyển lại riêng tư để chặn lượt đọc mới. Video dùng ảnh chụp giao diện compact app local cùng con trỏ và highlight minh họa. Auth/API dùng fixture mô phỏng. Đây chưa phải ghi hình liên tục hoặc bằng chứng hoàn tất flow production. PDF là tài liệu demo, không phải phiếu kiểm nghiệm. Nếu PowerPoint không phát, dùng link video dự phòng hoặc file MP4 đi kèm.

## 11. Công nghệ và kiến trúc cloud (25s)

Giao diện dùng React 19 và Vite 8, triển khai trên Vercel. API Python dùng FastAPI trên Render. Google login qua Supabase cấp phiên đăng nhập; PostgreSQL áp dụng RLS theo tài khoản. Database giữ thông tin lô và lịch sử, còn ảnh và PDF ở Supabase Storage. Đây là luồng cloud, chưa tự đồng bộ với Solana hay AI.

## 12. Bàn giao trên Solana (34s)

Program Solana viết bằng Rust với framework Anchor 0.31.1. Frontend gọi program qua Anchor JavaScript client và solana/web3.js; Wallet Adapter kết nối ví để ký. Người đang giữ lô ký đề xuất ví nhận, người nhận ký chấp nhận, rồi custody mới đổi. Chữ ký xác nhận trạng thái số, chưa thiết lập quyền sở hữu pháp lý hoặc chứng minh giao hàng vật lý. Luồng thử nghiệm cấu hình trên Devnet, không tự đồng bộ với cloud. Đã có kiểm thử local; chưa xác nhận binary Devnet khớp toàn bộ source hiện tại.

## 13. Chữ ký và giới hạn bằng chứng (35s)

Chữ ký xác định ví nào đã gửi hoặc chấp nhận một bản ghi số. Lịch sử on-chain giúp đối chiếu các giao dịch liên quan. Giá trị này có giới hạn: giấy tờ do người dùng nhập có thể sai, QR có thể được gắn lên lô khác, và trách nhiệm pháp lý cần thỏa thuận ngoài hệ thống. Bởi vậy chúng tôi trình bày bằng chứng số đúng phạm vi của nó, đồng thời tách các mục cần xác minh bằng người hoặc tổ chức độc lập.

## 14. AI gợi ý từ ảnh lá (35s)

API Python dùng Pillow/NumPy và ONNX Runtime để xử lý ảnh lá và đưa ra gợi ý trong năm nhóm đã định nghĩa. Giao diện hiển thị điểm của model và yêu cầu người có chuyên môn kiểm tra trước khi xử lý bệnh. Điểm model trên một ảnh chưa phải accuracy. Chúng tôi giữ model cũ; bản fine-tune chưa đáp ứng tiêu chí thay thế. Các phép đo, dataset và giới hạn nằm ở phụ lục để đối chiếu khi hỏi đáp. Ảnh lá không đo Cadimi hoặc Vàng O, và chưa có đánh giá độc lập theo vườn/cây để khẳng định hiệu quả ngoài thực tế.

## 15. Các thử nghiệm dự đoán (18s)

Hai thử nghiệm dạng bảng dùng scikit-learn và ONNX Runtime, nhưng dữ liệu là synthetic, chưa chứng minh dự đoán đúng Cadimi thực tế. Phần đối chiếu số đo với ngưỡng demo là rule xác định, không phải AI. Nhóm chưa xác minh ngưỡng minh họa cho thị trường đích.

## 16. MVP hiện tại (35s)

MVP có website và API đã deploy. Người dùng đã xác nhận đăng nhập Google vào được màn quản lý. Local tests cho cloud client và backend pass, nhưng chưa hoàn tất lượt kiểm thử tạo lô, upload, công khai và thu hồi trên production. Các thử nghiệm Solana có source và local validator. AI ảnh lá giữ model cũ với yêu cầu kiểm tra thủ công; kết quả đánh giá chi tiết nằm ở phụ lục. Hiệu năng ngoài vườn và hash model đang chạy trên Render chưa được xác minh. Mốc tiếp theo là kiểm chứng flow thật và xin một pilot nhỏ.

## 17. Pilot với một hợp tác xã (35s)

Đề xuất pilot bắt đầu với một hợp tác xã và một nhóm lô nhỏ. Trước tiên cần đo thời gian chuẩn bị hồ sơ và tìm tài liệu bằng cách làm hiện tại. Sau đó dùng DurianTrust để so sánh cùng công việc. Các chỉ số cần theo dõi là thời gian tìm hồ sơ, tài liệu còn thiếu và số lần bên mua phải hỏi lại. Hợp tác xã là bên có thể trả phí cho workspace nếu pilot cho thấy giá trị. Chúng tôi chưa xác nhận khách hàng, giá bán hay mức tiết kiệm.

## 18. Các bước phát triển tiếp theo (30s)

Ưu tiên gần nhất là kiểm thử end-to-end cloud trên production với hai tài khoản và một phiên ẩn danh. Tiếp theo là pilot để xác nhận người dùng thực sự cần quy trình nào. Giai đoạn sau cần đối tác phát hành tài liệu hoặc cơ chế attestation để kiểm tra nguồn bằng chứng. AI cần tập dữ liệu thực có provenance và đánh giá độc lập. Liên kết giữa cloud và Solana chỉ nên làm khi pilot chứng minh nhu cầu về bàn giao có chữ ký.

## 19. Demo và mã nguồn (35s)

Chúng tôi xin để lại ba ý. Một: hồ sơ theo từng lô thay cho tài liệu rải rác. Hai: QR chỉ đọc, do chủ hồ sơ quyết định công khai. Ba: giá trị sẽ được đo bằng pilot, không phải bằng lời hứa. Bước tiếp theo là kiểm chứng luồng trên production và chạy thử với một hợp tác xã. Nếu ban giám khảo biết hợp tác xã sẵn sàng thử, hoặc đơn vị có thể phát hành tài liệu kiểm nghiệm, chúng tôi rất mong được kết nối. Xin cảm ơn.

Tổng thời lượng dự kiến: 600 giây.


## Phụ lục: đánh giá AI (ngoài bài nói 10 phút)

Model cũ trên DurianLDD: test 889 ảnh, năm nhãn, accuracy 85,38%. Training provenance của model cũ chưa rõ; có thể model đã thấy ảnh nguồn này, nên đây chưa phải independent test được chứng minh. Trên cùng 202 ảnh thuộc ba nhãn đối chiếu Mendeley Data v2, model cũ đúng 80/202 (39,6%), Phomopsis 0/59; candidate Colab đúng 72/202 (35,6%). Đây không phải hai phép đo trên cùng dataset/taxonomy. Mapping nhãn và dHash không chứng minh độc lập theo vườn/cây. Chưa xác nhận hash model đang chạy trên Render. Candidate không được promote. Model vẫn chỉ dùng như gợi ý cần chuyên gia kiểm tra. Phụ lục nằm ngoài bài nói 10 phút; mở khi hỏi đáp.

Nguồn: https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/review/ai-training/MODEL_CARD.md ; https://github.com/vinhelysia/DurainCheckerDemo/blob/main/submission/review/ai-training/MENDELEY_EXTERNAL_EVAL.md ; https://data.mendeley.com/datasets/pxzvksbwnj/2 (CC BY 4.0).
