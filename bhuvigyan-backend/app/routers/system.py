from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
import os
import json

router = APIRouter()


@router.get("/mode")
async def system_mode():
    return {"success": True, "data": {"degraded": False, "runMode": "LOCAL"}}


@router.get("/health")
async def system_health():
    return {"success": True, "data": {"status": "operational", "version": "2.0.0", "database": "connected", "redis": "connected"}}


@router.get("/db-health")
async def db_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "UP", "service": "PostgreSQL"}
    except Exception:
        return {"status": "DOWN", "service": "PostgreSQL"}


@router.get("/sat-health")
async def sat_health():
    mock_path = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "mock", "true_color.jpg")
    if os.path.exists(mock_path):
        return {"status": "UP", "mode": "DEV_MOCK", "service": "Satellite (Sentinel-2)"}
    return {"status": "UP", "mode": "GEE", "service": "Satellite (GEE)"}


@router.get("/storage-health")
async def storage_health():
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    if os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK):
        return {"status": "UP", "service": "File Storage"}
    return {"status": "DOWN", "service": "File Storage"}


@router.get("/fraud-health")
async def fraud_health():
    return {"status": "UP", "mode": "SIMULATED", "service": "Fraud Engine"}