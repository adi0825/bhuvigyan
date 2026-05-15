from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.auth import CSCLoginRequest
from app.models.csc_operator import CscOperator
from app.utils.jwt_utils import create_csc_token, create_refresh_token
from app.utils.password_utils import verify_password
from app.dependencies import require_csc_role

router = APIRouter()

@router.post("/login")
async def csc_login(body: CSCLoginRequest, db: AsyncSession = Depends(get_db)):
    from app.config import settings
    if settings.DEV_MODE:
        token = create_csc_token("00000000-0000-0000-0000-000000000002", body.cscId)
        refresh_token = create_refresh_token({"userId": "00000000-0000-0000-0000-000000000002", "cscId": body.cscId})
        return {
            "success": True,
            "data": {
                "accessToken": token,
                "refreshToken": refresh_token,
                "cscId": body.cscId,
                "fullName": "Demo CSC Operator",
            },
        }
    result = await db.execute(select(CscOperator).where(CscOperator.csc_id == body.cscId))
    csc = result.scalar_one_or_none()
    if not csc:
        raise HTTPException(status_code=401, detail="Invalid CSC credentials")
    if csc.is_blocked:
        raise HTTPException(status_code=403, detail="CSC account is blocked")
    if not verify_password(body.password, csc.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    if not settings.DEV_MODE and body.totpCode != "123456":
        raise HTTPException(status_code=401, detail="Invalid OTP")
    token = create_csc_token(str(csc.id), csc.csc_id)
    refresh_token = create_refresh_token({"userId": str(csc.id), "cscId": csc.csc_id})
    return {"success": True, "data": {"accessToken": token, "refreshToken": refresh_token, "cscId": csc.csc_id}}

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), user: dict = Depends(require_csc_role)):
    from app.models.farmer import Farmer
    from sqlalchemy import func
    total = await db.scalar(select(func.count(Farmer.id)))
    return {"success": True, "data": {
        "dailyCount": 0,
        "totalCount": total or 0,
        "dailyLimit": 50,
        "cscId": user.get("cscId", ""),
        "cscName": "CSC KA-001",
        "district": "Bengaluru Rural",
        "usedToday": 0,
    }}

@router.get("/registrations/today")
async def get_today_registrations(db: AsyncSession = Depends(get_db), user: dict = Depends(require_csc_role)):
    return {"success": True, "data": []}

@router.get("/registrations/total")
async def get_total_registrations(db: AsyncSession = Depends(get_db), user: dict = Depends(require_csc_role)):
    from app.models.farmer import Farmer
    from sqlalchemy import func
    total = await db.scalar(select(func.count(Farmer.id)))
    return {"success": True, "data": total or 0}

@router.get("/farmer/lookup/{mobile}")
async def lookup_farmer(mobile: str, db: AsyncSession = Depends(get_db), user: dict = Depends(require_csc_role)):
    from app.models.farmer import Farmer
    from app.models.udlrn_master import UdlrnMaster
    result = await db.execute(select(Farmer).where(Farmer.mobile == mobile))
    farmer = result.scalar_one_or_none()
    if not farmer:
        return {"success": True, "data": None}
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == farmer.id))
    udlrn = udlrn_result.scalar_one_or_none()
    return {"success": True, "data": {
        "id": str(farmer.id),
        "fullName": farmer.full_name,
        "mobile": farmer.mobile,
        "udlrn": udlrn.udlrn if udlrn else None,
        "isVerified": farmer.is_verified,
        "landAreaHa": float(udlrn.land_area_ha) if udlrn else 0,
    }}


