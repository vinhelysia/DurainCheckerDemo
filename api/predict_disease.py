from http.server import BaseHTTPRequestHandler
import json
import math
import os
import numpy as np
import onnxruntime as ort

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "disease_model.onnx")
SCHEMA_PATH = os.path.join(CURRENT_DIR, "disease_schema.json")

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

def map_soil_drainage(drainage_str, schema_mapping):
    if not isinstance(drainage_str, str):
        raise ValueError("soil_drainage must be a string")
    key = drainage_str.strip().lower()
    if key not in schema_mapping:
        accepted = ", ".join(schema_mapping.keys())
        raise ValueError(f"unknown soil_drainage: {drainage_str!r}; accepted: {accepted}")
    return schema_mapping[key]

def parse_disease_payload(data):
    """Validate request body fields. Ranges assumed for model-safe inputs (# ponytail)."""
    # ponytail: temperature_c -10 to 50
    temperature_c = parse_finite_number(require_field(data, "temperature_c"), "temperature_c", -10, 50)
    # ponytail: humidity_pct 0-100
    humidity_pct = parse_finite_number(require_field(data, "humidity_pct"), "humidity_pct", 0, 100)
    # ponytail: rainfall_mm 0-2000
    rainfall_mm = parse_finite_number(require_field(data, "rainfall_mm"), "rainfall_mm", 0, 2000)
    # ponytail: leaf_wetness_hours 0-48
    leaf_wetness_hours = parse_finite_number(
        require_field(data, "leaf_wetness_hours"), "leaf_wetness_hours", 0, 48
    )
    soil_drainage = require_field(data, "soil_drainage")
    # ponytail: harvest_month 1-12
    harvest_month = int(parse_finite_number(require_field(data, "harvest_month"), "harvest_month", 1, 12))
    # ponytail: tree_age_years 0-100
    tree_age_years = parse_finite_number(require_field(data, "tree_age_years"), "tree_age_years", 0, 100)
    # ponytail: prior_infection 0 or 1
    prior_infection = int(parse_finite_number(require_field(data, "prior_infection"), "prior_infection", 0, 1))
    if prior_infection not in (0, 1):
        raise ValueError("prior_infection must be 0 or 1")
    return (
        temperature_c,
        humidity_pct,
        rainfall_mm,
        leaf_wetness_hours,
        soil_drainage,
        harvest_month,
        tree_age_years,
        prior_infection,
    )

def predict_disease(temperature_c, humidity_pct, rainfall_mm, leaf_wetness_hours, soil_drainage, harvest_month, tree_age_years, prior_infection):
    load_resources()

    # 1. Map soil drainage (raises on unknown; never defaults)
    drain_val = map_soil_drainage(soil_drainage, schema["soil_drainage_mapping"])

    # 2. Construct features list in canonical order
    # ["temperature_c", "humidity_pct", "rainfall_mm", "leaf_wetness_hours", "soil_drainage", "harvest_month", "tree_age_years", "prior_infection"]
    features = [
        float(temperature_c),
        float(humidity_pct),
        float(rainfall_mm),
        float(leaf_wetness_hours),
        float(drain_val),
        float(harvest_month),
        float(tree_age_years),
        float(prior_infection)
    ]

    # 3. Create input tensor
    X = np.array([features], dtype=np.float32)

    # 4. Run inference
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: X})

    # outputs[0] has predicted labels, outputs[1] has probabilities list of shape [1, 4]
    pred_label = int(outputs[0][0])
    probabilities = outputs[1][0]

    pred_prob = float(probabilities[pred_label])
    disease_name = schema["label_mapping"][str(pred_label)]

    # healthy -> low risk, other diseases -> high if prob >= 0.5 else medium
    if disease_name == "healthy":
        risk_level = "low"
    elif pred_prob >= 0.5:
        risk_level = "high"
    else:
        risk_level = "medium"

    return {
        "disease": disease_name,
        "probability": round(pred_prob, 4),
        "risk": risk_level
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
        if self.path == '/api/predict_disease':
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
                (
                    temperature_c,
                    humidity_pct,
                    rainfall_mm,
                    leaf_wetness_hours,
                    soil_drainage,
                    harvest_month,
                    tree_age_years,
                    prior_infection,
                ) = parse_disease_payload(data)

                result = predict_disease(
                    temperature_c,
                    humidity_pct,
                    rainfall_mm,
                    leaf_wetness_hours,
                    soil_drainage,
                    harvest_month,
                    tree_age_years,
                    prior_infection
                )

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
    print("--- Running Local Verification of predict_disease.py ---")
    wet_sample = {
        "temperature_c": 28.0,
        "humidity_pct": 95.0,
        "rainfall_mm": 300.0,
        "leaf_wetness_hours": 18.0,
        "soil_drainage": "poor",
        "harvest_month": 8,
        "tree_age_years": 10.0,
        "prior_infection": 1
    }
    res_wet = predict_disease(**wet_sample)
    print("Test Case 1 (Wet, poor soil, prior infection):")
    print(json.dumps(res_wet, indent=2))

    ideal_sample = {
        "temperature_c": 25.0,
        "humidity_pct": 65.0,
        "rainfall_mm": 50.0,
        "leaf_wetness_hours": 3.0,
        "soil_drainage": "good",
        "harvest_month": 1,
        "tree_age_years": 8.0,
        "prior_infection": 0
    }
    res_ideal = predict_disease(**ideal_sample)
    print("\nTest Case 2 (Ideal dry conditions):")
    print(json.dumps(res_ideal, indent=2))

    load_resources()
    try:
        map_soil_drainage("swampy", schema["soil_drainage_mapping"])
        raise AssertionError("expected unknown soil_drainage to raise")
    except ValueError as e:
        assert "unknown" in str(e).lower() or "accepted" in str(e).lower(), e
        print("\nAssert OK: unknown drainage raises:", e)

    try:
        parse_disease_payload({
            "temperature_c": 25.0,
            "humidity_pct": 65.0,
            "rainfall_mm": 50.0,
            "leaf_wetness_hours": 3.0,
            # soil_drainage missing
            "harvest_month": 1,
            "tree_age_years": 8.0,
            "prior_infection": 0
        })
        raise AssertionError("expected missing soil_drainage to raise")
    except ValueError as e:
        assert "missing field" in str(e).lower() and "soil_drainage" in str(e).lower(), e
        print("Assert OK: missing field raises:", e)

    print("\n--- All self-checks passed ---")
