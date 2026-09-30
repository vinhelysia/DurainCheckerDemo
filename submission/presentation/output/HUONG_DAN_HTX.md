# DurianTrust — tình huống HTX chuẩn bị hồ sơ

## File dùng để trình bày

- `DurianTrust_Morph_59_VI-HTX-v11.pptx`: bản chính với 19 ý, 59 bước Morph và một slide phụ lục (60 slide tổng cộng). Video nằm ở slide 32, sau luồng hồ sơ và trước công nghệ.
- `DurianTrust_Core_19_VI-HTX-v11.pptx`: bản rút gọn đúng 19 slide chính, theo file Core hiện tại của nhóm. Video nằm ở slide 10.
- `Speaker_Notes_VI_10min_HTX.md`: lời nói tiếng Việt, tổng thời lượng dự kiến 600 giây, gồm video 90 giây. Notes cũng nằm trong PowerPoint.
- `../../../output/pdf/DurianTrust_Kich_ban_va_Hoi_dap_giam_khao_v8.pdf`: kịch bản PDF 13 trang: sáu trang lời nói, một trang phụ lục AI và sáu trang gồm 22 câu hỏi giám khảo.
- Video dự phòng: `DurianTrust_HTX_Demo_90s.mp4`, có ở website và được nhúng vào cả hai deck.

Bản v11 cập nhật screenshots, video 90 giây và lời nói theo UI compact; tiếp tục dùng logo công nghệ ở phần kiến trúc cloud, Solana và AI, với wordmark Supabase rõ hơn ở Database và Storage. Phần đăng nhập dùng logo Google và nhãn Google OAuth. Nguồn logo và attribution nằm trong speaker notes/phụ lục. Kịch bản mới mở bằng tình huống giả định 850 kg, kết bằng lời mời kết nối pilot. Mở/kết đặt mục tiêu 35 giây mỗi phần; mục 11 và 15 gọn hơn. Tổng mục tiêu vẫn là 600 giây gồm video, cần bấm giờ khi đọc thành tiếng.

## Tình huống demo

HTX minh họa chuẩn bị lô MAU-2026-01 tại Lâm Đồng, giống Ri6, khối lượng 850 kg và ngày thu hoạch 29/09/2026. Chủ hồ sơ thêm PDF TEST mô tả lô và mốc đóng gói. Sau khi kiểm tra nội dung, họ công khai hồ sơ và gửi QR cho bên mua. Bên mua xem hồ sơ chỉ đọc. Cuối video, chủ hồ sơ chuyển lại riêng tư để chặn lượt đọc mới.

Video có thuyết minh nữ AI tiếng Việt (Microsoft HoaiMyNeural), dài đúng 90 giây, dùng ảnh chụp giao diện app chạy local, con trỏ và highlight minh họa. Auth/API dùng fixture mô phỏng. Clip không phải ghi hình liên tục hoặc bằng chứng đã hoàn tất flow production. Nhãn này hiển thị xuyên suốt video. PDF là tài liệu mô tả lô minh họa, không phải phiếu kiểm nghiệm. Nhóm chưa có pilot thực địa.

Ảnh sầu riêng: Sodanie Chea, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Durian_(8425934020).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Ảnh được hiển thị ở màn đăng nhập.

## Trình chiếu

Mở deck bằng PowerPoint desktop, nhấn F5 rồi dùng Space hoặc mũi tên phải để chuyển từng bước. Bấm vào khung video để phát. Nếu video không phát trên máy trình chiếu, mở file MP4 dự phòng. Hãy thử Morph và video trên máy sẽ dùng để thi; playback native trong PowerPoint chưa được xác nhận tại đây.

Kết thúc bài pitch ở slide 59 của bản Morph hoặc slide 19 của bản Core. Phụ lục AI ở slide Morph 60 hoặc trang 7 PDF dùng khi hỏi đáp, không nằm trong thời lượng 10 phút. Core giữ đúng 19 slide, không có slide 20.

Nền deck, màu xanh, typography, video và các object Morph giữ theo bản trước. Nội dung quản lý và bên mua dùng giao diện compact đã deploy ở commit f8e6dce; captures và video cập nhật 30/09/2026. Phần chính mô tả AI thử nghiệm và yêu cầu chuyên gia đối chiếu. Phụ lục giữ đầy đủ kết quả: model cũ đạt 85,38% trên DurianLDD cùng nguồn và 39,6% (80/202 ảnh) trên ba nhãn đối chiếu Mendeley Data v2, Phomopsis 0/59; candidate Colab đạt 35,6% và chưa được promote. Chưa có đánh giá theo vườn/cây; chưa xác nhận model hash trên Render. [Giao thức và giới hạn](../../review/ai-training/MENDELEY_EXTERNAL_EVAL.md).
