"""Render API. Supabase enforces permissions using the caller's JWT, never a service key."""
from contextlib import asynccontextmanager
from datetime import date
import json
import logging
import os
from threading import Lock
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from starlette.concurrency import run_in_threadpool

from api import predict, predict_disease, predict_leaf

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_PUBLISHABLE_KEY', '')
INFERENCE_LOCK = Lock()


@asynccontextmanager
async def lifespan(app):
    # Fail deployment health checks if any model is missing or corrupt.
    predict.load_resources()
    predict_disease.load_resources()
    if not predict_leaf.load_resources():
        raise RuntimeError('Leaf model is missing')
    yield


app = FastAPI(title='DurianTrust API', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get('ALLOWED_ORIGIN', 'http://localhost:5173')],
    allow_methods=['GET', 'POST', 'PATCH'],
    allow_headers=['Authorization', 'Content-Type'],
)


@app.exception_handler(HTTPException)
async def http_error(_request, exc):
    return JSONResponse({'error': exc.detail}, status_code=exc.status_code)


@app.exception_handler(ValidationError)
async def validation_error(_request, _exc):
    return JSONResponse({'error': 'Invalid fields or values.'}, status_code=422)


@app.exception_handler(Exception)
async def unexpected_error(_request, exc):
    logging.error('API request failed', exc_info=exc)
    return JSONResponse({'error': 'Service temporarily unavailable.'}, status_code=503)


@app.get('/health')
def health():
    return {'status': 'ok', 'cloud_configured': bool(SUPABASE_URL and SUPABASE_KEY)}


async def limited_body(request, limit):
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > limit:
            raise HTTPException(413, 'Request is too large.')
        body.extend(chunk)
    return bytes(body)


async def json_body(request):
    if request.headers.get('content-type', '').split(';')[0].strip().lower() != 'application/json':
        raise HTTPException(415, 'Content-Type must be application/json.')
    try:
        payload = json.loads(await limited_body(request, 16_384))
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, 'Invalid JSON.') from None
    if not isinstance(payload, dict):
        raise HTTPException(400, 'JSON must be an object.')
    return payload


def inference(fn, *args):
    # ponytail: one inference at a time on the free instance; add workers only with more RAM.
    if not INFERENCE_LOCK.acquire(blocking=False):
        raise HTTPException(503, 'AI is busy. Please retry shortly.')
    try:
        return fn(*args)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    finally:
        INFERENCE_LOCK.release()


@app.post('/api/predict')
async def batch_prediction(request: Request):
    try:
        args = predict.parse_predict_payload(await json_body(request))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    return await run_in_threadpool(inference, predict.predict_batch, *args)


@app.post('/api/predict_disease')
async def disease_prediction(request: Request):
    try:
        args = predict_disease.parse_disease_payload(await json_body(request))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    return await run_in_threadpool(inference, predict_disease.predict_disease, *args)


def classify_leaf(content_type, body):
    image = predict_leaf.extract_multipart_image(content_type, body)
    return predict_leaf.predict_leaf(predict_leaf.image_to_array(image))


@app.post('/api/predict_leaf')
async def leaf_prediction(request: Request):
    content_type = request.headers.get('content-type', '')
    if not content_type.lower().startswith('multipart/form-data;'):
        raise HTTPException(415, 'Content-Type must be multipart/form-data.')
    body = await limited_body(request, predict_leaf.MAX_BODY_BYTES)
    return await run_in_threadpool(inference, classify_leaf, content_type, body)


Text = Annotated[str, Field(min_length=1, max_length=160)]


class BatchInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    code: Annotated[str, Field(pattern=r'^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')]
    farm: Text
    province: Text
    harvest_date: date


class EventInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    stage: Text
    location: Text
    occurred_on: date
    notes: Annotated[str, Field(max_length=2000)] = ''
    cadmium_ppm: Annotated[float, Field(ge=0, le=100, allow_inf_nan=False, strict=True)] | None = None
    threshold_ppm: Annotated[float, Field(gt=0, le=100, allow_inf_nan=False, strict=True)] | None = None

    @model_validator(mode='after')
    def paired_measurements(self):
        if (self.cadmium_ppm is None) != (self.threshold_ppm is None):
            raise ValueError('Both measurement and reference threshold are required.')
        return self


class VisibilityInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    is_public: bool


def authorization(request, required=False):
    value = request.headers.get('authorization', '')
    if value and (not value.startswith('Bearer ') or not value[7:].strip()):
        raise HTTPException(401, 'Invalid authentication.')
    if required and not value:
        raise HTTPException(401, 'Sign in first.')
    return value


def supabase(method, path, auth='', *, params=None, payload=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(503, 'Cloud storage has not been configured.')
    headers = {'apikey': SUPABASE_KEY, 'Prefer': 'return=representation'}
    if auth:
        headers['Authorization'] = auth
    try:
        response = httpx.request(method, SUPABASE_URL + path, headers=headers,
                                 params=params, json=payload, timeout=15)
    except httpx.RequestError:
        raise HTTPException(503, 'Cannot reach cloud storage.') from None
    if response.status_code in (401, 403):
        raise HTTPException(response.status_code, 'Sign in with an authorized account.')
    if response.status_code == 409:
        raise HTTPException(409, 'This batch code already exists in your account.')
    if response.is_error:
        raise HTTPException(502, 'Cloud storage rejected the request.')
    return response.json()


BATCH_FIELDS = 'id,code,farm,province,harvest_date,is_public,created_at'
EVENT_FIELDS = 'id,batch_id,stage,location,occurred_on,notes,cadmium_ppm,threshold_ppm,created_at'


@app.get('/api/cloud/batches')
def list_batches(request: Request, offset: int = 0):
    if offset < 0 or offset > 100000:
        raise HTTPException(400, 'Invalid page.')
    auth = authorization(request, required=True)
    user = supabase('GET', '/auth/v1/user', auth)
    return supabase('GET', '/rest/v1/cloud_batches', auth, params={
        'select': BATCH_FIELDS, 'owner_id': f'eq.{UUID(user["id"])}',
        'order': 'created_at.desc,id.desc', 'limit': '50', 'offset': str(offset),
    })


@app.post('/api/cloud/batches', status_code=201)
async def create_batch(request: Request):
    auth = authorization(request, required=True)
    data = BatchInput.model_validate(await json_body(request)).model_dump(mode='json')
    rows = await run_in_threadpool(supabase, 'POST', '/rest/v1/cloud_batches', auth, payload=data,
                                  params={'select': BATCH_FIELDS})
    return rows[0]


@app.get('/api/cloud/batches/{batch_id}')
def get_batch(batch_id: UUID, request: Request):
    auth = authorization(request)
    rows = supabase('GET', '/rest/v1/cloud_batches', auth,
                    params={'select': BATCH_FIELDS, 'id': f'eq.{batch_id}'})
    if not rows:
        raise HTTPException(404, 'Batch not found or private.')
    return rows[0]


@app.get('/api/cloud/batches/{batch_id}/events')
def get_events(batch_id: UUID, request: Request, offset: int = 0):
    if offset < 0 or offset > 100000:
        raise HTTPException(400, 'Invalid page.')
    auth = authorization(request)
    get_batch(batch_id, request)
    return supabase('GET', '/rest/v1/cloud_events', auth, params={
        'select': EVENT_FIELDS, 'batch_id': f'eq.{batch_id}',
        'order': 'created_at.asc,id.asc', 'limit': '50', 'offset': str(offset),
    })


@app.patch('/api/cloud/batches/{batch_id}')
async def publish_batch(batch_id: UUID, request: Request):
    auth = authorization(request, required=True)
    data = VisibilityInput.model_validate(await json_body(request)).model_dump()
    rows = await run_in_threadpool(supabase, 'PATCH', '/rest/v1/cloud_batches', auth,
                                  params={'id': f'eq.{batch_id}', 'select': BATCH_FIELDS}, payload=data)
    if not rows:
        raise HTTPException(404, 'Batch not found or not owned by you.')
    return rows[0]


@app.post('/api/cloud/batches/{batch_id}/events', status_code=201)
async def append_event(batch_id: UUID, request: Request):
    auth = authorization(request, required=True)
    data = EventInput.model_validate(await json_body(request)).model_dump(mode='json')
    data['batch_id'] = str(batch_id)
    rows = await run_in_threadpool(supabase, 'POST', '/rest/v1/cloud_events', auth,
                                  payload=data, params={'select': EVENT_FIELDS})
    return rows[0]
