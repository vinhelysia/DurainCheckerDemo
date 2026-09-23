"""Run: python -m unittest discover -s api -p 'test_*.py' -v.

Uses real parsers and image decoding; ONNX inference is deliberately stubbed.
"""
from io import BytesIO
import importlib
import json
import sys
import types
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

# Validation tests must not depend on model runtimes or load model files.
with patch.dict(sys.modules, {"onnxruntime": types.ModuleType("onnxruntime")}):
    predict = importlib.import_module("predict")
    disease = importlib.import_module("predict_disease")
    leaf = importlib.import_module("predict_leaf")

RISK = dict(province="Đắk Lắk", harvest_month=6, farm_violation_history=0, rainfall_mm=10)
DISEASE = dict(temperature_c=28, humidity_pct=80, rainfall_mm=100,
               leaf_wetness_hours=12, soil_drainage="poor", harvest_month=6,
               tree_age_years=10, prior_infection=1)


def request(module, body=b"", length=None, content_type=None):
    instance = module.handler.__new__(module.handler)
    instance.path = "/api/" + module.__name__
    instance.headers = {
        "Content-Type": content_type or "application/json",
        "Content-Length": str(len(body)) if length is None else length,
    }
    instance.rfile = BytesIO(body)
    instance.wfile = BytesIO()
    statuses = []
    instance.send_response = statuses.append
    instance.send_header = lambda *args: None
    instance.end_headers = lambda: None
    instance.do_POST()
    return statuses[-1], json.loads(instance.wfile.getvalue()), instance.rfile.tell()


def multipart(image_bytes):
    return (b'--boundary\r\nContent-Disposition: form-data; name="image"; filename="leaf.png"'
            b'\r\nContent-Type: image/png\r\n\r\n' + image_bytes + b'\r\n--boundary--\r\n')


class ValidationTests(unittest.TestCase):
    def test_integer_fields_reject_fractions(self):
        for module, parser, data, fields in (
            (predict, predict.parse_predict_payload, RISK, ("harvest_month", "farm_violation_history")),
            (disease, disease.parse_disease_payload, DISEASE, ("harvest_month", "prior_infection")),
        ):
            for field in fields:
                with self.subTest(field=field, module=module.__name__):
                    with self.assertRaisesRegex(ValueError, "integer"):
                        parser({**data, field: 1.5 if field == "harvest_month" else 0.5})
                    parser({**data, field: "1.0"})

    def test_numeric_fields_reject_nonfinite_bool_and_huge_integer(self):
        for module in (predict, disease):
            for value in (float("nan"), float("inf"), float("-inf"), True, None, 10 ** 400):
                with self.subTest(module=module.__name__, value_type=type(value).__name__):
                    with self.assertRaises(ValueError):
                        module.parse_finite_number(value, "number", 0, 100)

    def test_bad_lengths_do_not_read_body(self):
        for module in (predict, disease, leaf):
            for length in ("-1", "invalid", "0", "", "1.5"):
                with self.subTest(module=module.__name__, length=length):
                    status, _, read = request(module, b"private", length,
                                             "multipart/form-data" if module is leaf else None)
                    self.assertEqual(status, 400)
                    self.assertEqual(read, 0)

    def test_oversize_body_is_rejected_before_read(self):
        for module in (predict, disease, leaf):
            status, _, read = request(module, b"private", str(6 * 1024 * 1024),
                                     "multipart/form-data" if module is leaf else None)
            self.assertEqual(status, 413)
            self.assertEqual(read, 0)

    def test_json_validation_remains_client_error(self):
        for module in (predict, disease):
            for body in (b"{}", b"[]", b"invalid", b"\xff"):
                self.assertEqual(request(module, body)[0], 400)

    def test_json_inference_failure_is_generic_server_error(self):
        for module, data, fn in ((predict, RISK, "predict_batch"),
                                 (disease, DISEASE, "predict_disease")):
            with patch.object(module, fn, side_effect=ValueError("secret model path")):
                with self.assertLogs(level="ERROR"):
                    status, body, _ = request(module, json.dumps(data).encode())
            self.assertEqual(status, 500)
            self.assertEqual(body, {"error": "prediction unavailable"})

    def test_valid_json_preserves_success_response(self):
        for module, data, fn in ((predict, RISK, "predict_batch"),
                                 (disease, DISEASE, "predict_disease")):
            response = {"risk": "low", "probability": 0.8}
            with patch.object(module, fn, return_value=response):
                status, body, _ = request(module, json.dumps(data).encode())
            self.assertEqual((status, body), (200, response))

    def test_invalid_and_oversize_images(self):
        with self.assertRaisesRegex(ValueError, "invalid or unsupported image"):
            leaf.image_to_array(b"not an image")
        buf = BytesIO()
        Image.new("RGB", (10, 10)).save(buf, format="PNG")
        with patch.object(leaf, "MAX_IMAGE_PIXELS", 50):
            with self.assertRaisesRegex(ValueError, "million pixels"):
                leaf.image_to_array(buf.getvalue())
        self.assertEqual(leaf.image_to_array(buf.getvalue()).shape, (1, 224, 224, 3))

    def test_leaf_invalid_image_precedes_model_loading(self):
        with patch.object(leaf, "load_resources") as load:
            status, _, _ = request(leaf, multipart(b"bad"),
                                   content_type="multipart/form-data; boundary=boundary")
        self.assertEqual(status, 400)
        load.assert_not_called()

    def test_leaf_resource_failure_is_generic_server_error(self):
        buf = BytesIO()
        Image.new("RGB", (10, 10)).save(buf, format="PNG")
        with patch.object(leaf, "load_resources", side_effect=RuntimeError("secret path")):
            with self.assertLogs(level="ERROR"):
                status, body, _ = request(leaf, multipart(buf.getvalue()),
                                         content_type="multipart/form-data; boundary=boundary")
        self.assertEqual((status, body), (500, {"error": "prediction unavailable"}))

    def test_leaf_success_and_missing_model(self):
        buf = BytesIO()
        Image.new("RGB", (10, 10)).save(buf, format="PNG")
        response = {"disease": "healthy", "label_vi": "Khỏe", "label_en": "Healthy",
                    "probability": 0.9, "scores": {"healthy": 0.9}}
        for available, expected in ((True, (200, response)),
                                    (False, (503, {"error": "model not available"}))):
            with patch.object(leaf, "load_resources", return_value=available), \
                    patch.object(leaf, "predict_leaf", return_value=response):
                status, body, _ = request(leaf, multipart(buf.getvalue()),
                                         content_type="multipart/form-data; boundary=boundary")
            self.assertEqual((status, body), expected)

    def test_low_model_risk_does_not_waive_testing(self):
        fake_session = types.SimpleNamespace(
            get_inputs=lambda: [types.SimpleNamespace(name="features")],
            run=lambda *args: [np.array([0]), np.array([[0.9, 0.05, 0.05]])],
        )
        fake_schema = {"province_mapping": {"Đắk Lắk": 2}, "label_mapping": {"0": "low"}}
        with patch.object(predict, "load_resources"), patch.object(predict, "session", fake_session), \
                patch.object(predict, "schema", fake_schema):
            result = predict.predict_batch(**RISK)
        self.assertTrue(result["needs_full_testing"])
        self.assertEqual(result["risk"], "low")


if __name__ == "__main__":
    unittest.main()
