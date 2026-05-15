from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from datetime import datetime, date, timedelta
from uuid import uuid4
import random

from app.database import get_db
from app.dependencies import require_csc_role
from app.models.claim_submission import ClaimSubmission
from app.models.fraud_alert import FraudAlert
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.models.csc_operator import CscOperator
from app.config import settings
from app.utils.jwt_utils import create_csc_token, create_refresh_token
from app.utils.password_utils import verify_password
from pydantic import BaseModel

router = APIRouter()


class CscLoginBody(BaseModel):
    cscId: str
    password: str
    totpCode: str = "123456"


@router.post("/login")
async def csc_portal_login(body: CscLoginBody, db: AsyncSession = Depends(get_db)):
    # In DEV_MODE, accept any credentials and generate a demo token
    if settings.DEV_MODE:
        token = create_csc_token("00000000-0000-0000-0000-000000000002", body.cscId)
        refresh = create_refresh_token({"userId": "00000000-0000-0000-0000-000000000002", "cscId": body.cscId})
        return {
            "success": True,
            "data": {
                "accessToken": token,
                "refreshToken": refresh,
                "cscId": body.cscId,
                "fullName": "Demo CSC Operator",
            },
        }

    result = await db.execute(select(CscOperator).where(CscOperator.csc_id == body.cscId))
    csc = result.scalar_one_or_none()
    if not csc:
        return {"success": False, "error": {"message": "Invalid CSC credentials"}}
    if csc.is_blocked:
        return {"success": False, "error": {"message": "CSC account is blocked"}}
    if not verify_password(body.password, csc.password_hash):
        return {"success": False, "error": {"message": "Invalid password"}}
    token = create_csc_token(str(csc.id), csc.csc_id)
    refresh = create_refresh_token({"userId": str(csc.id), "cscId": csc.csc_id})
    return {
        "success": True,
        "data": {
            "accessToken": token,
            "refreshToken": refresh,
            "cscId": csc.csc_id,
            "fullName": csc.name,
        },
    }


def _generate_claim_id(state_code: str) -> str:
    seq = random.randint(10000, 99999)
    return f"CLM-{state_code or 'XX'}-2026-{seq}"


def _generate_alert_id() -> str:
    return f"ALT-{random.randint(100000, 999999)}"


def _mock_satellite_for_udlrm(udlrm: str, lat: float = 13.0, lng: float = 77.5):
    """Generate deterministic mock satellite data for a UDLRM."""
    seed = sum(ord(c) for c in udlrm) % 1000
    ndvi = round(0.2 + (seed / 1000) * 0.6, 4)
    ndwi = round(-0.3 + (seed % 500) / 1000, 4)
    return {
        "ndvi": ndvi,
        "ndwi": ndwi,
        "soil_moisture": max(0, min(100, round(((ndwi + 0.4) / 0.8) * 100))),
        "lat": lat,
        "lng": lng,
    }


def _run_fraud_scoring(claim_data: dict, farmer: dict, sat: dict) -> tuple:
    """Returns (fraud_score, verdict, flags_list)."""
    score = 0
    flags = []
    declared_loss = float(claim_data.get("declaredLoss", 0) or 0)
    ndvi = sat["ndvi"]

    if ndvi > 0.6 and declared_loss > 40:
        flags.append("NDVI_HEALTHY_DAMAGE_CLAIMED")
        score += 40

    pre_sowing_ndvi = sat["ndvi"] * 0.3  # mock pre-sowing
    if pre_sowing_ndvi < 0.05:
        flags.append("PHANTOM_FARM_DETECTED")
        score += 50

    land_use = farmer.get("land_use", "Agricultural")
    if land_use and land_use != "Agricultural":
        flags.append("NON_AGRICULTURAL_LAND")
        score += 60

    area_declared = float(claim_data.get("landAreaHa", 0) or 0)
    area_satellite = area_declared  # mock match
    if abs(area_declared - area_satellite) > 0.5:
        flags.append("AREA_INFLATION_SUSPECTED")
        score += 30

    cause = claim_data.get("causeOfLoss", "")
    soil_moisture = sat["soil_moisture"]
    if soil_moisture > 60 and cause == "Drought":
        flags.append("DROUGHT_CONTRADICTION")
        score += 35

    score = min(100, score)

    if score <= 30:
        verdict = "AUTO_APPROVED"
    elif score <= 60:
        verdict = "UNDER_REVIEW"
    elif score <= 80:
        verdict = "FIELD_VISIT_REQUIRED"
    else:
        verdict = "AUTO_REJECTED"

    return score, verdict, flags


