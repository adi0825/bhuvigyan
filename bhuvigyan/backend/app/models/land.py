from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class LandSearchRequest(BaseModel):
    village_code: str
    survey_number: str
    claimed_area_ha: Optional[float] = None
    claimed_crop: Optional[str] = None


class NDVIComputeRequest(BaseModel):
    geojson_geometry: Dict[str, Any]
    survey_number: str
    months_back: int = 1


class NDVITimeseriesRequest(BaseModel):
    geojson_geometry: Dict[str, Any]
    survey_number: str
    months: int = 12


class FraudScoreRequest(BaseModel):
    ndvi_data: Dict[str, Any] = {}
    timeseries_data: Dict[str, Any] = {}
    polygon_data: Dict[str, Any] = {}
    claimed_area_ha: Optional[float] = None
    claimed_crop: Optional[str] = None
