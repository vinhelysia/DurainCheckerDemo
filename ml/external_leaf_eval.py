"""Probe a frozen leaf ONNX model on the Mendeley v2 source test split."""
import argparse
import hashlib
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from leaf_training import CLASSES


LABELS = {
    "leaf_healthy": "HEALTHY_LEAF",
    "leaf_algal": "ALGAL_LEAF_SPOT",
    "leaf_phomopsis": "PHOMOPSIS_LEAF_SPOT",
}
SOURCE = "https://data.mendeley.com/datasets/pxzvksbwnj/2"


def test_label(name):
    parts = [part.lower().replace("-", "_").replace(" ", "_")
             for part in PurePosixPath(name).parts]
    if "test" not in parts:
        return None
    return next((LABELS[part] for part in parts if part in LABELS), None)


def fingerprint(image):
    pixels = hashlib.sha256(str(image.size).encode() + image.tobytes()).hexdigest()
    small = np.asarray(image.convert("L").resize((9, 8), Image.Resampling.LANCZOS))
    dhash = sum(int(bit) << i for i, bit in enumerate((small[:, 1:] > small[:, :-1]).ravel()))
    return pixels, dhash


def evaluate(dataset, candidate, model_file=None):
    with ZipFile(candidate) as z:
        manifest_bytes = z.read("manifest.json")
        config = json.loads(z.read("training-config.json"))
        export = json.loads(z.read("export.json"))
        candidate_bytes = z.read("candidate.onnx")
    assert hashlib.sha256(manifest_bytes).hexdigest() == config["manifest_sha256"]
    assert hashlib.sha256(candidate_bytes).hexdigest() == export["onnx_sha256"]
    assert config["validation_only"] and export["status"] == "candidate_only_not_promoted"
    model_bytes = model_file.read_bytes() if model_file else candidate_bytes
    model_sha256 = hashlib.sha256(model_bytes).hexdigest()
    original = json.loads(manifest_bytes)["records"]
    original_pixels = {record["pixel_sha256"] for record in original}
    original_hashes = [record["dhash"] for record in original]
    session = ort.InferenceSession(model_bytes, providers=["CPUExecutionProvider"])
    assert session.get_inputs()[0].shape == [1, 224, 224, 3]

    counts = {label: {"n": 0, "correct": 0, "predicted": {name: 0 for name in CLASSES}}
              for label in LABELS.values()}
    overlap = {"exact_original": 0, "exact_external": 0,
               "possible_near_original": 0, "possible_near_external": 0}
    seen_pixels = set()
    seen_hashes = []
    with ZipFile(dataset) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or z.testzip() is not None:
            raise ValueError("Invalid or duplicate ZIP entries")
        selected = [(name, test_label(name)) for name in names
                    if name.lower().endswith((".jpg", ".jpeg", ".png")) and test_label(name)]
        if not selected:
            raise ValueError("No matching Mendeley test images; inspect archive layout")
        for name, label in selected:
            if z.getinfo(name).file_size > 12_000_000:
                raise ValueError(f"Unexpectedly large image: {name}")
            with Image.open(BytesIO(z.read(name))) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
            if image.width * image.height > 64_000_000:
                raise ValueError(f"Unexpectedly large image dimensions: {name}")
            pixel, dhash = fingerprint(image)
            if pixel in original_pixels:
                overlap["exact_original"] += 1
                continue
            if pixel in seen_pixels:
                overlap["exact_external"] += 1
                continue
            if any((dhash ^ old).bit_count() <= 4 for old in original_hashes):
                overlap["possible_near_original"] += 1
                continue
            if any((dhash ^ old).bit_count() <= 4 for old in seen_hashes):
                overlap["possible_near_external"] += 1
                continue
            seen_pixels.add(pixel)
            seen_hashes.append(dhash)
            sample = np.asarray(image.resize((224, 224), Image.Resampling.BILINEAR), dtype=np.float32)[None] / 255.0
            prediction = session.run(None, {session.get_inputs()[0].name: sample})[0]
            if prediction.shape != (1, len(CLASSES)) or not np.isfinite(prediction).all():
                raise ValueError("Invalid model output")
            predicted = CLASSES[int(prediction[0].argmax())]
            counts[label]["n"] += 1
            counts[label]["correct"] += predicted == label
            counts[label]["predicted"][predicted] += 1
    n = sum(item["n"] for item in counts.values())
    if not n:
        raise ValueError("No test images remain after overlap screening")
    for item in counts.values():
        item["recall"] = item["correct"] / item["n"] if item["n"] else None
    return {
        "source": SOURCE, "source_version": 2, "license": "CC BY 4.0",
        "source_archive_sha256": hashlib.sha256(dataset.read_bytes()).hexdigest(),
        "model_onnx_sha256": model_sha256,
        "model_source": model_file.as_posix() if model_file else "candidate.onnx in candidate archive",
        "scope": "Mendeley source test split; three conservatively matched classes only",
        "excluded_classes": ["Leaf_Colletotrichum", "Leaf_Rhizoctonia", "Leaf_Blight"],
        "overlap_screen": {**overlap, "dhash_distance": 4},
        "n": n, "mapped_class_accuracy": sum(item["correct"] for item in counts.values()) / n,
        "per_class": counts,
        "limitations": "No tree/orchard IDs; dHash may miss near duplicates or flag lookalikes. Not a full five-class field estimate.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--model-file", type=Path, help="Frozen ONNX file; defaults to candidate.onnx")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    assert test_label("root/Test/Leaf_Phomopsis/image.JPG") == "PHOMOPSIS_LEAF_SPOT"
    assert test_label("root/Train/Leaf_Phomopsis/image.JPG") is None
    result = evaluate(args.dataset, args.candidate, args.model_file)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
