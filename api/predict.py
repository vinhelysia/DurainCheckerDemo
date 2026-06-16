from http.server import BaseHTTPRequestHandler
import json
import os
import numpy as np
import onnxruntime as ort

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "model.onnx")
SCHEMA_PATH = os.path.join(CURRENT_DIR, "feature_schema.json")

session = None
schema = None

def load_resources():
    global session, schema
    if session is None:
        session = ort.InferenceSession(MODEL_PATH)
    if schema is None:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema = json.load(f)

def map_province(prov_str, schema_mapping):
    # Map both Vietnamese and English province spellings to canonical keys in the schema
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
    canonical_key = normalized_map.get(key, prov_str)
    return schema_mapping.get(canonical_key, 0) # default to 0 (Lâm Đồng) if not found

def predict_batch(province, harvest_month, farm_violation_history, rainfall_mm):
    load_resources()
    
    # 1. Map province
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
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/predict':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                province = data.get("province", "Lâm Đồng")
                harvest_month = int(data.get("harvest_month", 6))
                farm_violation_history = int(data.get("farm_violation_history", 0))
                rainfall_mm = float(data.get("rainfall_mm", 150.0))
                
                result = predict_batch(province, harvest_month, farm_violation_history, rainfall_mm)
                
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
    # Local CLI test block
    print("--- Running Local Verification of predict.py ---")
    try:
        # Test case 1: Đắk Lắk (high soil baseline), harvest_month=10 (rainy), violations=2, rain=250.0 (high)
        # Expected: High/Medium risk
        result_daklak = predict_batch("Đắk Lắk", 10, 2, 250.0)
        print("Test Case 1 (Đắk Lắk rainy, high violations):")
        print(json.dumps(result_daklak, indent=2))
        
        # Test case 2: Lâm Đồng (low baseline), harvest_month=1 (dry), violations=0, rain=30.0 (low)
        # Expected: Low risk
        result_lamdong = predict_batch("Lâm Đồng", 1, 0, 30.0)
        print("\nTest Case 2 (Lâm Đồng dry, zero violations):")
        print(json.dumps(result_lamdong, indent=2))
    except Exception as ex:
        print(f"Error during verification: {ex}")

    # Start a local HTTP server for testing web requests
    print("\n--- Starting local HTTP server on http://localhost:3000 ---")
    print("Use Ctrl+C to stop the server.")
    from http.server import HTTPServer
    server = HTTPServer(('localhost', 3000), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
