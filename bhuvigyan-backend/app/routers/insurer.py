from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.schemas.auth import InsurerLoginRequest
from app.models.insurer import Insurer
from app.models.claim import Claim
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.utils.jwt_utils import create_insurer_token, create_refresh_token
from app.utils.password_utils import verify_password

router = APIRouter()


class ClaimApproveRequest(BaseModel):
    notes: Optional[str] = None
    approvedAmount: Optional[float] = None


class ClaimRejectRequest(BaseModel):
    reason: str


@router.post("/login")
async def insurer_login(body: InsurerLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Insurer).where(Insurer.email == body.email))
    insurer = result.scalar_one_or_none()
    if not insurer:
        return {"success": False, "error": {"message": "Invalid credentials"}}
    if not verify_password(body.password, insurer.password_hash):
        return {"success": False, "error": {"message": "Invalid password"}}
    token = create_insurer_token(str(insurer.id), insurer.email)
    refresh_token = create_refresh_token({"userId": str(insurer.id), "email": insurer.email})
    return {"success": True, "data": {"accessToken": token, "refreshToken": refresh_token}}


@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db), user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role)):
    from app.dependencies import require_insurer_role
    total = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"]))
    pending = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"], Claim.status.in_(["PENDING", "UNDER_REVIEW"])))
    approved = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"], Claim.status.in_(["APPROVED", "AUTO_APPROVED"])))
    rejected = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"], Claim.status == "REJECTED"))
    return {"success": True, "data": {
        "totalClaims": total or 0,
        "pendingReview": pending or 0,
        "approved": approved or 0,
        "rejected": rejected or 0,
        "totalAmount": 0,
        "approvedAmount": 0,
        "pendingAmount": 0,
    }}


@router.get("/claims")
async def get_claims(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role),
    status: Optional[str] = None,
    district: Optional[str] = None,
    fromDate: Optional[str] = None,
    toDate: Optional[str] = None,
):
    from app.dependencies import require_insurer_role
    query = select(Claim)
    if status:
        query = query.where(Claim.status == status)
    query = query.where(Claim.insurer_id == user["userId"])
    result = await db.execute(query.order_by(Claim.created_at.desc()))
    claims = result.scalars().all()
    return {"success": True, "data": [{
        "id": str(c.id),
        "claimNumber": c.claim_number,
        "udlrn": c.udlrn,
        "status": c.status,
        "fraudScore": c.fraud_score,
        "declaredCrop": c.declared_crop,
        "claimedAreaHa": float(c.claimed_area_ha),
        "damagePercent": float(c.damage_percent) if c.damage_percent else None,
        "damageCause": c.damage_cause,
        "filedAt": str(c.created_at),
    } for c in claims]}


@router.get("/claims/{claim_id}")
async def get_claim(claim_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role)):
    from app.dependencies import require_insurer_role
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == claim.udlrn))
    udlrn = udlrn_result.scalar_one_or_none()
    return {"success": True, "data": {
        "id": str(claim.id),
        "claimNumber": claim.claim_number,
        "udlrn": claim.udlrn,
        "status": claim.status,
        "fraudScore": claim.fraud_score,
        "fraudVerdict": claim.fraud_verdict,
        "fraudSignals": claim.fraud_signals,
        "fraudFeatures": claim.fraud_features,
        "declaredCrop": claim.declared_crop,
        "claimedAreaHa": float(claim.claimed_area_ha),
        "damagePercent": float(claim.damage_percent) if claim.damage_percent else None,
        "damageCause": claim.damage_cause,
        "ndviAtClaim": float(claim.ndvi_at_claim) if claim.ndvi_at_claim else None,
        "satelliteData": claim.satellite_data,
        "filedAt": str(claim.created_at),
        "farmerName": farmer.full_name if farmer else None,
        "farmerMobile": farmer.mobile if farmer else None,
        "landAreaHa": float(udlrn.land_area_ha) if udlrn else None,
        "bankName": farmer.bank_name if farmer else None,
        "bankIfsc": farmer.bank_ifsc if farmer else None,
        "bankAccount": farmer.bank_account if farmer else None,
    }}


@router.post("/claims/{claim_id}/approve")
async def approve_claim(claim_id: str, body: ClaimApproveRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role)):
    from app.dependencies import require_insurer_role
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "APPROVED"
    await db.commit()
    return {"success": True, "data": {"id": str(claim.id), "status": "APPROVED", "notes": body.notes}}


@router.post("/claims/{claim_id}/reject")
async def reject_claim(claim_id: str, body: ClaimRejectRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role)):
    from app.dependencies import require_insurer_role
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "REJECTED"
    claim.fraud_verdict = body.reason
    await db.commit()
    return {"success": True, "data": {"id": str(claim.id), "status": "REJECTED", "reason": body.reason}}


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role),
):
    from app.dependencies import require_insurer_role
    total = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"]))
    pending = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"], Claim.status.in_(["PENDING", "UNDER_REVIEW"])))
    approved = await db.scalar(select(func.count(Claim.id)).where(Claim.insurer_id == user["userId"], Claim.status.in_(["APPROVED", "AUTO_APPROVED"])))
    return {"success": True, "data": {
        "totalClaims": total or 0,
        "totalAmount": 0,
        "approvedCount": approved or 0,
        "approvedAmount": 0,
        "pendingCount": pending or 0,
        "pendingAmount": 0,
    }}


@router.get("/settlements")
async def get_settlements(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(__import__("app.dependencies", fromlist=["require_insurer_role"]).require_insurer_role),
    status: Optional[str] = None,
):
    from app.dependencies import require_insurer_role
    from app.models.alert import Settlement
    query = select(Settlement).where(Settlement.insurer_id == user["userId"])
    if status:
        query = query.where(Settlement.status == status)
    result = await db.execute(query.order_by(Settlement.created_at.desc()))
    settlements = result.scalars().all()
    return {"success": True, "data": [{
        "id": str(s.id),
        "claimId": str(s.claim_id),
        "settlementAmount": float(s.amount),
        "status": s.status,
        "paymentDate": str(s.created_at),
    } for s in settlements]}