@router.get("/farmer-lookup/{udlrm}")
async def csc_farmer_lookup(
    udlrm: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    from app.models.farmer import Farmer
    from app.models.udlrn_master import UdlrnMaster

    result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrm))
    udlrn_rec = result.scalar_one_or_none()
    if not udlrn_rec:
        raise HTTPException(status_code=404, detail={"error": "FARMER_NOT_REGISTERED"})

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == udlrn_rec.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail={"error": "FARMER_NOT_REGISTERED"})

    sat = _mock_satellite_for_udlrm(udlrm, float(farmer.latitude or 13.0), float(farmer.longitude or 77.5))
    aadhaar_masked = "XXXX-XXXX-" + (farmer.aadhaar[-4:] if farmer.aadhaar and len(farmer.aadhaar) >= 4 else "0000")

    return {
        "success": True,
        "data": {
            "farmerName": farmer.full_name,
            "mobile": farmer.mobile,
            "aadhaar": aadhaar_masked,
            "state": farmer.state_code,
            "district": farmer.district,
            "taluk": farmer.taluk,
            "village": farmer.village,
            "surveyNo": "45",  # mock
            "landAreaHa": float(udlrn_rec.land_area_ha or 0),
            "cropType": farmer.crop_name or udlrn_rec.declared_crop or "PADDY",
            "landUse": "Agricultural",
            "ndvi": sat["ndvi"],
            "cropHealth": "Healthy" if sat["ndvi"] > 0.5 else "Poor",
            "lastSatelliteDate": datetime.today().strftime("%Y-%m-%d"),
            "coordinatesVerified": True,
            "fraudScoreBaseline": 15,
            "lat": sat["lat"],
            "lng": sat["lng"],
        },
    }


