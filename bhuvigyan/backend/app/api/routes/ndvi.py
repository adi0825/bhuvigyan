from fastapi import APIRouter
from app.models.land import NDVIComputeRequest, NDVITimeseriesRequest
from app.services.ndvi_service import (
    compute_ndvi_for_polygon,
    compute_ndvi_timeseries
)

router = APIRouter()


@router.post("/compute")
async def compute_ndvi(payload: NDVIComputeRequest):
    return await compute_ndvi_for_polygon(
        payload.geojson_geometry,
        payload.survey_number,
        payload.months_back
    )


@router.post("/timeseries")
async def ndvi_timeseries(payload: NDVITimeseriesRequest):
    return await compute_ndvi_timeseries(
        payload.geojson_geometry,
        payload.survey_number,
        payload.months
    )
