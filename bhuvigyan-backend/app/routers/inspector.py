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
    report, error = await inspector_service.submit_inspection_report(
        db, visit_id, inspector_id, body.model_dump()
    )
    if error:
        raise HTTPException(400, error)
    return {"success": True, "data": report}


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