@router.post("/submit-claim")
async def csc_submit_claim(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    udlrm = body.get("udlrm")
    if not udlrm:
        raise HTTPException(status_code=422, detail="UDLRM required")

    csc_id = user.get("cscId", user.get("userId", "unknown"))

    # 1. Daily limit check
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = today_start + timedelta(days=1)
    count_result = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            and_(
                ClaimSubmission.csc_operator_id == csc_id,
                ClaimSubmission.filed_at >= today_start,
                ClaimSubmission.filed_at < today_end,
            )
        )
    )
    today_count = count_result.scalar() or 0

    if today_count >= settings.CSC_DAILY_CLAIM_LIMIT:
        # Create fraud alert
        alert = FraudAlert(
            id=uuid4(),
            alert_id=_generate_alert_id(),
            udlrm=udlrm,
            alert_type="CSC_BULK_PATTERN",
            severity="HIGH",
            description=f"CSC operator {csc_id} exceeded daily claim limit of {settings.CSC_DAILY_CLAIM_LIMIT}",
            csc_operator_id=csc_id,
            status="OPEN",
        )
        db.add(alert)
        await db.commit()
        raise HTTPException(
            status_code=429,
            detail={"error": "DAILY_LIMIT_REACHED", "fraudFlag": "CSC_BULK_PATTERN"},
        )

    # 2. Fetch farmer
    from app.models.farmer import Farmer
    from app.models.udlrn_master import UdlrnMaster

    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrm))
    udlrn_rec = udlrn_result.scalar_one_or_none()
    if not udlrn_rec:
        raise HTTPException(status_code=404, detail="Farmer not found")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == udlrn_rec.farmer_id))
    farmer = farmer_result.scalar_one_or_none()

    # 3. Satellite data
    sat = _mock_satellite_for_udlrm(udlrm, float(farmer.latitude or 13.0), float(farmer.longitude or 77.5))

    # 4. Fraud scoring
    farmer_dict = {
        "land_use": "Agricultural",
        "landAreaHa": float(udlrn_rec.land_area_ha or 0),
    }
    fraud_score, verdict, flags = _run_fraud_scoring(body, farmer_dict, sat)

    # 5. Save claim
    state_code = (farmer.state_code or "XX")[:2].upper()
    claim_id = _generate_claim_id(state_code)

    claim = ClaimSubmission(
        id=uuid4(),
        claim_id=claim_id,
        udlrm=udlrm,
        farmer_name=farmer.full_name,
        state=farmer.state_code,
        district=farmer.district,
        crop_type=body.get("cropType", farmer.crop_name or "PADDY"),
        declared_loss=body.get("declaredLoss"),
        claim_amount=body.get("claimAmount"),
        csc_operator_id=csc_id,
        csc_operator_name=user.get("name", "CSC Operator"),
        status=verdict,
        ndvi_at_claim=sat["ndvi"],
        ndvi_at_sowing=round(sat["ndvi"] * 0.6, 4),
        soil_moisture_at_claim=sat["soil_moisture"],
        fraud_score=fraud_score,
        fraud_verdict=verdict,
        fraud_flags=flags,
        season=body.get("season"),
        cause_of_loss=body.get("causeOfLoss"),
        date_of_loss=body.get("dateOfLoss"),
        csc_remarks=body.get("cscRemarks"),
        audit_trail=[{
            "action": "CLAIM_SUBMITTED",
            "actor": csc_id,
            "timestamp": datetime.utcnow().isoformat(),
            "notes": f"Claim submitted by CSC. Fraud score: {fraud_score}",
        }],
    )
    db.add(claim)

    # 6. If auto-rejected, create fraud alert
    if verdict == "AUTO_REJECTED":
        alert = FraudAlert(
            id=uuid4(),
            alert_id=_generate_alert_id(),
            udlrm=udlrm,
            claim_id=claim_id,
            alert_type="HIGH_FRAUD_SCORE",
            severity="CRITICAL",
            description=f"Claim auto-rejected due to fraud score {fraud_score}. Flags: {', '.join(flags)}",
            csc_operator_id=csc_id,
            status="OPEN",
        )
        db.add(alert)

    await db.commit()
    await db.refresh(claim)

    return {
        "success": True,
        "data": {
            "claimId": claim_id,
            "udlrm": udlrm,
            "fraudScore": fraud_score,
            "verdict": verdict,
            "flags": flags,
            "status": verdict,
            "satellite": sat,
        },
    }


