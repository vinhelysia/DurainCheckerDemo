from http.server import BaseHTTPRequestHandler
import json
import math
import os
import numpy as np
import onnxruntime as ort

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "model.onnx")
SCHEMA_PATH = os.path.join(CURRENT_DIR, "feature_schema.json")

ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', 'http://localhost:5173')
MAX_BODY = 16_384

session = None
schema = None

def load_resources():
    global session, schema
    if session is None:
        session = ort.InferenceSession(MODEL_PATH)
    if schema is None:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema = json.load(f)

def require_field(data, name):
    if name not in data:
        raise ValueError(f"missing field: {name}")
    return data[name]

def parse_finite_number(value, name, lo, hi):
    """Parse a numeric field; reject bool, non-numeric, non-finite, out-of-range."""
    if isinstance(value, bool) or value is None:
        raise ValueError(f"{name} must be numeric")
    try:
        num = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be numeric")
    if not math.isfinite(num):
        raise ValueError(f"{name} must be finite")
    if num < lo or num > hi:
        raise ValueError(f"{name} out of range [{lo}, {hi}]")
    return num

def map_province(prov_str, schema_mapping):
    # Map both Vietnamese and English province spellings to canonical keys in the schema
    if not isinstance(prov_str, str):
        raise ValueError("province must be a string")
    normalized_map = {
        "lam dong": "Lâm Đồng",
        "lâm đồng": "Lâm Đồng",
        "tien giang": "Tiền Giang",
        "tiền giang": "Tiền Giang",
        "dak lak": "Đắk Lắk",
        "đắk lắk": "Đắk Lắk",
        "ben tre": "Bến Tre",
        "bến tre": "Bến Tre",
        "dong nai": "Đồng Nai",
        "đồng nai": "Đồng Nai"
    }
    key = prov_str.strip().lower()
    canonical_key = normalized_map.get(key, prov_str.strip())
    if canonical_key not in schema_mapping:
        accepted = ", ".join(schema_mapping.keys())
        raise ValueError(f"unknown province: {prov_str!r}; accepted: {accepted}")
    return schema_mapping[canonical_key]

def parse_predict_payload(data):
    """Validate request body fields. Ranges assumed for model-safe inputs (# ponytail)."""
    province = require_field(data, "province")
    # ponytail: harvest_month 1-12
    harvest_month = int(parse_finite_number(require_field(data, "harvest_month"), "harvest_month", 1, 12))
    # ponytail: farm_violation_history 0-100
    farm_violation_history = int(parse_finite_number(
        require_field(data, "farm_violation_history"), "farm_violation_history", 0, 100
    ))
    # ponytail: rainfall_mm 0-2000
    rainfall_mm = parse_finite_number(require_field(data, "rainfall_mm"), "rainfall_mm", 0, 2000)
    return province, harvest_month, farm_violation_history, rainfall_mm

def predict_batch(province, harvest_month, farm_violation_history, rainfall_mm):
    load_resources()

    # 1. Map province (raises on unknown; never defaults)
    prov_val = map_province(province, schema["province_mapping"])

    # 2. Construct features in the correct order: province, harvest_month, farm_violation_history, rainfall_mm
    features = [
        float(prov_val),
        float(harvest_month),
        float(farm_violation_history),
        float(rainfall_mm)
    ]

    # 3. Create input tensor
    X = np.array([features], dtype=np.float32)

    # 4. Inference
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: X})

    # Zipmap is disabled, so outputs[0] is array of labels, outputs[1] is array of probabilities
    pred_label = int(outputs[0][0])
    probabilities = outputs[1][0] # shape [3]

    pred_prob = float(probabilities[pred_label])
    risk_level_str = schema["label_mapping"][str(pred_label)]

    return {
        "risk": risk_level_str,
        "probability": round(pred_prob, 4),
        "needs_full_testing": risk_level_str != "low"
    }

class handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/predict':
            content_type = (self.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            if content_type != 'application/json':
                self.send_response(415)
                self.send_header('Content-Type', 'application/json')
                self._cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Content-Type must be application/json"}).encode('utf-8'))
                return

            try:
                content_length = int(self.headers.get('Content-Length', 0))
            except (TypeError, ValueError):
                content_length = 0
            if content_length > MAX_BODY:
                self.send_response(413)
                self.send_header('Content-Type', 'application/json')
                self._cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "request body too large"}).encode('utf-8'))
                return

            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                if not isinstance(data, dict):
                    raise ValueError("JSON body must be an object")
                province, harvest_month, farm_violation_history, rainfall_mm = parse_predict_payload(data)

                result = predict_batch(province, harvest_month, farm_violation_history, rainfall_mm)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))

            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._cors_headers()
                self.end_headers()
                error_response = {"error": str(e)}
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
        else:
            self.send_response(404)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b"Not Found")

if __name__ == '__main__':
    # Local CLI self-check (no HTTP server — CI-friendly)
    print("--- Running Local Verification of predict.py ---")
    result_daklak = predict_batch("Đắk Lắk", 10, 2, 250.0)
    print("Test Case 1 (Đắk Lắk rainy, high violations):")
    print(json.dumps(result_daklak, indent=2))

    result_lamdong = predict_batch("Lâm Đồng", 1, 0, 30.0)
    print("\nTest Case 2 (Lâm Đồng dry, zero violations):")
    print(json.dumps(result_lamdong, indent=2))

    load_resources()
    try:
        map_province("Atlantis", schema["province_mapping"])
        raise AssertionError("expected unknown province to raise")
    except ValueError as e:
        assert "unknown province" in str(e).lower() or "accepted" in str(e).lower(), e
        print("\nAssert OK: unknown province raises:", e)

    try:
        parse_predict_payload({"harvest_month": 6, "farm_violation_history": 0, "rainfall_mm": 10})
        raise AssertionError("expected missing province to raise")
    except ValueError as e:
        assert "missing field" in str(e).lower() and "province" in str(e).lower(), e
        print("Assert OK: missing field raises:", e)

    print("\n--- All self-checks passed ---")
