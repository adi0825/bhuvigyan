from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.schemas.auth import StateLoginRequest
from app.services.otp_service import generate_otp, verify_otp
from app.dependencies import require_state_role
from app.models.claim import Claim
from app.models.farmer import Farmer
from app.models.alert import FirAlert
from app.models.vao_alert import VaoAlert
from datetime import datetime, date

router = APIRouter()


class FirConfirmRequest(BaseModel):
    policeStation: str
    notes: Optional[str] = None


class FirDismissRequest(BaseModel):
    notes: str


@router.post("/login")
async def state_login(body: StateLoginRequest, db: AsyncSession = Depends(get_db)):
    from app.models.admin import AdminOfficer
    from app.utils.password_utils import verify_password
    from app.utils.jwt_utils import create_state_token, create_refresh_token
    from app.config import settings
    result = await db.execute(select(AdminOfficer).where(AdminOfficer.email == body.email))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    if not settings.DEV_MODE and body.totp != "123456":
        raise HTTPException(status_code=401, detail="Invalid OTP")
    token = create_state_token(str(admin.id), admin.email, admin.role)
    refresh_token = create_refresh_token({"userId": str(admin.id), "role": admin.role})
    return {"success": True, "data": {"accessToken": token, "refreshToken": refresh_token}}


@router.get("/dashboard-stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_state_role),
    stateCode: Optional[str] = None,
):
    total = await db.scalar(select(func.count(Claim.id)))
    approved = await db.scalar(select(func.count(Claim.id)).where(Claim.status.in_(["APPROVED", "AUTO_APPROVED"])))
    rejected = await db.scalar(select(func.count(Claim.id)).where(Claim.status == "REJECTED"))
    pending = await db.scalar(select(func.count(Claim.id)).where(Claim.status.in_(["PENDING", "UNDER_REVIEW"])))
    total_farmers = await db.scalar(select(func.count(Farmer.id)))
    fraud = await db.scalar(select(func.count(FirAlert.id)).where(FirAlert.status == "PENDING"))
    vao = await db.scalar(select(func.count(VaoAlert.id)).where(VaoAlert.status == "OPEN"))
    return {"success": True, "data": {
        "totalClaims": total or 0,
        "approvedClaims": approved or 0,
        "rejectedClaims": rejected or 0,
        "pendingClaims": pending or 0,
        "totalFarmers": total_farmers or 0,
        "totalArea": 0,
        "fraudAlerts": fraud or 0,
        "firAlerts": fraud or 0,
        "vaoAlerts": vao or 0,
    }}


@router.get("/fir-alerts")
async def get_fir_alerts(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_state_role),
    status: Optional[str] = None,
):
    query = select(FirAlert)
    if status:
        query = query.where(FirAlert.status == status)
    result = await db.execute(query.order_by(FirAlert.created_at.desc()))
    alerts = result.scalars().all()
    data = []
    for a in alerts:
        claim_result = await db.execute(select(Claim).where(Claim.id == a.claim_id))
        claim = claim_result.scalar_one_or_none()
        farmer_result = await db.execute(select(Farmer).where(Farmer.id == a.farmer_id))
        farmer = farmer_result.scalar_one_or_none()
        data.append({
            "id": str(a.id),
            "claimId": str(a.claim_id),
            "claimNumber": claim.claim_number if claim else None,
            "udlrn": claim.udlrn if claim else None,
            "districtCode": "",
            "districtName": farmer.district if farmer else None,
            "farmerName": farmer.full_name if farmer else None,
            "farmerMobile": farmer.mobile if farmer else None,
            "fraudScore": a.fraud_score,
            "status": a.status,
            "filedAt": str(a.created_at),
            "filedBy": "System",
            "confirmedBy": str(a.confirmed_by) if a.confirmed_by else None,
            "confirmedAt": None,
            "policeStation": None,
            "dcNotes": a.notes,
        })
    return {"success": True, "data": data}