@router.get("/my-claims")
async def csc_my_claims(
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    csc_id = user.get("cscId", user.get("userId", ""))
    query = select(ClaimSubmission).where(ClaimSubmission.csc_operator_id == csc_id)

    if status:
        query = query.where(ClaimSubmission.status == status)
    if start_date:
        query = query.where(ClaimSubmission.filed_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(ClaimSubmission.filed_at < datetime.fromisoformat(end_date) + timedelta(days=1))
    if search:
        query = query.where(
            (ClaimSubmission.udlrm.ilike(f"%{search}%")) |
            (ClaimSubmission.farmer_name.ilike(f"%{search}%")) |
            (ClaimSubmission.claim_id.ilike(f"%{search}%"))
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    query = query.order_by(ClaimSubmission.filed_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    claims = result.scalars().all()

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "claimId": c.claim_id,
                    "farmerName": c.farmer_name,
                    "udlrm": c.udlrm,
                    "cropType": c.crop_type,
                    "declaredLoss": float(c.declared_loss) if c.declared_loss else None,
                    "claimAmount": float(c.claim_amount) if c.claim_amount else None,
                    "filedAt": c.filed_at.isoformat() if c.filed_at else None,
                    "fraudScore": c.fraud_score,
                    "status": c.status,
                }
                for c in claims
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }


@router.get("/claim/{claim_id}")
async def csc_get_claim(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    result = await db.execute(select(ClaimSubmission).where(ClaimSubmission.claim_id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return {
        "success": True,
        "data": {
            "claimId": claim.claim_id,
            "udlrm": claim.udlrm,
            "farmerName": claim.farmer_name,
            "state": claim.state,
            "district": claim.district,
            "cropType": claim.crop_type,
            "declaredLoss": float(claim.declared_loss) if claim.declared_loss else None,
            "claimAmount": float(claim.claim_amount) if claim.claim_amount else None,
            "season": claim.season,
            "causeOfLoss": claim.cause_of_loss,
            "dateOfLoss": str(claim.date_of_loss) if claim.date_of_loss else None,
            "cscRemarks": claim.csc_remarks,
            "filedAt": claim.filed_at.isoformat() if claim.filed_at else None,
            "status": claim.status,
            "fraudScore": claim.fraud_score,
            "fraudVerdict": claim.fraud_verdict,
            "fraudFlags": claim.fraud_flags,
            "ndviAtClaim": float(claim.ndvi_at_claim) if claim.ndvi_at_claim else None,
            "ndviAtSowing": float(claim.ndvi_at_sowing) if claim.ndvi_at_sowing else None,
            "soilMoistureAtClaim": float(claim.soil_moisture_at_claim) if claim.soil_moisture_at_claim else None,
            "auditTrail": claim.audit_trail,
        },
    }


@router.get("/daily-count")
async def csc_daily_count(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    csc_id = user.get("cscId", user.get("userId", ""))
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = today_start + timedelta(days=1)

    count_result = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            and_(
                ClaimSubmission.csc_operator_id == csc_id,
                ClaimSubmission.filed_at >= today_start,
                ClaimSubmission.filed_at < today_end,
            )
        )
    )
    today_count = count_result.scalar() or 0

    approved_result = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            and_(
                ClaimSubmission.csc_operator_id == csc_id,
                ClaimSubmission.filed_at >= today_start,
                ClaimSubmission.filed_at < today_end,
                ClaimSubmission.status == "AUTO_APPROVED",
            )
        )
    )
    approved_count = approved_result.scalar() or 0

    review_result = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            and_(
                ClaimSubmission.csc_operator_id == csc_id,
                ClaimSubmission.filed_at >= today_start,
                ClaimSubmission.filed_at < today_end,
                ClaimSubmission.status == "UNDER_REVIEW",
            )
        )
    )
    review_count = review_result.scalar() or 0

    rejected_result = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            and_(
                ClaimSubmission.csc_operator_id == csc_id,
                ClaimSubmission.filed_at >= today_start,
                ClaimSubmission.filed_at < today_end,
                ClaimSubmission.status.in_(["AUTO_REJECTED", "FIELD_VISIT_REQUIRED"]),
            )
        )
    )
    rejected_count = rejected_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "todayCount": today_count,
            "autoApprovedToday": approved_count,
            "underReview": review_count,
            "rejectedToday": rejected_count,
            "dailyLimit": settings.CSC_DAILY_CLAIM_LIMIT,
            "remaining": max(0, settings.CSC_DAILY_CLAIM_LIMIT - today_count),
        },
    }


@router.get("/fraud-alerts")
async def csc_fraud_alerts(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_csc_role),
):
    csc_id = user.get("cscId", user.get("userId", ""))
    result = await db.execute(
        select(FraudAlert).where(FraudAlert.csc_operator_id == csc_id).order_by(FraudAlert.triggered_at.desc())
    )
    alerts = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "alertId": a.alert_id,
                "claimId": a.claim_id,
                "type": a.alert_type,
                "severity": a.severity,
                "triggeredAt": a.triggered_at.isoformat() if a.triggered_at else None,
                "status": a.status,
                "description": a.description,
            }
            for a in alerts
        ],
    }
