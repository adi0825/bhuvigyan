"""Inspector API endpoints — field inspector portal."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import inspector_service
from app.schemas.inspector import (
    FieldInspectorUpdate,
    FieldVisitAcknowledge,
    FieldVisitStart,
    FieldInspectionReportCreate,
    CcePlotCreate,
)

router = APIRouter(prefix="/inspector", tags=["Inspector"])


def _get_inspector_id(token_data: dict = None) -> str:
    """Extract inspector_id from auth context. Placeholder until auth is wired."""
    # TODO: wire to actual auth dependency
    return None


# ── Profile ──

@router.get("/profile")
async def get_profile(inspector_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    inspector = await inspector_service.get_inspector_profile(db, inspector_id)
    if not inspector:
        raise HTTPException(404, "Inspector not found")
    return {"success": True, "data": inspector}


@router.put("/profile")
async def update_profile(
    updates: FieldInspectorUpdate,
    inspector_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    inspector = await inspector_service.update_inspector(db, inspector_id, updates.model_dump(exclude_none=True))
    if not inspector:
        raise HTTPException(404, "Inspector not found")
    return {"success": True, "data": inspector}


# ── Dashboard ──

@router.get("/dashboard")
async def get_dashboard(inspector_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    dashboard = await inspector_service.get_inspector_dashboard(db, inspector_id)
    return {"success": True, "data": dashboard}


# ── Visits ──

@router.get("/visits")
async def list_visits(
    inspector_id: str = Query(...),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    visits = await inspector_service.get_inspector_visits(db, inspector_id, status)
    return {"success": True, "data": visits}


@router.get("/visits/{visit_id}")
async def get_visit_detail(visit_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.field_visit import FieldVisit
    from sqlalchemy import select
    result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")
    return {"success": True, "data": visit}


@router.post("/visits/{visit_id}/acknowledge")
async def acknowledge_visit(
    visit_id: str,
    body: FieldVisitAcknowledge,
    inspector_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    visit = await inspector_service.acknowledge_visit(db, visit_id, inspector_id, body.scheduled_date)
    if not visit:
        raise HTTPException(404, "Visit not found or not assigned to you")
    return {"success": True, "data": visit}


@router.post("/visits/{visit_id}/start")
async def start_visit(
    visit_id: str,
    body: FieldVisitStart,
    inspector_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    visit = await inspector_service.start_visit(db, visit_id, inspector_id, body.gps_lat, body.gps_lng)
    if not visit:
        raise HTTPException(404, "Visit not found or not assigned to you")
    return {"success": True, "data": visit}


@router.delete("/visits/{visit_id}/abandon")
async def abandon_visit(
    visit_id: str,
    body: dict,
    inspector_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    from app.models.field_visit import FieldVisit
    from sqlalchemy import select
    result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")
    visit.status = "assigned"  # re-queue
    await db.commit()
    return {"success": True, "message": "Visit abandoned and re-queued"}


# ── Inspection Report ──

@router.post("/visits/{visit_id}/report")
async def submit_report(
    visit_id: str,
    body: FieldInspectionReportCreate,
    inspector_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Submit inspection report with GPS distance validation against farm centroid."""
    from app.models.field_visit import FieldVisit
    from app.models.claim import Claim
    from app.models.farmer import Farmer
    from sqlalchemy import select
    from app.services.land_service import LandVerifier

    # Fetch visit -> claim -> farmer coordinates
    visit_result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = visit_result.scalar_one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")

    claim_result = await db.execute(select(Claim).where(Claim.id == visit.claim_id))
    claim = claim_result.scalar_one_or_none()

    farmer = None
    if claim:
        farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
        farmer = farmer_result.scalar_one_or_none()

    # GPS enforcement: inspector submission GPS vs farm centroid
    gps_warning = None
    body_data = body.model_dump()
    inspector_lat = body_data.get("gps_lat")
    inspector_lng = body_data.get("gps_lng")

    if farmer and farmer.latitude and farmer.longitude and inspector_lat and inspector_lng:
        lv = LandVerifier()
        dist_km = lv.distance_km(
            float(farmer.latitude), float(farmer.longitude),
            float(inspector_lat), float(inspector_lng)
        )
        if dist_km > 1.0:
            gps_warning = f"Inspector GPS is {dist_km:.2f}km from farm centroid (max 1km). Report flagged for admin review."
            # Attach warning to report metadata
            meta = body_data.get("meta_data") or {}
            meta["gps_distance_km"] = dist_km
            meta["gps_warning"] = gps_warning
            body_data["meta_data"] = meta

    report, error = await inspector_service.submit_inspection_report(
        db, visit_id, inspector_id, body_data
    )
    if error:
        raise HTTPException(400, error)

    return {
        "success": True,
        "data": report,
        "gps_warning": gps_warning,
    }


@router.get("/visits/{visit_id}/satellite-brief")
async def get_satellite_brief(
    visit_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Pre-visit satellite intelligence: NDVI, SAR, flood for the farm."""
    from app.models.field_visit import FieldVisit
    from app.models.claim import Claim
    from app.models.farmer import Farmer
    from sqlalchemy import select
    from app.services.satellite_service import SatelliteService

    visit_result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = visit_result.scalar_one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")

    claim_result = await db.execute(select(Claim).where(Claim.id == visit.claim_id))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        raise HTTPException(404, "Claim not found for this visit")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer or not farmer.latitude or not farmer.longitude:
        raise HTTPException(400, "Farm coordinates not available")

    svc = SatelliteService()
    lat, lng = float(farmer.latitude), float(farmer.longitude)
    ndvi = svc.get_ndvi_current(lat, lng)
    ndwi = svc.get_ndwi(lat, lng)
    sar = svc.get_sar_flood(lat, lng)
    ts = svc.get_ndvi_timeseries(lat, lng, months=6)

    return {
        "success": True,
        "data": {
            "farm_location": {"lat": lat, "lng": lng, "village": farmer.village, "district": farmer.district},
            "ndvi_current": ndvi if isinstance(ndvi, dict) else None,
            "ndwi_current": ndwi if isinstance(ndwi, dict) else None,
            "sar_flood": sar if isinstance(sar, dict) else None,
            "ndvi_timeseries_6m": ts,
            "claim_damage_type": claim.damage_cause,
            "claim_loss_date": str(claim.loss_date) if claim.loss_date else None,
        },
    }


@router.post("/visits/{visit_id}/photos")
async def upload_photos(
    visit_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    from app.models.field_inspection_report import FieldInspectionReport
    from sqlalchemy import select
    result = await db.execute(
        select(FieldInspectionReport).where(FieldInspectionReport.visit_id == visit_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found for this visit")
    existing = report.photos or []
    new_photos = body.get("photos", [])
    report.photos = existing + new_photos
    await db.commit()
    return {"success": True, "data": {"photo_count": len(report.photos)}}


@router.post("/visits/{visit_id}/cce-plots")
async def add_cce_plot(
    visit_id: str,
    body: CcePlotCreate,
    db: AsyncSession = Depends(get_db),
):
    plot = await inspector_service.add_cce_plot(db, visit_id, body.model_dump())
    return {"success": True, "data": plot}


# ── History ──

@router.get("/visits/history")
async def visit_history(
    inspector_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    visits = await inspector_service.get_inspector_visits(db, inspector_id, status="submitted")
    return {"success": True, "data": visits}
