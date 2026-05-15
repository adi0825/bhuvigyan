from fastapi import APIRouter, HTTPException
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_service import run_unified_analysis

router = APIRouter(prefix="/analysis", tags=["Unified Analysis"])


@router.post("/", response_model=AnalysisResponse)
async def analyze_land(body: AnalysisRequest):
    """
    Unified land intelligence endpoint.
    Orchestrates Bhoomi RTC, KGIS polygon, GEE NDVI, and fraud scoring
    into a single backend-coordinated response.
    """
    try:
        result = await run_unified_analysis(
            district=body.district,
            taluk=body.taluk,
            hobli=body.hobli,
            village=body.village,
            survey_number=body.survey_number,
            hissa_number=body.hissa_number,
            kgis_village_id=body.kgis_village_id,
            kgis_village_code=body.kgis_village_code,
            lat=body.lat,
            lng=body.lng,
            declared_crop=body.declared_crop,
            claimed_area_ha=body.claimed_area_ha,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
        )
