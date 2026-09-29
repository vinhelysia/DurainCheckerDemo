# Train candidate lá sầu riêng

Nguồn, license và giới hạn: [dataset audit](../submission/review/ai-training/DATASET_AUDIT.md). Giữ attribution ĐứcThắng123 / Thien B. Nguyen-Tat / Duc Thang Nong, DurianLDD version 1, CC BY 4.0. Thay đổi: dedup/group holdout, ImageNet preprocessing, fine-tune MobileNetV3Small và calibration validation.

Chạy tại project root, dùng Python 3.12. Dependencies riêng cho leaf training: `torch==2.8.0`, `torchvision==0.23.0` từ official cu128 index, `onnx==1.19.0`, `onnxruntime==1.23.0`, numpy/Pillow do torchvision cài. Không thêm vào backend runtime.

```powershell
python -m venv tmp/ai-training/venv
tmp/ai-training/venv/Scripts/python.exe -m pip install torch==2.8.0 torchvision==0.23.0 --index-url https://download.pytorch.org/whl/cu128
tmp/ai-training/venv/Scripts/python.exe -m pip install onnx==1.19.0 onnxruntime==1.23.0
Invoke-WebRequest 'https://www.kaggle.com/api/v1/datasets/download/cthng123/durian-leaf-disease-dataset?datasetVersionNumber=1' -OutFile tmp/ai-training/durian-leaf-v1.zip
Get-FileHash tmp/ai-training/durian-leaf-v1.zip -Algorithm SHA256
Expand-Archive tmp/ai-training/durian-leaf-v1.zip tmp/ai-training/dataset
tmp/ai-training/venv/Scripts/python.exe ml/leaf_training.py self-check
tmp/ai-training/venv/Scripts/python.exe ml/leaf_training.py prepare
$env:TORCH_HOME = "$PWD/tmp/ai-training/torch-cache"
tmp/ai-training/venv/Scripts/python.exe ml/leaf_training.py train --epochs 12 --minutes 12
```

Archive kiểm 29/09/2026: `d90b6f9d856d3f48016d78a205bc028d113e848fce1e07a072d1fe03ae0ce3bd`. Phải dừng nếu hash đổi, xác minh version/source trước khi dùng. CLI không tải dataset tự động; `prepare` khóa hash archive + từng ảnh + manifest; `train` kiểm integrity trước training. Không giải CAPTCHA hoặc tải qua account không được phép.

Source split được giữ. Exact RGB pixel duplicates bị loại, dHash 64-bit distance ≤4 tạo group. Nếu group nằm ở nhiều split thì giữ test trước validation trước train; loại ảnh ở split thấp hơn. Near-duplicate heuristic không đảm bảo phát hiện mọi ảnh cùng lá/cây. Không có orchard/tree ID để chứng minh độc lập theo vườn.

Hai epoch đầu train classifier; các epoch còn lại fine-tune bốn feature blocks cuối, BatchNorm statistics cố định. Chọn checkpoint theo validation macro-F1. Temperature và confidence/margin threshold dùng cùng validation (có selection optimism); threshold yêu cầu Wilson lower bound 95% của accepted accuracy ≥90% trên ≥30 mẫu. Test chỉ evaluate sau khi khóa config. Pipeline từ chối rerun test khi metrics đã tồn tại.

Artifacts trong `tmp/ai-training/run-1`: locked manifest, config, epoch history, checkpoint, metrics/predictions, candidate ONNX và parity result. ONNX nhận float32 NHWC RGB `[0,1]`, reshape + ImageNet normalize trong graph, trả five-class calibrated softmax theo thứ tự production. Artifact không tự thay production. Cùng API contract không đủ để promote; cần kiểm ngoài taxonomy, field test mới và chuyên gia review. `self-check` dùng ảnh/records tạo tại runtime để kiểm holdout priority, leakage, metrics và notebook preprocessing; không giả metrics training.

`ml/train.py` / `ml/train_disease.py` chỉ là demo synthetic: stratified 60/20/20, chọn model bằng validation, test một lần, output tmp candidate. Chúng không đo Cd, không chứng minh disease risk ngoài thực tế và không overwrite API model.

## Fine-tune trên Colab

Mở [notebook Colab](durian_leaf_colab_reproduce.ipynb), chọn **T4 GPU / runtime 2025.10**, chạy bốn code cells theo thứ tự. Notebook khóa dependency versions, SHA256 pipeline/dataset và tự tải dataset public; không cần mount Drive. Cell cuối tải ZIP gồm checkpoint, ONNX, log và metrics.

Cấu hình: tối đa **24 epochs**, seed 1337, batch 64, giới hạn 30 phút; early stopping sau bốn epochs không cải thiện validation macro-F1. `--validation-only` chỉ load train/validation, không evaluate test hoặc baseline, không fit temperature/threshold. ONNX xuất với temperature 1, score chưa calibration.

Test cũ đã được xem ở lượt 12 epochs; lượt này chỉ là tuning trên validation, không phải bằng chứng accuracy mới trên dữ liệu độc lập. Cần holdout mới trước khi quyết định thay model production. Notebook kiểm protocol và không có test/baseline metrics trước khi tải artifacts.

Lượt Colab 29/09/2026 đã hoàn tất trên Tesla T4: dừng sau 23 epochs, chọn epoch 19, validation accuracy 85,33% và macro-F1 0,8499 trên 443 ảnh. [Báo cáo và artifact checks](../submission/review/ai-training/colab-validation-24/README.md). Candidate ONNX chưa được đưa vào production.

[External check trên Mendeley Data v2](../submission/review/ai-training/MENDELEY_EXTERNAL_EVAL.md): 72/202 ảnh đúng (35,6%) trong ba class đối chiếu sau sàng lọc ảnh gần trùng. Kết quả này không đủ để promote candidate; cần dữ liệu thực địa có nhãn xác nhận và holdout mới theo vườn/cây.
