"""Run: python -m unittest backend.test_app -v (real ONNX inference, mocked cloud transport)."""
from io import BytesIO
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from PIL import Image
from backend import app as module


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(module.app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_real_models_and_limits(self):
        payload = {'province': 'Lâm Đồng', 'harvest_month': 6,
                   'farm_violation_history': 0, 'rainfall_mm': 100}
        response = self.client.post('/api/predict', json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()['needs_full_testing'])
        response = self.client.post('/api/predict', json={**payload, 'province': 'Atlantis'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post('/api/predict', json={**payload, 'harvest_month': True}).status_code, 400)
        self.assertEqual(self.client.post('/api/predict', content=b'x'*17000, headers={'Content-Type': 'application/json'}).status_code, 413)
        self.assertEqual(self.client.post('/api/predict', content='{}').status_code, 415)
        disease = self.client.post('/api/predict_disease', json={
            'temperature_c': 28, 'humidity_pct': 80, 'rainfall_mm': 150,
            'leaf_wetness_hours': 6, 'soil_drainage': 'good', 'harvest_month': 6,
            'tree_age_years': 8, 'prior_infection': 0,
        })
        self.assertEqual(disease.status_code, 200, disease.text)
        self.assertIn('disease', disease.json())
        image = BytesIO()
        Image.new('RGB', (32, 32), (30, 140, 30)).save(image, format='PNG')
        leaf = self.client.post('/api/predict_leaf', files={'image': ('leaf.png', image.getvalue(), 'image/png')})
        self.assertEqual(leaf.status_code, 200, leaf.text)
        self.assertEqual(len(leaf.json()['scores']), 5)
        self.assertEqual(self.client.post('/api/predict_leaf', files={'image': ('bad.png', b'invalid', 'image/png')}).status_code, 400)

    def test_cors_auth_validation_and_unconfigured_storage(self):
        headers = {'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST'}
        response = self.client.options('/api/predict', headers=headers)
        self.assertEqual(response.headers['access-control-allow-origin'], headers['Origin'])
        response = self.client.options('/api/predict', headers={**headers, 'Origin': 'https://untrusted.example'})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access-control-allow-origin', response.headers)
        self.assertEqual(self.client.post('/api/cloud/batches', json={}).status_code, 401)
        auth = {'Authorization': 'Bearer test-jwt'}
        payload = {'code': 'TEST-1', 'farm': 'Farm', 'province': 'Region', 'harvest_date': '2026-09-26'}
        with patch.object(module, 'supabase') as database:
            for extra in ({'owner_id': 'spoof'}, {'is_public': True}, {'created_at': '2020-01-01'}, {'farm': '   '}):
                response = self.client.post('/api/cloud/batches', headers=auth, json={**payload, **extra})
                self.assertEqual(response.status_code, 422, response.text)
            database.assert_not_called()
        with patch.object(module, 'SUPABASE_URL', ''):
            self.assertEqual(self.client.get('/api/cloud/batches', headers=auth).status_code, 503)

    def test_jwt_forwarding_and_database_failures(self):
        with patch.object(module, 'SUPABASE_URL', 'https://test.supabase.co'), patch.object(module, 'SUPABASE_KEY', 'publishable'), patch.object(module.httpx, 'request') as request:
            request.return_value = httpx.Response(200, json=[])
            module.supabase('GET', '/rest/v1/cloud_batches', 'Bearer user-token')
            self.assertEqual(request.call_args.kwargs['headers']['Authorization'], 'Bearer user-token')
            self.assertEqual(request.call_args.kwargs['headers']['apikey'], 'publishable')
            request.return_value = httpx.Response(403, json={'message': 'private database detail'})
            result = self.client.get('/api/cloud/batches', headers={'Authorization': 'Bearer invalid'})
            self.assertEqual(result.status_code, 403)
            self.assertNotIn('private database detail', result.text)
            request.side_effect = httpx.ReadTimeout('timeout')
            self.assertEqual(self.client.get('/api/cloud/batches', headers={'Authorization': 'Bearer test'}).status_code, 503)

    def test_event_validation_and_visibility(self):
        batch_id = '11111111-1111-4111-8111-111111111111'
        path = f'/api/cloud/batches/{batch_id}'
        auth = {'Authorization': 'Bearer owner-token'}
        event = {'stage': 'Harvest', 'location': 'Farm', 'occurred_on': '2026-09-26'}
        with patch.object(module, 'supabase', return_value=[{'id': batch_id}]) as database:
            self.assertEqual(self.client.post(path + '/events', headers=auth, json={**event, 'cadmium_ppm': 0.03}).status_code, 422)
            self.assertEqual(self.client.post(path + '/events', headers=auth, json={**event, 'cadmium_ppm': True, 'threshold_ppm': 0.05}).status_code, 422)
            self.assertEqual(self.client.patch(path, headers=auth, json={'is_public': 'false'}).status_code, 422)
            database.assert_not_called()
            response = self.client.post(path + '/events', headers=auth, json=event)
            self.assertEqual(response.status_code, 201, response.text)
            self.assertEqual(database.call_args.kwargs['payload']['batch_id'], batch_id)
        with patch.object(module, 'supabase', return_value=[]):
            self.assertEqual(self.client.get(path).status_code, 404)
            self.assertEqual(self.client.patch(path, headers=auth, json={'is_public': True}).status_code, 404)


if __name__ == '__main__':
    unittest.main()
