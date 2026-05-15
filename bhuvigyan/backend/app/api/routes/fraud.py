from fastapi import APIRouter
from app.models.land import FraudScoreRequest
from app.services.fraud_service import compute_fraud_score

router = APIRouter()


@router.post("/score")
async def fraud_score(payload: FraudScoreRequest):
    result = compute_fraud_score(
        payload.ndvi_data,
        payload.timeseries_data,
        payload.polygon_data,
        payload.claimed_area_ha,
        payload.claimed_crop
    )
    return result
