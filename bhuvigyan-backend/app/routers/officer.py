from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.database import get_db
from app.schemas.auth import OfficerLoginRequest
from app.models.field_officer import FieldOfficer
from app.models.cce_visit import CceVisit
from app.models.claim import Claim
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.utils.jwt_utils import create_officer_token, create_refresh_token
from app.services.otp_service import generate_otp, verify_otp
from app.dependencies import require_officer_role

router = APIRouter()


class InspectionSubmitRequest(BaseModel):
    actualAreaHa: Optional[float] = None
    actualCropCondition: Optional[str] = None
    yieldEstimate: Optional[float] = None
    damagePercentage: Optional[float] = None
    recommendation: Optional[str] = None
    inspectorNotes: Optional[str] = None
    gpsLat: Optional[float] = None
    gpsLng: Optional[float] = None


class SendOtpRequest(BaseModel):
    email: str

@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    otp = await generate_otp(body.email)
    return {"success": True, "data": {"devOtp": otp}}


@router.post("/login")
async def officer_login(body: OfficerLoginRequest, db: AsyncSession = Depends(get_db)):
    is_valid = await verify_otp(body.email, body.otp)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    result = await db.execute(select(FieldOfficer).where(FieldOfficer.email == body.email))
    officer = result.scalar_one_or_none()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    token = create_officer_token(str(officer.id), officer.email, officer.role)
    refresh_token = create_refresh_token({"userId": str(officer.id), "email": officer.email, "role": officer.role})
    return {"success": True, "data": {"accessToken": token, "refreshToken": refresh_token}}


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_officer_role),
):
    from uuid import UUID
    total = await db.scalar(select(func.count(CceVisit.id)).where(CceVisit.assigned_to == UUID(user["userId"])))
    completed = await db.scalar(select(func.count(CceVisit.id)).where(CceVisit.assigned_to == UUID(user["userId"]), CceVisit.status == "COMPLETED"))
    pending = await db.scalar(select(func.count(CceVisit.id)).where(CceVisit.assigned_to == UUID(user["userId"]), CceVisit.status.in_(["ASSIGNED", "IN_PROGRESS"])))
    today_date = date.today()
    completed_today = await db.scalar(
        select(func.count(CceVisit.id)).where(
            CceVisit.assigned_to == UUID(user["userId"]),
            CceVisit.status == "COMPLETED",
        )
    )
    return {"success": True, "data": {
        "totalVisits": total or 0,
        "completedToday": completed_today or 0,
        "pendingVisits": pending or 0,
        "overdueVisits": 0,
    }}


@router.get("/visits")
async def get_visits(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_officer_role),
):
    from uuid import UUID
    result = await db.execute(
        select(CceVisit).where(CceVisit.assigned_to == UUID(user["userId"])).order_by(CceVisit.scheduled_date.desc())
    )
    visits = result.scalars().all()
    data = []
    for v in visits:
        claim_result = await db.execute(select(Claim).where(Claim.id == v.claim_id))
        claim = claim_result.scalar_one_or_none()
        farmer_result = await db.execute(select(Farmer).where(Farmer.id == v.farmer_id))
        farmer = farmer_result.scalar_one_or_none()
        udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == v.udlrn))
        udlrn = udlrn_result.scalar_one_or_none()
        data.append({
            "id": str(v.id),
            "claimId": str(v.claim_id),
            "claimNumber": claim.claim_number if claim else None,
            "udlrn": v.udlrn,
            "farmerName": farmer.full_name if farmer else None,
            "farmerMobile": farmer.mobile if farmer else None,
            "village": farmer.village if farmer else None,
            "status": v.status,
            "assignedAt": str(v.created_at),
            "dueBy": str(v.scheduled_date),
            "priority": "NORMAL",
            "gpsLat": float(v.gps_lat) if v.gps_lat else None,
            "gpsLng": float(v.gps_lng) if v.gps_lng else None,
            "distanceFromPlot": v.gps_distance_m,
            "actualAreaHa": float(v.area_visited_ha) if v.area_visited_ha else None,
            "actualCropCondition": v.crop_found,
            "cceVerdict": v.recommendation,
            "inspectorNotes": v.remarks,
        })
    return {"success": True, "data": data}