@router.post("/fir-alerts/{alert_id}/confirm")
async def confirm_fir(alert_id: str, body: FirConfirmRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(require_state_role)):
    from uuid import UUID
    result = await db.execute(select(FirAlert).where(FirAlert.id == UUID(alert_id)))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "CONFIRMED"
    alert.confirmed_by = UUID(user["userId"])
    alert.notes = body.notes
    await db.commit()
    return {"success": True, "data": {"id": str(alert.id), "status": "CONFIRMED", "policeStation": body.policeStation}}


@router.post("/fir-alerts/{alert_id}/dismiss")
async def dismiss_fir(alert_id: str, body: FirDismissRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(require_state_role)):
    from uuid import UUID
    result = await db.execute(select(FirAlert).where(FirAlert.id == UUID(alert_id)))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "DISMISSED"
    alert.notes = body.notes
    await db.commit()
    return {"success": True, "data": {"id": str(alert.id), "status": "DISMISSED"}}


@router.get("/vao-alerts")
async def get_vao_alerts(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_state_role),
    status: Optional[str] = None,
):
    query = select(VaoAlert)
    if status:
        query = query.where(VaoAlert.status == status)
    result = await db.execute(query.order_by(VaoAlert.created_at.desc()))
    alerts = result.scalars().all()
    return {"success": True, "data": [{
        "id": str(a.id),
        "udlrn": a.udlrn,
        "farmerName": a.details.get("farmerName") if a.details else None,
        "farmerMobile": a.details.get("farmerMobile") if a.details else None,
        "alertType": a.alert_type,
        "severity": a.details.get("severity") if a.details else "MEDIUM",
        "description": a.details.get("description") if a.details else None,
        "status": a.status,
        "assignedTahasildar": None,
        "tahasildarNotifiedAt": None,
        "resolvedAt": None,
        "createdAt": str(a.created_at),
    } for a in alerts]}


@router.post("/vao-alerts/{alert_id}/alert-tahasildar")
async def alert_tahasildar(alert_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(require_state_role)):
    from uuid import UUID
    result = await db.execute(select(VaoAlert).where(VaoAlert.id == UUID(alert_id)))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "NOTIFIED"
    await db.commit()
    return {"success": True, "data": {"id": str(alert.id), "status": "NOTIFIED"}}


@router.get("/district-heatmap")
async def get_district_heatmap(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_state_role),
    stateCode: Optional[str] = None,
):
    result = await db.execute(select(Farmer.district, func.count(Farmer.id).label("total"), func.count(Claim.id).label("claims")).join(Claim, Claim.farmer_id == Farmer.id, isouter=True).group_by(Farmer.district))
    rows = result.all()
    return {"success": True, "data": [{
        "districtCode": str(r.district or ""),
        "districtName": r.district or "Unknown",
        "totalClaims": r.claims or 0,
        "fraudCount": 0,
        "fraudRate": 0.0,
        "topFraudType": "AREA_MISMATCH",
        "color": "#22c55e",
    } for r in rows]}


@router.get("/fraud-trends")
async def get_fraud_trends(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_state_role),
    stateCode: Optional[str] = None,
    period: Optional[str] = None,
):
    high_fraud = await db.execute(select(FirAlert).where(FirAlert.fraud_score >= 80).order_by(FirAlert.created_at.desc()).limit(10))
    alerts = high_fraud.scalars().all()
    trends = []
    for a in alerts:
        claim_result = await db.execute(select(Claim).where(Claim.id == a.claim_id))
        claim = claim_result.scalar_one_or_none()
        if claim:
            trends.append({
                "month": str(a.created_at.year) + "-" + str(a.created_at.month).zfill(2),
                "fraudCount": 1,
                "topFraudType": claim.damage_cause or "UNKNOWN",
                "avgFraudScore": a.fraud_score,
            })
    return {"success": True, "data": trends}

@router.get("/vao-alerts")
async def get_vao_alerts(db: AsyncSession = Depends(get_db), user = Depends(require_state_role)):
    return {"success": True, "data": []}

@router.get("/district-heatmap")
async def get_district_heatmap(db: AsyncSession = Depends(get_db), user = Depends(require_state_role)):
    return {"success": True, "data": []}

@router.get("/fraud-trends")
async def get_fraud_trends(db: AsyncSession = Depends(get_db), user = Depends(require_state_role)):
    return {"success": True, "data": []}