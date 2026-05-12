from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.claim import Claim
from app.models.udlrn_master import UdlrnMaster
from app.models.farmer import Farmer
from datetime import datetime
from uuid import uuid4
import random

router = APIRouter()

@router.post("/file")
async def create_claim(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    from uuid import UUID
    farmer_udlrn = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn_record = farmer_udlrn.scalar_one_or_none()
    if not udlrn_record:
        raise HTTPException(status_code=404, detail="No land record found. Please register first.")

    claim_id = str(uuid4())
    season_year = datetime.now().year
    claim_number = f"CLM-{random.randint(100000, 999999)}"

    claim = Claim(
        id=UUID(claim_id),
        claim_number=claim_number,
        udlrn=udlrn_record.udlrn,
        farmer_id=UUID(user["userId"]),
        status="DRAFT",
        declared_crop=udlrn_record.declared_crop or "PADDY",
        claimed_area_ha=udlrn_record.land_area_ha,
        season="KHARIF",
        year=season_year,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()
    return {"success": True, "data": {"claimId": claim_id, "claimNumber": claim_number, "status": "DRAFT"}}

@router.get("/my-claims")
async def get_my_claims(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    from uuid import UUID
    result = await db.execute(
        select(Claim).where(Claim.farmer_id == UUID(user["userId"])).order_by(Claim.created_at.desc())
    )
    claims = result.scalars().all()
    return {"success": True, "data": [
        {"id": str(c.id), "claimNumber": c.claim_number, "udlrn": c.udlrn,
         "declaredCrop": c.declared_crop, "damageType": c.damage_cause or "UNKNOWN",
         "fraudScore": c.fraud_score, "status": c.status,
         "filedAt": str(c.created_at), "approvedAmount": float(c.claimed_area_ha * 28000 * 0.75) if c.status in ("APPROVED", "AUTO_APPROVED") else None}
        for c in claims
    ]}

@router.get("/{claim_id}")
async def get_claim_detail(claim_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id), Claim.farmer_id == UUID(user["userId"])))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Claim not found")
    return {"success": True, "data": {
        "id": str(c.id), "claimNumber": c.claim_number, "udlrn": c.udlrn,
        "declaredCrop": c.declared_crop, "damageType": c.damage_cause or "UNKNOWN",
        "damagePercent": float(c.damage_percent) if c.damage_percent else None,
        "fraudScore": c.fraud_score, "status": c.status,
        "filedAt": str(c.created_at),
        "approvedAmount": float(c.claimed_area_ha) * 28000 * 0.75 if c.status in ("APPROVED", "AUTO_APPROVED") else None,
        "claimedAreaHa": float(c.claimed_area_ha),
    }}

@router.post("/{claim_id}/submit")
async def submit_claim(claim_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id), Claim.farmer_id == UUID(user["userId"])))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Claim already submitted")
    claim.status = "SUBMITTED"
    claim.filed_at = datetime.utcnow()
    claim.updated_at = datetime.utcnow()
    await db.commit()

    # Trigger async scoring
    try:
        from app.services.scoring_service import score_claim
        score_result = await score_claim(claim_id, db, use_cpp=False)
        return {"success": True, "data": {
            "claimId": claim_id,
            "claimNumber": claim.claim_number,
            "status": claim.status,
            "fraudScore": score_result["data"]["score"],
            "riskLevel": score_result["data"]["risk_level"],
            "message": "Claim submitted and scored",
        }}
    except Exception:
        return {"success": True, "data": {"claimId": claim_id, "claimNumber": claim.claim_number, "status": "SUBMITTED", "message": "Claim submitted for processing. Scoring queued."}}
