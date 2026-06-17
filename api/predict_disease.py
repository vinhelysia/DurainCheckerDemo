from http.server import BaseHTTPRequestHandler
import json
import os
import numpy as np
import onnxruntime as ort

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "disease_model.onnx")
SCHEMA_PATH = os.path.join(CURRENT_DIR, "disease_schema.json")

session = None
schema = None

def load_resources():
    global session, schema
    if session is None:
        session = ort.InferenceSession(MODEL_PATH)
    if schema is None:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema = json.load(f)

def map_soil_drainage(drainage_str, schema_mapping):
    key = drainage_str.strip().lower()
    return schema_mapping.get(key, 0.0) # default to good (0.0) if not found

def predict_disease(temperature_c, humidity_pct, rainfall_mm, leaf_wetness_hours, soil_drainage, harvest_month, tree_age_years, prior_infection):
    load_resources()
    
    # 1. Map soil drainage
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
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/predict_disease':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                temperature_c = float(data.get("temperature_c", 28.0))
                humidity_pct = float(data.get("humidity_pct", 80.0))
                rainfall_mm = float(data.get("rainfall_mm", 150.0))
                leaf_wetness_hours = float(data.get("leaf_wetness_hours", 6.0))
                soil_drainage = str(data.get("soil_drainage", "good"))
                harvest_month = int(data.get("harvest_month", 6))
                tree_age_years = float(data.get("tree_age_years", 8.0))
                prior_infection = int(data.get("prior_infection", 0))
                
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
    print("--- Running Local Verification of predict_disease.py ---")
    try:
        # Test Case 1: Wet/Poor-drainage sample -> High disease risk (phytophthora)
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
        
        # Test Case 2: Ideal conditions -> Healthy low risk
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
    except Exception as ex:
        print(f"Error during verification: {ex}")

    # Start a local HTTP server for testing web requests
    print("\n--- Starting local HTTP server on http://localhost:3001 ---")
    print("Use Ctrl+C to stop the server.")
    from http.server import HTTPServer
    server = HTTPServer(('localhost', 3001), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