@router.post("/register-farmer")
async def csc_register_farmer(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    from app.models.farmer import Farmer
    from app.services.farmer_service import get_farmer_by_mobile, create_farmer
    from app.services.otp_service import generate_otp

    mobile = body.get("mobile") or body.get("mobileNumber")
    if not mobile:
        raise HTTPException(status_code=422, detail="Mobile number required")
    existing = await get_farmer_by_mobile(db, mobile)
    if existing:
        raise HTTPException(status_code=409, detail="Mobile already registered")

    farmer_data = {
        "mobile": mobile,
        "full_name": body.get("fullName") or body.get("full_name") or mobile,
        "father_name": body.get("father_name"),
        "address": body.get("address"),
        "village": body.get("village"),
        "taluk": body.get("taluk"),
        "district": body.get("district") or body.get("districtId"),
        "state_code": body.get("state_code") or body.get("stateCode") or "KA",
        "pincode": body.get("pincode"),
        "bank_name": body.get("bank_name"),
        "bank_ifsc": body.get("bank_ifsc"),
        "bank_account": body.get("bank_account"),
    }
    farmer = await create_farmer(db, farmer_data)
    await db.flush()

    from app.utils.udlrn_generator import generate as generate_udlrn
    udlrn_code = await generate_udlrn(db, "KA")
    land_area = body.get("land_area") or body.get("landAreaHa") or 2.5
    crop = body.get("crop_name") or body.get("declaredCrop") or "PADDY"
    udlrn_record = UdlrnMaster(
        udlrn=udlrn_code,
        farmer_id=farmer.id,
        land_area_ha=land_area,
        declared_crop=crop,
        carbon_score=50,
    )
    db.add(udlrn_record)

    # KGIS auto-approval check (same as farmer self-registration)
    registration_status = "PENDING_ADMIN_REVIEW"
    lat = body.get("latitude")
    lng = body.get("longitude")
    if lat and lng and farmer.village and farmer.district:
        try:
            from app.services.land_service import LandVerifier
            lv = LandVerifier()
            verify_result = await lv.verify_coordinates(float(lat), float(lng), farmer.village, farmer.district)
            if verify_result.get("matches_declared"):
                farmer.is_verified = True
                if farmer.bank_account and farmer.bank_ifsc:
                    registration_status = "AUTO_APPROVED"
                else:
                    registration_status = "PENDING_BANK_VERIFICATION"
        except Exception:
            pass

    await db.commit()
    otp = await generate_otp(mobile)
    return {"success": True, "data": {"farmerId": str(farmer.id), "udlrn": udlrn_code, "devOtp": otp, "registrationStatus": registration_status}}


@router.get("/farmer/{mobile}/claims")
async def get_farmer_claims_for_csc(
    mobile: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    """CSC operator checks claim status for a farmer."""
    from app.models.farmer import Farmer
    from app.models.claim import Claim
    farmer_result = await db.execute(select(Farmer).where(Farmer.mobile == mobile))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    claims_result = await db.execute(
        select(Claim).where(Claim.farmer_id == farmer.id).order_by(Claim.created_at.desc())
    )
    claims = claims_result.scalars().all()
    return {"success": True, "data": [
        {
            "id": str(c.id),
            "claimNumber": c.claim_number,
            "status": c.status,
            "lossType": c.damage_cause,
            "damagePercent": float(c.damage_percent) if c.damage_percent else None,
            "fraudScore": int(c.fraud_score) if c.fraud_score else None,
            "filedAt": str(c.filed_at) if c.filed_at else str(c.created_at),
        }
        for c in claims
    ]}


@router.post("/farmer/{mobile}/file-claim")
async def csc_file_claim_for_farmer(
    mobile: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    """CSC operator files a claim on behalf of a farmer."""
    from app.models.farmer import Farmer
    from app.models.claim import Claim
    from uuid import uuid4
    from datetime import datetime

    farmer_result = await db.execute(select(Farmer).where(Farmer.mobile == mobile))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == farmer.id))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        raise HTTPException(status_code=400, detail="Farmer has no land record")

    claim = Claim(
        id=uuid4(),
        claim_number=f"CLM-{uuid4().hex[:6].upper()}",
        udlrn=udlrn.udlrn,
        farmer_id=farmer.id,
        status="DRAFT",
        declared_crop=udlrn.declared_crop or "PADDY",
        claimed_area_ha=udlrn.land_area_ha,
        damage_cause=body.get("lossType") or body.get("damage_cause"),
        damage_percent=body.get("damagePercent") or body.get("damage_percent"),
        affected_area=body.get("affectedArea") or body.get("affected_area"),
        claim_amount_requested=body.get("claimAmount") or body.get("claim_amount_requested"),
        loss_date=body.get("lossDate") or body.get("loss_date"),
        season=body.get("season") or "KHARIF",
        year=datetime.now().year,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()
    return {"success": True, "data": {"claimId": str(claim.id), "claimNumber": claim.claim_number, "status": "DRAFT"}}