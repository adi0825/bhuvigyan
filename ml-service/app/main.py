"""
Bhuvigyan — Satellite ML Service
FastAPI + Celery worker for satellite fraud analysis.

GEE_ENABLED=false → deterministic mock results (no external calls)
GEE_ENABLED=true  → real Google Earth Engine pipeline
"""

import os
import json
import random
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from celery import Celery

# ── Config ────────────────────────────────────────────────────────────────────
GEE_ENABLED       = os.getenv("GEE_ENABLED", "false").lower() == "true"
REDIS_URL         = os.getenv("REDIS_URL", "redis://redis:6379/0")
KAFKA_BOOTSTRAP   = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
MINIO_ENDPOINT    = os.getenv("MINIO_ENDPOINT", "http://minio:9000").replace("http://", "")
MINIO_ACCESS      = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET      = os.getenv("MINIO_SECRET_KEY", "minioadmin")
SATELLITE_BUCKET  = "bhuvigyan-satellite"
EVIDENCE_BUCKET   = "bhuvigyan-evidence"

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Bhuvigyan Satellite ML Service",
    description="Satellite image fraud scoring for PMFBY claims",
    version="1.2.0"
)

# ── Celery ────────────────────────────────────────────────────────────────────
celery_app = Celery("satellite", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# ── ML models (loaded at startup) ─────────────────────────────────────────────
xgb_model = None
iso_model  = None

try:
    import joblib
    xgb_model = joblib.load("models/xgb_fraud.pkl")
    iso_model  = joblib.load("models/iso_fraud.pkl")
    print("✅ ML models loaded: xgb_fraud + iso_fraud")
except Exception as e:
    print(f"⚠️  ML models not found ({e}) — using rule-based scoring")


# ── Request schema ────────────────────────────────────────────────────────────
class SatelliteJobRequest(BaseModel):
    claim_id:     str
    udlrn:        str
    polygon_wkt:  str
    sowing_date:  str
    claim_date:   str
    damage_type:  str
    crop_type:    str
    district_name: str
    state_code:   Optional[str] = "KA"
    expected_peak_ndvi: Optional[float] = 0.65


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "gee_enabled": GEE_ENABLED,
        "model_loaded": xgb_model is not None,
        "service": "satellite-ml-service",
        "version": "1.2.0"
    }


@app.get("/model/info")
def model_info():
    return {
        "model_type": "XGBoost + IsolationForest",
        "version": "xgb_v1.2",
        "features_count": 47,
        "gee_enabled": GEE_ENABLED,
        "training_date": "2025-12-01"
    }


@app.post("/satellite/analyze")
def analyze(req: SatelliteJobRequest):
    """
    Dispatch satellite analysis job to Celery.
    Returns job_id immediately — client polls /satellite/result/{job_id}.
    """
    job = _analyze_plot.delay(req.dict())
    return {
        "job_id": job.id,
        "status": "QUEUED",
        "claim_id": req.claim_id,
        "message": "Analysis job queued. Poll /satellite/result/{job_id} for result."
    }


@app.post("/satellite/analyze/sync")
def analyze_sync(req: SatelliteJobRequest):
    """
    Synchronous analysis — used by Spring service in dev mode.
    Returns result directly (no polling needed).
    """
    if GEE_ENABLED:
        return _run_gee_pipeline(req.dict())
    return _build_mock_result(req.dict())


@app.get("/satellite/result/{job_id}")
def get_result(job_id: str):
    result = celery_app.AsyncResult(job_id)
    if result.ready():
        if result.successful():
            return {"status": "DONE", "result": result.get()}
        return {"status": "FAILED", "error": str(result.result)}
    return {"status": result.state or "PENDING"}


# ── Celery task ───────────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, name="analyze_plot")
def _analyze_plot(self, req: dict):
    try:
        if GEE_ENABLED:
            result = _run_gee_pipeline(req)
        else:
            result = _build_mock_result(req)

        # Publish to Kafka so Java pipeline receives the result
        _publish_to_kafka(req.get("claim_id"), result)
        return result
    except Exception as e:
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))


# ── Mock result (GEE_ENABLED=false) ──────────────────────────────────────────

