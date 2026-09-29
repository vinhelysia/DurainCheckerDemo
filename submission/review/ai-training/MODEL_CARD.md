# Model card: leaf candidate — 29/09/2026

**Kết luận: không promote.** Candidate không vượt baseline theo gate validation đã đặt; giữ model cũ và yêu cầu manual review. Training thật có kết quả thấp hơn, không gọi đây là cải thiện accuracy. Baseline có provenance training chưa biết và có thể đã thấy ảnh source holdout; số baseline dưới đây chỉ là so sánh mô tả, không xác nhận hiệu năng độc lập của model cũ.

## Dataset / training

[DurianLDD v1, cthng123](https://www.kaggle.com/datasets/cthng123/durian-leaf-disease-dataset), CC BY 4.0. Attribution: ĐứcThắng123, Thien B. Nguyen-Tat, Duc Thang Nong; [paper gốc](https://www.sciencedirect.com/science/article/abs/pii/S0141938226001149). 4.437 ảnh thật theo tác giả; 4.433 ảnh sau dedup. Original train/val/test: 3104/443/890; retained: **3101/443/889**. Loại ba train near-duplicates vượt split và một test exact duplicate; đã nhìn kiểm hai cặp near-duplicate thấy cùng lá/khung cảnh. Exact pixel + dHash distance≤4 vẫn có thể bỏ sót cùng cây/lá. Không có orchard/tree ID; kết quả chỉ là image holdout từ cùng source, chưa phải field test.

RTX 4060 Laptop 8GB; PyTorch 2.8.0+cu128 / torchvision 0.23.0+cu128; pretrained MobileNetV3Small ImageNet1K_V1. Seed 1337, batch64, 12 epochs, training khoảng210 giây sau load/model setup. Hai epoch classifier-only; sau đó fine-tune bốn feature blocks cuối, BatchNorm stats cố định. Chọn epoch12 bằng **validation macro-F1**. Test dùng sau khi khóa config, không dùng để chọn epoch/hyperparameters; không train thêm sau test.

External input float32 NHWC RGB `[0,1]`, 224×224 BILINEAR/EXIF orientation; NCHW + ImageNet mean/std nằm trong graph. Output order: healthy, algal, leaf blight, phomopsis, allocaridara. Không có class unknown/non-leaf; softmax confidence không đủ phát hiện ngoài taxonomy.

## Kết quả thật

| Split / model | Accuracy | Macro-F1 | NLL | Brier | ECE (10 bins) |
|---|---:|---:|---:|---:|---:|
| Validation candidate (443) | 82.84% | 0.8244 | 0.4736 | 0.2486 | 0.0228 |
| Validation baseline (443) | 87.58% | 0.8726 | 0.4180 | 0.2029 | 0.0385 |
| Test candidate (889) | 82.34% | 0.8202 | 0.4804 | 0.2508 | 0.0207 |
| Test baseline (889) | 85.38% | 0.8509 | 0.4161 | 0.2104 | 0.0473 |

Gate: validation macro-F1 phải tăng≥0.02 và không class validation recall giảm>0.05. Thực tế macro-F1 giảm0.0482, Healthy recall giảm0.0928 và Algal giảm0.0822. **Gate fail.** ECE nhỏ hơn baseline không bù việc classification kém hơn.

| Class | Candidate val recall | Baseline val recall | Candidate test recall | Baseline test recall |
|---|---:|---:|---:|---:|
| HEALTHY_LEAF | 89.69% | 98.97% | 91.33% | 97.45% |
| ALGAL_LEAF_SPOT | 76.71% | 84.93% | 80.27% | 89.12% |
| LEAF_BLIGHT | 85.11% | 87.23% | 79.68% | 80.75% |
| PHOMOPSIS_LEAF_SPOT | 70.45% | 70.45% | 69.89% | 66.48% |
| ALLOCARIDARA_ATTACK | 90.11% | 94.51% | 89.07% | 92.35% |

Confusion matrix candidate test, rows=true / columns=predicted; columns theo fixed class order phía trên:

| True class | Healthy | Algal | Blight | Phomopsis | Allocari­dara |
|---|---:|---:|---:|---:|---:|
| HEALTHY_LEAF | 179 | 3 | 6 | 7 | 1 |
| ALGAL_LEAF_SPOT | 6 | 118 | 4 | 6 | 13 |
| LEAF_BLIGHT | 13 | 10 | 149 | 11 | 4 |
| PHOMOPSIS_LEAF_SPOT | 24 | 10 | 10 | 123 | 9 |
| ALLOCARIDARA_ATTACK | 5 | 6 | 5 | 4 | 163 |

## Calibration / abstention

Temperature search trên validation chọn **T=1.0**: không đổi raw probabilities và **không có calibration gain**. Fit trên cùng validation chọn checkpoint nên validation calibration có selection optimism; test vẫn là final heldout của candidate.

Threshold confidence≥0.76 và top1-top2 margin≥0.2 được chọn bằng validation với Wilson lower bound95% accepted accuracy≥90%, tối thiểu30 mẫu. Validation giữ303/443 (68.40%), accepted accuracy93.73%. Locked policy trên test giữ631/889 (70.98%), accepted accuracy93.19%; 258 ảnh (29.02%) abstain. Đây là selective accuracy **chỉ trong five-class dataset**, không chứng minh xử lý non-leaf, disease mới, nhiều bệnh hoặc tài liệu. Trong sản phẩm mọi diagnosis vẫn cần manual review; không lấy threshold này để tự xác nhận.

Baseline dùng threshold0.8/margin0.2 cho số mô tả; khác threshold candidate nên không coi selective metrics là comparison có cùng operating point.

## Export / artifact

Candidate ONNX: `tmp/ai-training/run-1/candidate.onnx`, 6.108.597 bytes, **không thay API model**. Lần export đầu fail parity do outer wrapper ở training mode, làm bật lại Dropout/BatchNorm khi exporter restore mode. Đã sửa outer `.eval()` và force eval trước parity. Re-export từ checkpoint giữ nguyên, không retrain và không evaluate candidate test lần nữa.

PyTorchCPU↔ONNXCPU max absolute probability difference **1.31e-6** trên5validationảnh; tất cả modules eval. So với logits validation GPU đã lưu, max probability difference0.00362 và logit difference0.01785 trên5ảnh. Metrics training/test ở bảng là checkpoint GPU, không phải full-test ONNX benchmark. Vì candidate không được promote, không thêm test evaluation cho mục đích tuning/export.

Archive SHA256: `d90b6f9d856d3f48016d78a205bc028d113e848fce1e07a072d1fe03ae0ce3bd`

Manifest SHA256: `4ecbefbaf4759d9c6e817390b5eb818f28bc0a0fc964286dfac98e99b4f8317f`

Candidate ONNX SHA256: `1e277e7793822a7990898ea6c3121f4e09979ab7f9cd3c0a1aefdc49f887cbde`

Baseline ONNX SHA256: `2b61ebcc9bd9c993e6071500d88c2aed5467c4eba19a15053d6010ee7a23c8f4`

Pretrained weights: `mobilenet_v3_small-047dcff4.pth`, SHA256 `047dcff4addef86ea5bc2eff13c9614dc11f47ab1160d0a71a25e7db994f4e1f`.

Artifacts đủ trong local ignored `tmp/ai-training/run-1`: manifest/config/history/checkpoint/predictions/metrics/export. Metrics đầy đủ cùng baseline warning, exclusions và hash được lưu tại [metrics.json](metrics.json); môi trường [environment.txt](environment.txt); lệnh tái lập [LEAF_TRAINING.md](../../../ml/LEAF_TRAINING.md). Self-check đã pass, Python source compile pass. Hai synthetic tabular scripts đã sửa leakage/output candidate; **không rerun synthetic training** và không dùng làm ground truth Cd/disease ngoài thực tế.

Trước lần nghiên cứu tiếp theo: đặt protocol mới trước khi train; thu expert-reviewed field/OOD corpus có orchard/tree/leaf IDs và test mới. Không tối ưu tiếp bằng kết quả test đã nhìn thấy của run này.
