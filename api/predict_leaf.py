from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import numpy as np
import onnxruntime as ort

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "leaf_disease_model.onnx")
LABELS_PATH = os.path.join(CURRENT_DIR, "leaf_labels.json")

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

def predict_leaf(pixels):
    if len(pixels) != 150528:
        raise ValueError(f"Expected 150528 pixels, got {len(pixels)}")

    X = np.array(pixels, dtype=np.float32) / 255.0
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
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/predict_leaf':
            if not load_resources():
                self.send_response(503)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "model not available"}).encode('utf-8'))
                return

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                pixels = data.get("pixels", [])
                
                result = predict_leaf(pixels)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
                
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = {"error": str(e)}
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b"Not Found")

if __name__ == '__main__':
    print("--- Running Local Verification of predict_leaf.py ---")
    if not load_resources():
        print("MODEL MISSING — cannot run real inference")
        sys.exit(1)
        
    try:
        dummy_pixels = [0] * (224 * 224 * 3)
        res = predict_leaf(dummy_pixels)
        print("Test Case 1 (All-zeros input):")
        print(json.dumps(res, indent=2))
    except Exception as ex:
        print(f"Error during verification: {ex}")
        sys.exit(1)
