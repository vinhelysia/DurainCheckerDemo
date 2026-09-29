# External check cho leaf candidate — 29/09/2026

## Nguồn và quyền dùng

[Nguyen Thanh Truong và Nguyen Xuan Linh, *A Vietnamese Durian Leaf Disease Image Dataset for Agricultural Diagnosis*, Mendeley Data v2](https://data.mendeley.com/datasets/pxzvksbwnj/2), DOI [10.17632/pxzvksbwnj.2](https://doi.org/10.17632/pxzvksbwnj.2), công bố 10/04/2025, **CC BY 4.0**. [License](https://creativecommons.org/licenses/by/4.0/) cho phép sử dụng và chỉnh sửa, kể cả thương mại, khi ghi công, dẫn license và nêu thay đổi. [Ảnh chụp metadata/license](mendeley-license-v2.png). Dataset đã được tác giả chia `train/validation/test`; phép đo này chỉ dùng `test`.

Archive gốc 334.201.946 bytes, SHA256 `5e271cfd89e8a738ef760aa48bb1081e68e0f6f2c53e689566a7920a09be8dce`. File lưu local trong `tmp/ai-training/mendeley-pxzvksbwnj-v2.zip`, không đưa ảnh lên Git. Đã kiểm ZIP CRC; không có entry hỏng. Ảnh được đọc theo EXIF và resize 224×224 để đưa vào ONNX. Đây là thay đổi preprocessing cho phép đo, không sửa ảnh gốc.

## Giao thức

Model được khóa trước khi tải dữ liệu này: ONNX từ [lượt Colab 24 epochs tối đa](colab-validation-24/README.md), SHA256 `35ba652c6e88232819387b6c9757cc4e6db97a3ea58f00259fe5aa764f361e21`. Không fine-tune, chọn threshold hay đổi model theo kết quả Mendeley. Script: [`ml/external_leaf_eval.py`](../../../ml/external_leaf_eval.py); [kết quả JSON](mendeley-v2-external-test.json).

Chỉ đối chiếu ba nhãn đủ gần về tên: `Leaf_Healthy` → `HEALTHY_LEAF`, `Leaf_Algal` → `ALGAL_LEAF_SPOT`, `Leaf_Phomopsis` → `PHOMOPSIS_LEAF_SPOT`. Không ép `Colletotrichum`, `Rhizoctonia` và `Blight` vào taxonomy năm lớp hiện tại. Ba nhãn được chọn có 207 ảnh trong source test. So với manifest DurianLDD đã dùng để train/validate, không thấy ảnh trùng pixel, nhưng loại 4 ảnh có dHash distance ≤4; loại thêm 1 ảnh gần trùng trong chính tập external đã chọn. Còn 202 ảnh. dHash là heuristic, không chứng minh độc lập theo cây/vườn.

## Kết quả

| Nhãn gốc đối chiếu | Đúng / số ảnh | Recall |
| --- | ---: | ---: |
| Healthy | 24 / 73 | 32,9% |
| Algal | 31 / 70 | 44,3% |
| Phomopsis | 17 / 59 | 28,8% |
| **Tổng ba nhãn** | **72 / 202** | **Accuracy 35,6%** |

Đây là **accuracy trên ba nhãn được map của nguồn khác**, không phải accuracy năm lớp hay kết quả thử nghiệm tại vườn. Validation nội bộ của lượt Colab là 85,33% trên 443 ảnh DurianLDD, nhưng chênh lệch với external check cho thấy khả năng chuyển sang nguồn ảnh khác kém. Khác biệt quy trình chụp/crop, nhãn bệnh và quần thể cây có thể góp phần; phép đo này không xác định nguyên nhân riêng lẻ. Model không có lớp `unknown` và có thể gán nhãn sai cho ảnh ngoài taxonomy.

**Quyết định:** không đưa candidate này vào production và không dùng điểm Mendeley vừa xem để tune rồi gọi lại là independent test. Muốn cải thiện để dùng thật: thu ảnh mới có quyền sử dụng và nhãn được chuyên gia xác nhận, bổ sung ảnh ngoài taxonomy/ảnh chất lượng kém, chia holdout theo vườn hoặc cây, rồi đánh giá lại một lần trên holdout mới. Cần giữ thao tác nhập tay/kiểm tra chuyên gia khi model không đủ tin cậy.

Chạy lại từ project root (cần Python với `numpy`, `Pillow`, `onnxruntime`):

```powershell
python ml/external_leaf_eval.py --dataset tmp/ai-training/mendeley-pxzvksbwnj-v2.zip --candidate tmp/ai-training/colab-validation-24/durian-leaf-colab-validation-24.zip --output submission/review/ai-training/mendeley-v2-external-test.json
```
