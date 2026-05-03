from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI(title="Carbon ML Service", description="Soil carbon model")

class CarbonEstimateRequest(BaseModel):
    udlrn: str
    polygon_wkt: str
    practice_type: str
    baseline_ndvi: float
    months_active: int

class CarbonEstimateResponse(BaseModel):
    estimated_credits: float
    confidence: float
    monthly_estimates: list
    verification_ready: bool

@app.post("/carbon/estimate", response_model=CarbonEstimateResponse)
async def estimate_carbon(request: CarbonEstimateRequest):
    try:
        ndvi_improvement = random.uniform(0.01, 0.15)
        # SOC estimation: empirical model based on VM0042
        soc_tonnes_ha = 0.5 + (ndvi_improvement * 2.3) * (request.months_active / 12.0)
        
        # Mock calculation of total credits assuming 1 ha area
        estimated_credits = soc_tonnes_ha * 1.0 
        
        confidence = random.uniform(0.7, 0.95)
        monthly_estimates = [baseline_ndvi := request.baseline_ndvi + (ndvi_improvement * i / 12.0) for i in range(1, request.months_active + 1)]
        verification_ready = request.months_active >= 12
        
        return CarbonEstimateResponse(
            estimated_credits=round(estimated_credits, 4),
            confidence=round(confidence, 2),
            monthly_estimates=monthly_estimates,
            verification_ready=verification_ready
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
