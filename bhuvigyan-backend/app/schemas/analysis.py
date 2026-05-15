from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class AnalysisRequest(BaseModel):
    district: str = Field(..., description="District name (e.g., Bengaluru Rural)")
    taluk: str = Field(..., description="Taluk name")
    hobli: str = Field(..., description="Hobli name")
    village: str = Field(..., description="Village name")
    survey_number: str = Field(..., description="Survey number")
    hissa_number: str = Field(default="1", description="Hissa number")
    kgis_village_id: str = Field(default="", description="KGIS village ID if known")
    kgis_village_code: str = Field(default="", description="KGIS village code if known")
    lat: Optional[float] = Field(default=None, description="Latitude override")
    lng: Optional[float] = Field(default=None, description="Longitude override")
    declared_crop: str = Field(default="", description="Declared crop type")
    claimed_area_ha: Optional[float] = Field(default=None, description="Farmer claimed area in hectares")


class LandRecordOut(BaseModel):
    owner_name: Optional[str] = None
    all_owners: Optional[List[str]] = None
    survey_number: str
    hissa_number: str = "1"
    area_hectares: Optional[float] = None
    area_acres: Optional[float] = None
    land_type: Optional[str] = None
    surnoc: Optional[str] = None
    period: Optional[str] = None
    source: str = "unknown"
    message: Optional[str] = None


class PolygonOut(BaseModel):
    found: bool
    survey_number: Optional[str] = None
    kgis_village_id: Optional[str] = None
    geojson: Optional[Dict[str, Any]] = None
    leaflet_coords: Optional[List[List[float]]] = None
    centroid_lat: Optional[float] = None
    centroid_lng: Optional[float] = None
    area_ha_computed: Optional[float] = None
    polygon_count: int = 0
    valid: bool = True
    issues: Optional[List[str]] = None
    source: Optional[str] = None


class AdminHierarchyOut(BaseModel):
    district: Optional[str] = None
    district_code: Optional[str] = None
    taluk: Optional[str] = None
    taluk_code: Optional[str] = None
    hobli: Optional[str] = None
    hobli_code: Optional[str] = None
    village: Optional[str] = None
    village_code: Optional[str] = None
    kgis_village_id: Optional[str] = None
    found: bool = False


class NDVITimeseriesPoint(BaseModel):
    date: str
    ndvi: float
    label: str
    is_anomaly: bool = False


class NDVIOut(BaseModel):
    mean: Optional[float] = None
    health_label: Optional[str] = None
    interpretation: Optional[str] = None
    scan_date: Optional[str] = None
    cloud_cover_pct: Optional[float] = None
    source: str = "unknown"
    timeseries: Optional[List[NDVITimeseriesPoint]] = None
    anomaly_count: int = 0
    error: Optional[str] = None


class FraudFactorOut(BaseModel):
    factor: str
    severity: str
    weight: int
    detail: str


class FraudOut(BaseModel):
    fraud_score: float
    band: str
    verdict: str
    recommendation: str
    factors: List[FraudFactorOut] = []


class AnalysisResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    cached: bool = False
    source: str = "live"
    error: Optional[Dict[str, Any]] = None
