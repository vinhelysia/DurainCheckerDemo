# DurianTrust — tình huống HTX chuẩn bị hồ sơ

## File dùng để trình bày

- `DurianTrust_Morph_59_VI-HTX-v6.pptx`: bản chính với 19 ý, 59 bước Morph và một slide phụ lục (60 slide tổng cộng). Video nằm ở slide 32, sau luồng hồ sơ và trước công nghệ.
- `DurianTrust_Core_19_VI-HTX-v6.pptx`: bản rút gọn với 19 slide chính và một slide phụ lục (20 slide tổng cộng). Video nằm ở slide 10.
- `Speaker_Notes_VI_10min_HTX.md`: lời nói tiếng Việt, tổng thời lượng dự kiến 600 giây, gồm video 90 giây. Notes cũng nằm trong PowerPoint.
- `../../../output/pdf/DurianTrust_Kich_ban_thuyet_trinh_10_phut_v5.pdf`: kịch bản PDF, sáu trang lời nói và một trang phụ lục AI.
- Video dự phòng: `DurianTrust_HTX_Demo_90s.mp4`, có ở website và được nhúng vào cả hai deck.

Bản v6 thêm logo công nghệ ở phần kiến trúc cloud, Solana và AI. Nguồn logo và attribution nằm trong speaker notes/phụ lục. Nội dung, thứ tự và thời lượng bài nói vẫn theo kịch bản v5.

## Tình huống demo

HTX minh họa chuẩn bị lô MAU-2026-01 tại Lâm Đồng, giống Ri6, khối lượng 850 kg và ngày thu hoạch 28/09/2026. Chủ hồ sơ thêm ảnh, tài liệu mô tả lô và mốc đóng gói. Sau khi kiểm tra nội dung, họ công khai hồ sơ và gửi QR cho bên mua. Bên mua xem hồ sơ chỉ đọc. Cuối video, chủ hồ sơ chuyển lại riêng tư để chặn lượt đọc mới.

Video dài đúng 90 giây, dùng ảnh chụp giao diện app chạy local, con trỏ và highlight minh họa. Auth/API dùng fixture mô phỏng. Clip không phải ghi hình liên tục hoặc bằng chứng đã hoàn tất flow production. Nhãn này hiển thị xuyên suốt video. PDF là tài liệu mô tả lô minh họa, không phải phiếu kiểm nghiệm. Nhóm chưa có pilot thực địa.

Ảnh sầu riêng: Sodanie Chea, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Durian_(8425934020).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Ảnh được hiển thị trong giao diện và dùng làm tệp minh họa.

## Trình chiếu

Mở deck bằng PowerPoint desktop, nhấn F5 rồi dùng Space hoặc mũi tên phải để chuyển từng bước. Bấm vào khung video để phát. Nếu video không phát trên máy trình chiếu, mở file MP4 dự phòng. Hãy thử Morph và video trên máy sẽ dùng để thi; playback native trong PowerPoint chưa được xác nhận tại đây.

Kết thúc bài pitch ở slide 59 của bản Morph hoặc slide 19 của bản Core. Phụ lục AI ở slide 60 / 20 dùng khi hỏi đáp, không nằm trong thời lượng 10 phút.

Nền deck, màu xanh, typography, video và các object Morph giữ theo bản trước. Nội dung quản lý và bên mua dùng giao diện ngày 28/09/2026. Phần chính mô tả AI thử nghiệm và yêu cầu chuyên gia đối chiếu. Phụ lục giữ đầy đủ kết quả: model cũ đạt 85,38% trên DurianLDD cùng nguồn và 39,6% (80/202 ảnh) trên ba nhãn đối chiếu Mendeley Data v2, Phomopsis 0/59; candidate Colab đạt 35,6% và chưa được promote. Chưa có đánh giá theo vườn/cây; chưa xác nhận model hash trên Render. [Giao thức và giới hạn](../../review/ai-training/MENDELEY_EXTERNAL_EVAL.md).