@router.get("/visits/{visit_id}")
async def get_visit(visit_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(require_officer_role)):
    from uuid import UUID
    result = await db.execute(select(CceVisit).where(CceVisit.id == UUID(visit_id)))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visit not found")
    claim_result = await db.execute(select(Claim).where(Claim.id == v.claim_id))
    claim = claim_result.scalar_one_or_none()
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == v.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == v.udlrn))
    udlrn = udlrn_result.scalar_one_or_none()
    return {"success": True, "data": {
        "id": str(v.id),
        "claimId": str(v.claim_id),
        "claimNumber": claim.claim_number if claim else None,
        "udlrn": v.udlrn,
        "farmerName": farmer.full_name if farmer else None,
        "farmerMobile": farmer.mobile if farmer else None,
        "village": farmer.village if farmer else None,
        "status": v.status,
        "assignedAt": str(v.created_at),
        "dueBy": str(v.scheduled_date),
        "priority": "NORMAL",
        "gpsLat": float(v.gps_lat) if v.gps_lat else None,
        "gpsLng": float(v.gps_lng) if v.gps_lng else None,
        "distanceFromPlot": v.gps_distance_m,
        "actualAreaHa": float(v.area_visited_ha) if v.area_visited_ha else None,
        "actualCropCondition": v.crop_found,
        "cceVerdict": v.recommendation,
        "inspectorNotes": v.remarks,
        "declaredCrop": udlrn.declared_crop if udlrn else None,
        "declaredAreaHa": float(udlrn.land_area_ha) if udlrn else None,
    }}


@router.post("/visits/{visit_id}/start")
async def start_inspection(visit_id: str, body: dict, db: AsyncSession = Depends(get_db), user: dict = Depends(require_officer_role)):
    from uuid import UUID
    result = await db.execute(select(CceVisit).where(CceVisit.id == UUID(visit_id)))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visit not found")
    v.status = "IN_PROGRESS"
    v.visit_date = datetime.utcnow()
    if "gpsLat" in body and body["gpsLat"]:
        v.gps_lat = body["gpsLat"]
    if "gpsLng" in body and body["gpsLng"]:
        v.gps_lng = body["gpsLng"]
    await db.commit()
    return {"success": True, "data": {"id": str(v.id), "status": "IN_PROGRESS", "visitStartedAt": str(v.visit_date)}}


@router.post("/visits/{visit_id}/submit")
async def submit_inspection(visit_id: str, body: InspectionSubmitRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(require_officer_role)):
    from uuid import UUID
    result = await db.execute(select(CceVisit).where(CceVisit.id == UUID(visit_id)))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visit not found")
    v.status = "COMPLETED"
    if body.actualAreaHa is not None:
        v.area_visited_ha = body.actualAreaHa
    if body.actualCropCondition:
        v.crop_found = body.actualCropCondition
    if body.yieldEstimate is not None:
        v.yield_estimate = body.yieldEstimate
    if body.damagePercentage is not None:
        v.damage_percent = body.damagePercentage
    if body.recommendation:
        v.recommendation = body.recommendation
    if body.inspectorNotes:
        v.remarks = body.inspectorNotes
    if body.gpsLat is not None:
        v.gps_lat = body.gpsLat
    if body.gpsLng is not None:
        v.gps_lng = body.gpsLng
    if body.actualCropCondition and body.actualAreaHa:
        v.crop_match = "YES"
    v.checklist = {
        "areaChecked": body.actualAreaHa is not None,
        "cropChecked": body.actualCropCondition is not None,
        "damageAssessed": body.damagePercentage is not None,
    }
    await db.commit()
    return {"success": True, "data": {"id": str(v.id), "status": "COMPLETED"}}


@router.post("/visits/{visit_id}/photos")
async def upload_photos(visit_id: str, files: List[UploadFile] = File(...), db: AsyncSession = Depends(get_db), user: dict = Depends(require_officer_role)):
    return {"success": True, "data": {"visitId": visit_id, "uploadedCount": len(files)}}


@router.get("/visits/{visit_id}/photos")
async def get_photos(visit_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(require_officer_role)):
    return {"success": True, "data": []}