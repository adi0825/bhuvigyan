from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class LandHoldingStep1(BaseModel):
    """Step 1 — Land Identity"""
    state: str
    district: str
    taluk: str
    village: str
    survey_number: str
    land_area_acres: Optional[float] = None
    land_area_hectares: Optional[float] = None


class LandHoldingStep2(BaseModel):
    """Step 2 — Optional coordinates / boundary"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary_geojson: Optional[Dict[str, Any]] = None


class LandHoldingStep3(BaseModel):
    """Step 3 — Crop Details"""
    declared_crop: Optional[str] = None
    season: Optional[str] = None  # Kharif / Rabi / Zaid
    sowing_date: Optional[str] = None
    has_multiple_crops: bool = False
    secondary_crop: Optional[str] = None
    secondary_area_pct: Optional[float] = None


class AddLandHoldingRequest(BaseModel):
    """Full land holding submission (all steps combined)"""
    farmer_id: str
    state: str
    district: str
    taluk: str
    village: str
    survey_number: str
    land_area_acres: Optional[float] = None
    land_area_hectares: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary_geojson: Optional[Dict[str, Any]] = None
    declared_crop: Optional[str] = None
    season: Optional[str] = None
    sowing_date: Optional[str] = None
    has_multiple_crops: bool = False
    secondary_crop: Optional[str] = None
    secondary_area_pct: Optional[float] = None


class VerifyLandRequest(BaseModel):
    """Trigger satellite verification for a land holding"""
    land_holding_id: str
    farmer_id: str


class VillageGeocodeRequest(BaseModel):
    """Village geocode auto-suggest"""
    village: str


class CoordinateVerifyRequest(BaseModel):
    """Verify coordinates against declared village"""
    latitude: float
    longitude: float
    declared_village: str
    declared_district: str


class LandHoldingResponse(BaseModel):
    id: str
    farmer_id: str
    label: str  # "Land Holding 1", "Land Holding 2", etc.
    state: str
    district: str
    taluk: str
    village: str
    survey_number: str
    land_area_acres: Optional[float] = None
    land_area_hectares: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary_geojson: Optional[Dict[str, Any]] = None
    declared_crop: Optional[str] = None
    season: Optional[str] = None
    sowing_date: Optional[str] = None
    has_multiple_crops: bool = False
    secondary_crop: Optional[str] = None
    secondary_area_pct: Optional[float] = None
    satellite_verified: bool = False
    verification_status: Optional[str] = None  # pending / in_progress / completed / failed
    created_at: Optional[str] = None


class SatelliteVerificationResponse(BaseModel):
    land_holding_id: str
    label: str
    survey_number: str
    village: str
    district: str
    state: str
    area_verified_ha: Optional[float] = None
    area_declared_ha: Optional[float] = None
    area_match_status: Optional[str] = None  # Matched / Mismatch detected
    crop_mix: Optional[Dict[str, Any]] = None
    ndvi_status: Optional[str] = None
    soil_moisture: Optional[str] = None
    last_satellite_date: Optional[str] = None
    zones: Optional[List[Dict[str, Any]]] = None
    ndvi_timeseries: Optional[List[Dict[str, Any]]] = None
    zone_lines: Optional[List[Dict[str, Any]]] = None
    anomalies: Optional[List[Dict[str, Any]]] = None
    moisture_data: Optional[Dict[str, Any]] = None
    historical_baseline: Optional[Dict[str, Any]] = None
    tile_urls: Optional[Dict[str, str]] = None
    source: Optional[str] = None
    used_radar_fallback: Optional[bool] = None
    pipeline_steps: Optional[List[Dict[str, str]]] = None
    truth_packet: Optional[Dict[str, Any]] = None
