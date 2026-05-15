from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services import land_record_service as service

router = APIRouter(prefix="/api/v1/land-records", tags=["Land Records"])

@router.get("/fetch", response_model=service.LandRecordResponse)
async def fetch_land_record(
    district: str = Query(..., description="District name"),
    taluk: str = Query(..., description="Taluk name"),
    hobli: str = Query(..., description="Hobli name"),
    village: str = Query(..., description="Village name"),
    survey_no: str = Query(..., description="Survey number"),
    hissa_no: str = Query(..., description="Hissa number"),
    period: Optional[str] = Query("Current Year", description="Record period")
):
    """
    Fetches real-time land records from the official Karnataka government service.
    """
    request = service.LandRecordRequest(
        district=district,
        taluk=taluk,
        hobli=hobli,
        village=village,
        survey_no=survey_no,
        hissa_no=hissa_no,
        period=period
    )
    
    try:
        response = await service.get_land_record(request)
        return response
    except Exception as e:
        # Fallback structured error
        return service.LandRecordResponse(
            success=False,
            message=str(e),
            input=request
        )