def _build_mock_result(req: dict) -> dict:
    """
    Deterministic mock result based on UDLRN hash.
    Same UDLRN always gets same score — consistent for testing.
    """
    udlrn = req.get("udlrn", "UNKNOWN")
    crop  = req.get("crop_type", "UNKNOWN")

    # Deterministic score: 0-100 based on udlrn hash
    score = int(hashlib.md5(udlrn.encode()).hexdigest(), 16) % 100

    expected_peak = req.get("expected_peak_ndvi", 0.65)
    ndvi_sow  = round(min(1.0, expected_peak * (0.85 + (score % 20) / 100)), 3)
    ndvi_clm  = round(max(0.05, ndvi_sow * (1 - score / 120)), 3)
    loss_pct  = round((ndvi_sow - ndvi_clm) / ndvi_sow * 100, 1) if ndvi_sow > 0 else 0

    flags = []
    if ndvi_sow < 0.15:  flags.append("PHANTOM_FARM")
    if loss_pct < 10:    flags.append("WEATHER_MISMATCH")
    if ndvi_sow > 0.5 and score > 70:  flags.append("RETROACTIVE_CLAIM")

    minio_base = f"http://minio:9000/{SATELLITE_BUCKET}"

    return {
        "fraud_score":      score,
        "confidence":       72,
        "ndvi_sowing":      ndvi_sow,
        "ndvi_claim":       ndvi_clm,
        "ndvi_loss_pct":    loss_pct,
        "landsat_max_ndvi": round(ndvi_sow + 0.05, 3),
        "data_source":      "MOCK",
        "cloud_cover_pct":  0,
        "flags":            flags,
        "true_color_url":   f"{minio_base}/demo/mock_true_color.png",
        "ndvi_map_url":     f"{minio_base}/demo/mock_ndvi_map.png",
        "loss_map_url":     f"{minio_base}/demo/mock_loss_map.png",
        "ndvi_timeline":    _build_mock_timeline(ndvi_sow, ndvi_clm),
        "imd_confirmed":    False,
        "model_version":    "MOCK_v1.2",
        "processing_time_ms": 50
    }


def _build_mock_timeline(ndvi_sow: float, ndvi_clm: float) -> list:
    """12-month NDVI timeline for chart rendering."""
    timeline = []
    for i in range(12):
        ratio = i / 11.0
        ndvi  = ndvi_sow - (ndvi_sow - ndvi_clm) * ratio
        ndvi += random.uniform(-0.03, 0.03)
        timeline.append({
            "date":   f"2025-{(i % 12) + 1:02d}-15",
            "ndvi":   round(max(0.0, min(1.0, ndvi)), 3),
            "source": "MOCK"
        })
    return timeline


def _run_gee_pipeline(req: dict) -> dict:
    """
    Real GEE pipeline — placeholder for production implementation.
    """
    raise NotImplementedError("GEE pipeline not implemented yet. Set GEE_ENABLED=false.")


# ── Kafka publisher ───────────────────────────────────────────────────────────

def _publish_to_kafka(claim_id: str, result: dict):
    if not claim_id:
        return
    try:
        from kafka import KafkaProducer
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v).encode("utf-8")
        )
        payload = {
            "claimId": claim_id,
            "fraudScore":      result.get("fraud_score"),
            "ndviSowing":      result.get("ndvi_sowing"),
            "ndviClaim":       result.get("ndvi_claim"),
            "ndviLossPct":     result.get("ndvi_loss_pct"),
            "landsatMaxNdvi":  result.get("landsat_max_ndvi"),
            "dataSource":      result.get("data_source"),
            "flags":           result.get("flags", []),
            "trueColorUrl":    result.get("true_color_url"),
            "ndviMapUrl":      result.get("ndvi_map_url"),
            "lossMapUrl":      result.get("loss_map_url"),
            "ndviTimeline":    result.get("ndvi_timeline"),
            "imdConfirmed":    result.get("imd_confirmed", False),
            "modelVersion":    result.get("model_version"),
            "eventType":       "SATELLITE_JOB_COMPLETED"
        }
        producer.send("satellite.job.completed", payload)
        producer.flush()
        print(f"[Kafka] Published satellite.job.completed for claim {claim_id}")
    except Exception as e:
        print(f"[Kafka] Publish failed for claim {claim_id}: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
