# Audit dataset lá sầu riêng — 29/09/2026

## Source phù hợp five-class hiện tại

[DurianLDD, ĐứcThắng123 / cthng123](https://www.kaggle.com/datasets/cthng123/durian-leaf-disease-dataset), version 1, cập nhật 29/01/2025. Public metadata API xác nhận 49.808.769 bytes và **CC BY 4.0**. Dataset công bố 4.437 ảnh, chụp bằng điện thoại trực tiếp tại vườn miền Đông Nam Bộ Việt Nam; hai chuyên gia gán nhãn độc lập và loại mẫu bất đồng. Đây là mô tả của tác giả, chưa phải kiểm chứng độc lập của repository này.

Classes gốc: `ALGAL_LEAF_SPOT`, `ALLOCARIDARA_ATTACK`, `HEALTHY_LEAF`, `LEAF_BLIGHT`, `PHOMOPSIS_LEAF_SPOT`. Pipeline phải khóa thứ tự production: healthy, algal, blight, phomopsis, allocaridara; không dùng thứ tự alphabetical mặc định.

Ảnh được resize 224×224 JPG. Tác giả chia random train/validation/test 70/10/20; không công bố orchard/tree/leaf ID. Cùng lá hoặc cùng cây có thể xuất hiện ở nhiều split. Vì vậy pipeline phải deduplicate trước khi chia split và không gọi kết quả image-level là kết quả trên vườn mới.

[Paper gốc, Nguyen-Tat & Nong, Displays 93 (2026), 103451](https://www.sciencedirect.com/science/article/abs/pii/S0141938226001149). Accuracy 93,82% trong paper là kết quả của tác giả, **không phải kết quả model trong repository**.

## Source khác taxonomy

[Mendeley pxzvksbwnj, version 4, DOI 10.17632/pxzvksbwnj.4](https://data.mendeley.com/datasets/pxzvksbwnj/4), 182.920.568 bytes, **CC BY 4.0**, 2.595 ảnh. Six-class: Healthy 484, Algal 462, Colletotrichum 400, Phomopsis 411, Rhizoctonia 398, Blight 440.

[Paper mô tả](https://pmc.ncbi.nlm.nih.gov/articles/PMC12272783/): thu tháng 1/2025 từ bốn vườn tại Bình Phước/Tiền Giang; iPhone 14, Ri6/Monthong; crop và resize 400×400; train/val/test 1814/387/394. Nhãn dựa triệu chứng và expert review, không có xác nhận xét nghiệm tác nhân. `Blight` bao gồm nguyên nhân chưa xác định. Dataset này không có Allocari­dara. **Không map Colletotrichum/Rhizoctonia vào class có sẵn để giả tính tương thích.**

DOI `10.1016/j.dib.2022.108320` được một benchmark durian trích dẫn sai: thực tế là [nghiên cứu bạo lực giới tại Colombia](https://pubmed.ncbi.nlm.nih.gov/35707245/). Không dùng làm provenance dataset lá.

## License và giới hạn

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) cho phép copy, sửa đổi và sử dụng thương mại với attribution, link license và mô tả thay đổi. Candidate/model card phải giữ tên tác giả, dataset/version và thay đổi preprocessing/split. Public access không tự chứng minh nguồn của mọi ảnh; nếu có nội dung bên thứ ba phải kiểm quyền tương ứng.

Không dùng `ml/dataset.csv` và `ml/disease_dataset.csv` synthetic như ground truth ngoài thực tế. Không retrain OCR khi chưa có corpus tài liệu được phép dùng cùng nhãn thật và test set độc lập.

## Lỗi preprocessing cần sửa cho lần train kế tiếp

Notebook hiện tại truyền RGB `/255` vào Keras MobileNetV3Small `include_preprocessing=False`. [Keras documentation](https://keras.io/api/applications/mobilenet/mobilenet_models/) yêu cầu `[-1, 1]` khi tắt preprocessing. Đặt layer `Rescaling(2, offset=-1)` **bên trong candidate mới**, vẫn giữ external RGB `[0,1]`. Không thay preprocessing production model cũ khi chưa có parity/evaluation; model cũ có thể đã học trên contract sai.

## Gate trước production

Chỉ lưu candidate vào `tmp/ai-training`. SHA256 khóa archive, từng ảnh và manifest; remove ảnh trùng byte/pixel, group near-duplicate trước split; checkpoint/temperature/abstention chỉ chọn bằng validation; test dùng đúng một lần sau khi khóa lựa chọn. Báo accuracy, macro-F1, per-class recall, confusion matrix, NLL/Brier/ECE và coverage/accuracy sau abstention. Confidence cao không chứng minh ảnh là lá sầu riêng; cần corpus ngoài taxonomy, ảnh mờ và field test theo orchard/tree độc lập trước claim thực tế hoặc tự động xác nhận.
