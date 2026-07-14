from http.server import BaseHTTPRequestHandler
from email import message_from_bytes
from email.policy import default as email_policy
from io import BytesIO
import json
import os
import sys
import numpy as np
import onnxruntime as ort
from PIL import Image

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "leaf_disease_model.onnx")
LABELS_PATH = os.path.join(CURRENT_DIR, "leaf_labels.json")
MAX_BODY_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173")

session = None
labels = None

def load_resources():
    global session, labels
    if not os.path.exists(MODEL_PATH) or not os.path.exists(LABELS_PATH):
        return False

    if session is None:
        session = ort.InferenceSession(MODEL_PATH)
    if labels is None:
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            labels = json.load(f)
    return True

# Fixed class order matching the trained model output and leaf_labels.json.
# These slugs are the stable keys the frontend uses to look up labels/treatment text.
CLASS_SLUGS = [
    "healthy",
    "algal_leaf_spot",
    "leaf_blight",
    "phomopsis_leaf_spot",
    "allocaridara_attack",
]

def _slug_for(index):
    return CLASS_SLUGS[index] if index < len(CLASS_SLUGS) else str(index)

def _cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")

def _send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    _cors_headers(handler)
    handler.end_headers()
    handler.wfile.write(body)

def image_to_array(image_bytes):
    """Decode image bytes to model input ndarray of shape (1, 224, 224, 3)."""
    img = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return arr.reshape((1, 224, 224, 3))

def extract_multipart_image(content_type, body):
    """Parse multipart/form-data body and return bytes of the 'image' part."""
    # email parser expects a full MIME message with headers + body
    raw = f"Content-Type: {content_type}\r\n\r\n".encode("utf-8") + body
    msg = message_from_bytes(raw, policy=email_policy)
    if not msg.is_multipart():
        raise ValueError("expected multipart/form-data body")

    for part in msg.iter_parts():
        # Prefer Content-Disposition name=...
        name = part.get_param("name", header="content-disposition")
        if name is None:
            # Fallback: some parsers expose get_filename / other headers
            cd = part.get("Content-Disposition", "")
            if 'name="image"' in cd or "name=image" in cd:
                name = "image"
        if name == "image":
            payload = part.get_payload(decode=True)
            if payload is None:
                raise ValueError("empty image part")
            return payload

    raise ValueError("missing form field 'image'")

def predict_leaf(pixels_or_array):
    """Run inference.

    Accepts either:
      - list/1-D array of 150528 raw pixel values in 0-255 (legacy), or
      - numpy array of shape (1, 224, 224, 3) already scaled to 0-1.
    """
    if isinstance(pixels_or_array, np.ndarray) and pixels_or_array.ndim == 4:
        X = pixels_or_array.astype(np.float32, copy=False)
        if X.shape != (1, 224, 224, 3):
            raise ValueError(f"Expected shape (1, 224, 224, 3), got {X.shape}")
    else:
        if len(pixels_or_array) != 150528:
            raise ValueError(f"Expected 150528 pixels, got {len(pixels_or_array)}")
        X = np.array(pixels_or_array, dtype=np.float32) / 255.0
        X = X.reshape((1, 224, 224, 3))

    input_name = session.get_inputs()[0].name
    # Output is [1, N] softmax probabilities (N = number of classes).
    probabilities = session.run(None, {input_name: X})[0][0]
    num_classes = len(probabilities)

    pred_index = int(np.argmax(probabilities))
    pred_prob = float(probabilities[pred_index])

    # leaf_labels.json maps "index" -> {"vi": ..., "en": ...}
    label_info = labels.get(str(pred_index), {})
    scores = {_slug_for(i): float(probabilities[i]) for i in range(num_classes)}

    return {
        "disease": _slug_for(pred_index),
        "label_vi": label_info.get("vi", _slug_for(pred_index)),
        "label_en": label_info.get("en", _slug_for(pred_index)),
        "probability": round(pred_prob, 4),
        "scores": scores,
    }

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        _cors_headers(self)
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/predict_leaf":
            self.send_response(404)
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(b"Not Found")
            return

        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("multipart/form-data"):
            _send_json(self, 415, {"error": "Content-Type must be multipart/form-data"})
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > MAX_BODY_BYTES:
            # Cap body WITHOUT reading it
            _send_json(self, 413, {"error": "payload too large (max 5MB)"})
            return

        if not load_resources():
            _send_json(self, 503, {"error": "model not available"})
            return

        try:
            post_data = self.rfile.read(content_length)
            image_bytes = extract_multipart_image(content_type, post_data)
            X = image_to_array(image_bytes)
            result = predict_leaf(X)
            _send_json(self, 200, result)
        except Exception as e:
            _send_json(self, 400, {"error": str(e)})

if __name__ == "__main__":
    print("--- Running Local Verification of predict_leaf.py ---")
    if not load_resources():
        print("MODEL MISSING — cannot run real inference")
        sys.exit(1)

    try:
        # Tiny RGB image -> PNG bytes -> image path (not HTTP server)
        img = Image.new("RGB", (32, 32), color=(34, 139, 34))
        buf = BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        X = image_to_array(png_bytes)
        res = predict_leaf(X)
        assert "disease" in res, f"missing disease key: {res}"
        print("Test Case 1 (PIL PNG image path):")
        print(json.dumps(res, indent=2))
        print("OK")
    except Exception as ex:
        print(f"Error during verification: {ex}")
        sys.exit(1)
