"""Pydantic schemas shared by routers + workers."""
from __future__ import annotations
from datetime import date
from typing import Any

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    udlrn: str = Field(..., pattern=r"^\d{2}-\d{4}-[0-9A-F]{6}-\d{2}$")
    polygon: dict[str, Any] | None = None         # GeoJSON polygon (preferred)
    polygon_geojson: str | None = None            # serialized fallback
    sowing_date: date
    claim_date: date
    state: str = Field(..., min_length=2, max_length=2)
    declared_crop: str
    # When called directly from claims-service after Kafka flow:
    satellite_result: dict[str, Any] | None = None


class AnalyzeResponse(BaseModel):
    udlrn: str
    fraud_score: int = Field(..., ge=0, le=100)
    ndvi_sowing: float | None = None
    ndvi_claim: float | None = None
    ndvi_loss_map_url: str | None = None
    true_color_url: str | None = None
    evidence_pdf_url: str | None = None
    flags: list[str] = []
    recommendation: str
    confidence: float = Field(..., ge=0, le=1)
    model_versions: dict[str, str]
    area_satellite_ha: float | None = None
    cloud_cover_pct: float | None = None
    sar_used: bool = False
