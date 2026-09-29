"""Reproducible leaf candidate: prepare -> train. Never writes production models."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import random
import time
from zipfile import ZipFile

import numpy as np
from PIL import Image, ImageOps

CLASSES = ["HEALTHY_LEAF", "ALGAL_LEAF_SPOT", "LEAF_BLIGHT",
           "PHOMOPSIS_LEAF_SPOT", "ALLOCARIDARA_ATTACK"]
SPLITS = ["train", "val", "test"]
SOURCE = "https://www.kaggle.com/datasets/cthng123/durian-leaf-disease-dataset"
ARCHIVE_SHA256 = "d90b6f9d856d3f48016d78a205bc028d113e848fce1e07a072d1fe03ae0ce3bd"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, data):
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def image_hashes(path):
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        pixel_hash = hashlib.sha256(str(image.size).encode() + image.tobytes()).hexdigest()
        small = np.asarray(image.convert("L").resize((9, 8), Image.Resampling.LANCZOS))
        dhash = sum(int(bit) << i for i, bit in enumerate((small[:, 1:] > small[:, :-1]).ravel()))
    return pixel_hash, dhash


def deduplicate(records, radius=4):
    """Preserve source test over validation over train; groups never cross splits."""
    parent = list(range(len(records)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    # ponytail: O(n²) for this 4,437-image dataset; use a BK-tree for much larger corpora.
    for i, a in enumerate(records):
        for j in range(i):
            b = records[j]
            if a["pixel_sha256"] == b["pixel_sha256"] or (a["dhash"] ^ b["dhash"]).bit_count() <= radius:
                parent[find(i)] = find(j)
    groups = defaultdict(list)
    for i, record in enumerate(records):
        groups[find(i)].append(record)
    kept, excluded = [], []
    for members in groups.values():
        split = max((r["split"] for r in members), key=SPLITS.index)
        exact = {}
        for record in sorted(members, key=lambda r: (-SPLITS.index(r["split"]), r["path"])):
            previous = exact.get(record["pixel_sha256"])
            if previous and previous["label"] != record["label"]:
                raise ValueError(f"Identical pixels have conflicting labels: {previous['path']} / {record['path']}")
            exact[record["pixel_sha256"]] = previous or record
            if previous or record["split"] != split:
                excluded.append({**record, "reason": "exact_duplicate" if previous else "near_duplicate_cross_split"})
            else:
                kept.append({**record, "group": members[0]["path"]})
    return kept, excluded


def check_manifest(manifest):
    if manifest["classes"] != CLASSES or not manifest["records"]:
        raise ValueError("Empty dataset or wrong class order")
    groups, pixels, paths = {}, set(), set()
    counts = Counter()
    for record in manifest["records"]:
        if record["split"] not in SPLITS or record["label"] not in CLASSES:
            raise ValueError("Unknown split/class")
        if record["pixel_sha256"] in pixels or record["path"] in paths:
            raise ValueError("Duplicate image in manifest")
        pixels.add(record["pixel_sha256"])
        paths.add(record["path"])
        if groups.setdefault(record["group"], record["split"]) != record["split"]:
            raise ValueError("Near-duplicate leakage between splits")
        counts[record["split"], record["label"]] += 1
    if any(counts[s, c] == 0 for s in SPLITS for c in CLASSES):
        raise ValueError("Each split must contain every class")
    return {s: {c: counts[s, c] for c in CLASSES} for s in SPLITS}


def prepare(args):
    root, output = args.dataset.resolve(), args.output.resolve()
    if sha(args.archive) != ARCHIVE_SHA256:
        raise ValueError("Unexpected source archive: re-audit license/version before changing the locked SHA256")
    output.mkdir(parents=True, exist_ok=True)
    target = output / "manifest.json"
    if target.exists():
        raise ValueError("Manifest is locked: use a new output directory to prepare another dataset")
    records = []
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        label, source_split = path.parent.name, path.parent.parent.name.lower()
        split = "val" if source_split in {"val", "valid", "validation"} else source_split
        if label not in CLASSES or split not in SPLITS:
            raise ValueError(f"Unexpected class/split folder: {path}")
        pixel, dhash = image_hashes(path)
        records.append({"path": path.relative_to(root).as_posix(), "label": label, "split": split,
                        "sha256": sha(path), "pixel_sha256": pixel, "dhash": dhash})
    with ZipFile(args.archive) as archive:
        if set(archive.namelist()) != {r["path"] for r in records}:
            raise ValueError("Dataset file list differs from the source archive")
        for record in records:
            if hashlib.sha256(archive.read(record["path"])).hexdigest() != record["sha256"]:
                raise ValueError(f"Dataset image differs from source archive: {record['path']}")
    kept, excluded = deduplicate(records)
    manifest = {"source": SOURCE, "version": 1, "license": "CC BY 4.0", "classes": CLASSES,
                "archive_sha256": sha(args.archive), "source_images": len(records),
                "deduplication": "exact RGB pixels + 64-bit dHash Hamming <=4; holdout-priority groups",
                "split_policy": "Source splits preserved; discard cross-split group members from lower-priority splits",
                "orchard_tree_leaf_ids": "not provided; image holdout only, no independent-orchard claim",
                "records": kept, "excluded": excluded}
    manifest["counts"] = check_manifest(manifest)
    save(target, manifest)
    (output / "manifest.sha256").write_text(sha(target) + "\n", encoding="ascii")
    print(json.dumps({"images": len(records), "kept": len(kept), "excluded": len(excluded),
                      "counts": manifest["counts"], "manifest_sha256": sha(target)}, indent=2), flush=True)


def metrics(probabilities, labels, threshold=0.0, margin=0.0):
    if (probabilities.shape != (len(labels), len(CLASSES)) or not len(labels)
            or not np.isfinite(probabilities).all() or (probabilities < 0).any()
            or not np.allclose(probabilities.sum(1), 1, atol=1e-5)):
        raise ValueError("Metrics require finite five-class probability distributions and non-empty labels")
    predictions = probabilities.argmax(1)
    cm = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
    for truth, prediction in zip(labels, predictions):
        cm[truth, prediction] += 1
    recall = np.diag(cm) / np.maximum(cm.sum(1), 1)
    precision = np.diag(cm) / np.maximum(cm.sum(0), 1)
    f1 = 2 * recall * precision / np.maximum(recall + precision, 1e-12)
    confidence = probabilities.max(1)
    correct = predictions == labels
    ece = 0.0
    for low in np.linspace(0, .9, 10):
        mask = (confidence >= low) & ((confidence < low + .1) if low < .9 else (confidence <= 1))
        if mask.any():
            ece += mask.mean() * abs(correct[mask].mean() - confidence[mask].mean())
    sorted_probs = np.sort(probabilities, axis=1)
    accepted = (confidence >= threshold) & ((sorted_probs[:, -1] - sorted_probs[:, -2]) >= margin)
    return {"n": len(labels), "accuracy": float(correct.mean()), "macro_f1": float(f1.mean()),
            "per_class_recall": dict(zip(CLASSES, recall.tolist())), "confusion_matrix": cm.tolist(),
            "nll": float(-np.log(np.maximum(probabilities[np.arange(len(labels)), labels], 1e-12)).mean()),
            "brier": float(np.square(probabilities - np.eye(len(CLASSES))[labels]).sum(1).mean()),
            "ece_10_bins": float(ece), "abstention": {"threshold": threshold, "margin": margin,
            "accepted": int(accepted.sum()), "coverage": float(accepted.mean()),
            "accepted_accuracy": float(correct[accepted].mean()) if accepted.any() else None}}


def wilson_lower(correct, total):
    if not total:
        return 0.0
    z = 1.96
    p = correct / total
    return (p + z*z/(2*total) - z * math.sqrt(p*(1-p)/total + z*z/(4*total*total))) / (1 + z*z/total)


def train(args):
    import os
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    import torch
    from torchvision import models, transforms
    from torch.utils.data import Dataset, DataLoader
    import onnxruntime as ort

    out, root = args.output.resolve(), args.dataset.resolve()
    manifest_path = out / "manifest.json"
    if sha(manifest_path) != (out / "manifest.sha256").read_text().strip():
        raise ValueError("Manifest changed after locking")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    check_manifest(manifest)
    if sha(args.archive) != manifest["archive_sha256"]:
        raise ValueError("Archive changed after locking")
    for record in manifest["records"]:
        path = (root / record["path"]).resolve()
        if not path.is_relative_to(root) or sha(path) != record["sha256"]:
            raise ValueError(f"Image changed or escaped dataset root: {record['path']}")
    if args.epochs < 2 or args.batch_size < 1 or args.minutes <= 0:
        raise ValueError("Require epochs >=2, positive batch size and time budget")
    if (out / "metrics.json").exists():
        raise ValueError("This run already has metrics. Preserve it; use a new run directory for a deliberate new protocol.")
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(4)
    torch.use_deterministic_algorithms(True, warn_only=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type != "cuda":
        raise RuntimeError("This local training run requires CUDA; no silent slow CPU fallback")
    torch.backends.cudnn.benchmark = False
    print(f"GPU: {torch.cuda.get_device_name(0)}; torch {torch.__version__}", flush=True)

    class LeafDataset(Dataset):
        def __init__(self, split):
            self.records = [r for r in manifest["records"] if r["split"] == split]
            self.images = []
            for record in self.records:
                with Image.open(root / record["path"]) as image:
                    self.images.append(ImageOps.exif_transpose(image).convert("RGB").resize((224, 224), Image.Resampling.BILINEAR))
            augmentation = [transforms.RandomHorizontalFlip(), transforms.RandomRotation(10),
                            transforms.ColorJitter(brightness=.1, contrast=.1, saturation=.1)] if split == "train" else []
            self.transform = transforms.Compose(augmentation + [transforms.ToTensor()])
        def __len__(self):
            return len(self.records)
        def __getitem__(self, index):
            return self.transform(self.images[index]).permute(1, 2, 0), CLASSES.index(self.records[index]["label"])

    active_splits = ["train", "val"] if args.validation_only else SPLITS
    datasets = {s: LeafDataset(s) for s in active_splits}
    loaders = {s: DataLoader(datasets[s], batch_size=args.batch_size, shuffle=s == "train", num_workers=0) for s in active_splits}
    backbone = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    backbone.classifier[-1] = torch.nn.Linear(backbone.classifier[-1].in_features, len(CLASSES))

    class Candidate(torch.nn.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model
            self.register_buffer("mean", torch.tensor([.485, .456, .406]).reshape(1, 3, 1, 1))
            self.register_buffer("std", torch.tensor([.229, .224, .225]).reshape(1, 3, 1, 1))
        def forward(self, rgb):
            return self.model((rgb.permute(0, 3, 1, 2) - self.mean) / self.std)

    model = Candidate(backbone).to(device)
    for parameter in backbone.features.parameters():
        parameter.requires_grad = False
    counts = Counter(r["label"] for r in datasets["train"].records)
    weights = torch.tensor([len(datasets["train"])/(len(CLASSES)*counts[c]) for c in CLASSES], device=device)
    criterion = torch.nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3, weight_decay=1e-4)

    def predict(loader):
        model.eval()
        logits, labels = [], []
        with torch.inference_mode():
            for images, targets in loader:
                logits.append(model(images.to(device)).cpu())
                labels.append(targets)
        return torch.cat(logits), torch.cat(labels).numpy()

    best, stale, history = -1.0, 0, []
    started = time.monotonic()
    checkpoint = out / "candidate.pt"
    for epoch in range(args.epochs):
        if epoch == 2:
            for parameter in backbone.features[-4:].parameters():
                parameter.requires_grad = True
            optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=3e-5, weight_decay=1e-4)
        model.train()
        # Keep pretrained batch statistics fixed for this small dataset.
        for layer in model.modules():
            if isinstance(layer, torch.nn.BatchNorm2d):
                layer.eval()
        losses = []
        for images, targets in loaders["train"]:
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images.to(device)), targets.to(device))
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach()))
        logits, labels = predict(loaders["val"])
        report = metrics(logits.softmax(1).numpy(), labels)
        item = {"epoch": epoch + 1, "train_loss": float(np.mean(losses)), "val_accuracy": report["accuracy"],
                "val_macro_f1": report["macro_f1"], "elapsed_seconds": time.monotonic() - started}
        history.append(item)
        save(out / "history.json", history)
        print(json.dumps(item), flush=True)
        if report["macro_f1"] > best:
            best, stale = report["macro_f1"], 0
            torch.save({"state_dict": model.state_dict(), "epoch": epoch + 1}, checkpoint)
        else:
            stale += 1
        if epoch >= 3 and (stale >= 4 or time.monotonic() - started >= args.minutes * 60):
            break
    selected = torch.load(checkpoint, map_location=device, weights_only=True)
    model.load_state_dict(selected["state_dict"])
    val_logits, val_labels = predict(loaders["val"])
    temperature, threshold, margin = 1.0, None, None
    if not args.validation_only:
        temperature = min(np.linspace(.5, 3.0, 51), key=lambda t: metrics((val_logits/t).softmax(1).numpy(), val_labels)["nll"])
        val_probs = (val_logits/temperature).softmax(1).numpy()
        threshold, margin = 1.01, .2
        for value in np.linspace(.5, .99, 50):
            ordered = np.sort(val_probs, axis=1)
            accepted = (ordered[:, -1] >= value) & (ordered[:, -1] - ordered[:, -2] >= margin)
            successes = int((val_probs.argmax(1)[accepted] == val_labels[accepted]).sum())
            if accepted.sum() >= 30 and wilson_lower(successes, int(accepted.sum())) >= .9:
                threshold = float(value)
                break
    config = {"seed": args.seed, "epochs_limit": args.epochs, "batch_size": args.batch_size, "minutes": args.minutes,
              "selected_epoch": selected["epoch"], "temperature": float(temperature), "confidence_threshold": threshold,
              "margin_threshold": margin, "validation_only": args.validation_only,
              "selection": "validation macro-F1 only" if args.validation_only else "validation macro-F1; temperature/threshold validation only",
              "manifest_sha256": sha(manifest_path), "input": "float32 NHWC RGB [0,1] 1x224x224x3",
              "backbone": "torchvision MobileNetV3Small ImageNet1K_V1", "torch": torch.__version__}
    save(out / "training-config.json", config)
    if args.validation_only:
        validation = metrics(val_logits.softmax(1).numpy(), val_labels)
        validation.pop("abstention")
        result = {"validation_raw": validation, "config": config,
                  "evaluation_status": "validation_only; reused test holdout not evaluated",
                  "calibration_status": "not fitted; no selective accuracy or abstention policy evaluated"}
        np.savez_compressed(out / "predictions.npz", val_logits=val_logits.numpy(), val_labels=val_labels)
    else:
        # Configuration is frozen before the first and only candidate test evaluation.
        test_logits, test_labels = predict(loaders["test"])
        test_probs = (test_logits/temperature).softmax(1).numpy()
        result = {"validation_raw": metrics(val_logits.softmax(1).numpy(), val_labels),
                  "validation_calibrated": metrics(val_probs, val_labels, threshold, margin),
                  "test_raw": metrics(test_logits.softmax(1).numpy(), test_labels),
                  "test_calibrated": metrics(test_probs, test_labels, threshold, margin), "config": config}
        np.savez_compressed(out / "predictions.npz", val_logits=val_logits.numpy(), val_labels=val_labels,
                            test_logits=test_logits.numpy(), test_labels=test_labels)
        # Old model provenance is unknown; this comparison cannot prove absence of its test leakage.
        session = ort.InferenceSession(str(args.baseline), providers=["CPUExecutionProvider"])
        for split, labels in [("val", val_labels), ("test", test_labels)]:
            baseline_probs = []
            for index in range(len(datasets[split])):
                pixels = np.asarray(datasets[split].images[index], dtype=np.float32)[None] / 255.0
                baseline_probs.append(session.run(None, {session.get_inputs()[0].name: pixels})[0][0])
            result["baseline_" + ("validation" if split == "val" else "test")] = metrics(np.asarray(baseline_probs), labels, .8, .2)
        result["baseline_model_sha256"] = sha(args.baseline)
        result["baseline_provenance_warning"] = "Existing model training data unknown; possible exposure to this source holdout"
    save(out / "metrics.json", result)

    class Export(torch.nn.Module):
        def __init__(self, trained):
            super().__init__()
            self.trained = trained
        def forward(self, image):
            return torch.softmax(self.trained(image) / float(temperature), dim=1)

    exported = Export(model.cpu()).eval()
    onnx_path = out / "candidate.onnx"
    dummy = torch.zeros(1, 224, 224, 3)
    torch.onnx.export(exported, dummy, str(onnx_path), input_names=["input"], output_names=["probabilities"],
                      opset_version=17, dynamo=False)
    candidate_session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    exported.eval()
    difference = 0.0
    for image in datasets["val"].images[:5]:
        sample = np.asarray(image, dtype=np.float32)[None] / 255.0
        with torch.inference_mode():
            expected = exported(torch.from_numpy(sample)).numpy()
        actual = candidate_session.run(None, {"input": sample})[0]
        difference = max(difference, float(np.abs(expected - actual).max()))
        if difference > 1e-4 or actual.shape != (1, len(CLASSES)) or not np.isfinite(actual).all():
            raise ValueError(f"ONNX parity failed: {difference}")
    save(out / "export.json", {"onnx_sha256": sha(onnx_path), "max_absolute_difference": difference,
                               "validation_samples_checked": 5,
                               "classes": CLASSES, "status": "candidate_only_not_promoted"})
    print(json.dumps(result, indent=2), flush=True)


def self_check():
    records = [{"path": f"{s}/{c}/a.jpg", "label": c, "split": s, "pixel_sha256": f"{s}-{c}",
                "dhash": (i + 1) * 0x123456789ABCDEF} for i, (s, c) in enumerate((s,c) for s in SPLITS for c in CLASSES)]
    records.append({**records[0], "path": "test/HEALTHY_LEAF/duplicate.jpg", "split": "test"})
    kept, excluded = deduplicate(records, radius=0)
    assert len(excluded) == 1 and excluded[0]["split"] == "train"
    record = {"path": "extra", "label": CLASSES[0], "split": "train", "pixel_sha256": "extra", "dhash": 1, "group": "extra"}
    clean = [{**r, "group": r["path"]} for r in records[:-1]] + [record]
    check_manifest({"classes": CLASSES, "records": clean})
    bad = [{**r} for r in clean]
    bad[-1]["group"] = bad[-2]["group"]
    try:
        check_manifest({"classes": CLASSES, "records": bad})
    except ValueError:
        pass
    else:
        raise AssertionError("Leakage check accepted overlapping groups")
    perfect = metrics(np.eye(5), np.arange(5), .8, .2)
    assert perfect["macro_f1"] == 1 and perfect["ece_10_bins"] == 0 and perfect["abstention"]["accepted"] == 5
    assert wilson_lower(100, 100) > .9 and wilson_lower(5, 5) < .9
    notebook = json.loads(Path(__file__).with_name("durian_leaf_disease_classifier_colab.ipynb").read_text(encoding="utf-8"))
    source = "\n".join("".join(c["source"]) for c in notebook["cells"])
    assert 'Rescaling(2.0, offset=-1.0' in source and 'x = base_model(x, training=False)' in source
    print("Self-check passed: holdout priority, group leakage, class order, metrics, preprocessing")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["prepare", "train", "self-check"])
    parser.add_argument("--dataset", type=Path, default=Path("tmp/ai-training/dataset"))
    parser.add_argument("--archive", type=Path, default=Path("tmp/ai-training/durian-leaf-v1.zip"))
    parser.add_argument("--output", type=Path, default=Path("tmp/ai-training/run-1"))
    parser.add_argument("--baseline", type=Path, default=Path("api/leaf_disease_model.onnx"))
    parser.add_argument("--validation-only", action="store_true",
                        help="Train/select on validation; do not evaluate previously inspected test holdout or fit calibration")
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--minutes", type=float, default=12)
    args = parser.parse_args()
    {"prepare": prepare, "train": train, "self-check": lambda _: self_check()}[args.command](args)
