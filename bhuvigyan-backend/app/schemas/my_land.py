from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class VillageGeocodeRequest(BaseModel):
    village: str


class CoordinateVerifyRequest(BaseModel):
    declared_village: str
    declared_district: str
    latitude: float
    longitude: float


class AddLandHoldingRequest(BaseModel):
    farmer_id: str
    state: str
    district: str
    taluk: str
    village: str
    survey_number: str
    land_area_acres: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    declared_crop: Optional[str] = None
    season: Optional[str] = None
    sowing_date: Optional[str] = None
    has_multiple_crops: bool = False
    secondary_crop: Optional[str] = None


class VerifyLandRequest(BaseModel):
    land_holding_id: str
    farmer_id: str


class CropInfo(BaseModel):
    name: str
    confidence: float
    area_pct: float


class CropMixResult(BaseModel):
    primary_crop: str
    primary_confidence: float
    crops: List[CropInfo]
    bare_soil_pct: float
    intercropping_detected: bool


class NDVIZone(BaseModel):
    zone_id: str
    ndvi_mean: float
    label: str
    health_badge: str
    pixel_count: int
    area_pct: float


class Anomaly(BaseModel):
    date: str
    type: str
    severity: str
    description: str
    drop_magnitude: Optional[float] = None


class ZoneLine(BaseModel):
    zone: str
    color: str
    data: List[Dict[str, Any]]


class SatelliteVerification(BaseModel):
    verification_status: str
    ndvi_mean: Optional[float]
    ndvi_status: str
    soil_moisture: Optional[str]
    source: Optional[str]
    used_radar_fallback: bool
    crop_mix: Optional[CropMixResult]
    anomalies: List[Anomaly]
    zones: List[NDVIZone]
    timeseries: List[Dict[str, Any]]
    zone_lines: List[ZoneLine]
    scan_date: Optional[str]
    truth_packet: Optional[Dict[str, Any]]
