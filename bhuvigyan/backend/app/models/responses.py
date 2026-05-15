from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class AdminHierarchyResponse(BaseModel):
    found: bool
    district_name: Optional[str] = None
    taluk_name: Optional[str] = None
    hobli_name: Optional[str] = None
    village_name: Optional[str] = None
    cached: bool = False


class PolygonResponse(BaseModel):
    found: bool
    centroid_lat: Optional[float] = None
    centroid_lng: Optional[float] = None
    area_ha: Optional[float] = None
    leaflet_polygons: List[List[List[float]]] = []
    geojson_feature: Optional[Dict[str, Any]] = None
    validation: Optional[Dict[str, Any]] = None
    survey_number: Optional[str] = None
    cached: bool = False


class NDVIResponse(BaseModel):
    ndvi: Optional[Dict[str, Any]] = None
    ndwi: Optional[Dict[str, Any]] = None
    imagery: Optional[Dict[str, Any]] = None
    period: Optional[str] = None
    cached: bool = False
    error: Optional[str] = None


class FraudResponse(BaseModel):
    fraud_score: float
    band: str
    recommendation: str
    factors: List[Dict[str, Any]] = []
    factor_count: int
    ndvi_mean: Optional[float] = None
    ndwi_mean: Optional[float] = None
    anomaly_count: int
    actual_area_ha: Optional[float] = None
