# Colab leaf candidate — 29/09/2026

[Executed Colab notebook](https://colab.research.google.com/drive/1uBulFs99ehLKmqRAECy3fHu24sAUVOBe) · [Screenshot](colab-validation-result.png) · [Validation metrics](metrics.json) · [History](history.json) · [ONNX export check](export.json)

MobileNetV3Small was fine-tuned on a free Tesla T4 with PyTorch 2.8.0+cu128. The fixed protocol allowed up to 24 epochs, seed 1337, batch 64, and four stale epochs. Training stopped after **23 epochs** and selected **epoch 19** by validation macro-F1. The 443-image validation split gave **85.33% accuracy** and **0.8499 macro-F1**. See `colab-protocol.json` and `training-config.json` for the exact run settings.

The public DurianLDD v1 dataset (CC BY 4.0; Đức Thắng 123 / Thien B. Nguyen-Tat / Duc Thang Nong) contained 4,437 images; 4 near or exact duplicates were excluded. The locked manifest SHA256 is `afd8dc64cb655767b4afea35a0befe6bc1160d8cb273d481473e178fd3e3ad1f`. Source train/validation/test splits were retained, but orchard or tree IDs were unavailable.

**Evaluation scope:** This was validation-only tuning. The earlier test split had already been inspected in a separate experiment; this run did not evaluate test, baseline, calibrated confidence, or abstention. The candidate is **not deployed**. ONNX CPU output matched PyTorch on five validation examples with maximum absolute difference `2.98e-6`; this checks export consistency, not field accuracy. A new independent holdout and field review are required before promotion.

The complete ZIP, including candidate ONNX/checkpoint, is saved locally at `tmp/ai-training/colab-validation-24/durian-leaf-colab-validation-24.zip` (SHA256 `c08b9a1de970f9f54036e82b887d4ae4d27bf8017c86280b8935bd4301f41515`). The ZIP is intentionally excluded from Git. Its downloaded contents were checked for the expected validation-only keys, 23 epochs, ONNX hash, and parity status.
