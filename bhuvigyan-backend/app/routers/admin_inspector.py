"""Admin endpoints for inspector management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import inspector_service
from app.schemas.inspector import (
    FieldInspectorCreate,
    FieldInspectorUpdate,
    FieldVisitAssign,
    ReportVerify,
)

router = APIRouter(prefix="/admin/inspectors", tags=["Admin — Inspector Management"])


@router.post("")
async def create_inspector(body: FieldInspectorCreate, db: AsyncSession = Depends(get_db)):
    inspector = await inspector_service.create_inspector(db, body.model_dump())
    return {"success": True, "data": inspector}


@router.get("")
async def list_inspectors(
    state: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    inspectors = await inspector_service.list_inspectors(db, state)
    return {"success": True, "data": inspectors}


@router.get("/{inspector_id}")
async def get_inspector(inspector_id: str, db: AsyncSession = Depends(get_db)):
    inspector = await inspector_service.get_inspector_profile(db, inspector_id)
    if not inspector:
        raise HTTPException(404, "Inspector not found")
    return {"success": True, "data": inspector}


@router.put("/{inspector_id}")
async def update_inspector(
    inspector_id: str,
    body: FieldInspectorUpdate,
    db: AsyncSession = Depends(get_db),
):
    inspector = await inspector_service.update_inspector(
        db, inspector_id, body.model_dump(exclude_none=True)
    )
    if not inspector:
        raise HTTPException(404, "Inspector not found")
    return {"success": True, "data": inspector}


@router.post("/claims/{claim_id}/assign-inspector")
async def assign_inspector(
    claim_id: str,
    body: FieldVisitAssign,
    admin_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    visit, error = await inspector_service.assign_inspector_to_claim(
        db, claim_id, admin_id, body.model_dump()
    )
    if error:
        raise HTTPException(400, error)
    return {"success": True, "data": visit}


@router.get("/visits")
async def list_all_visits(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from app.models.field_visit import FieldVisit
    from sqlalchemy import select
    query = select(FieldVisit)
    if status:
        query = query.where(FieldVisit.status == status)
    result = await db.execute(query.order_by(FieldVisit.due_date.asc()))
    return {"success": True, "data": result.scalars().all()}


@router.get("/visits/{visit_id}")
async def get_visit_detail(visit_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.field_visit import FieldVisit
    from app.models.field_inspection_report import FieldInspectionReport
    from sqlalchemy import select
    visit_result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = visit_result.scalar_one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")

    report_result = await db.execute(
        select(FieldInspectionReport).where(FieldInspectionReport.visit_id == visit_id)
    )
    report = report_result.scalar_one_or_none()
    return {"success": True, "data": {"visit": visit, "report": report}}


@router.put("/visits/{visit_id}/verify-report")
async def verify_report(
    visit_id: str,
    body: ReportVerify,
    db: AsyncSession = Depends(get_db),
):
    visit = await inspector_service.verify_report(db, visit_id, body.verified, body.admin_notes)
    if not visit:
        raise HTTPException(404, "Visit not found")
    return {"success": True, "data": visit}


@router.get("/performance")
async def inspector_performance(db: AsyncSession = Depends(get_db)):
    from app.models.field_inspector import FieldInspector
    from sqlalchemy import select
    result = await db.execute(
        select(FieldInspector).where(FieldInspector.is_active == True)
        .order_by(FieldInspector.completed_visits.desc())
    )
    inspectors = result.scalars().all()
    performance = []
    for insp in inspectors:
        rate = (insp.completed_visits / insp.total_visits * 100) if insp.total_visits and insp.total_visits > 0 else 0
        performance.append({
            "id": str(insp.id),
            "full_name": insp.full_name,
            "employee_id": insp.employee_id,
            "total_visits": insp.total_visits,
            "completed_visits": insp.completed_visits,
            "completion_rate_pct": round(rate, 1),
            "districts": insp.districts_assigned,
        })
    return {"success": True, "data": performance}
