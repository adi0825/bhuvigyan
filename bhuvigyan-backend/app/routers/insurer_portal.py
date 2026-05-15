from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime, date, timedelta
from uuid import uuid4
import random

from app.database import get_db
from app.dependencies import require_insurer_role
from app.models.claim_submission import ClaimSubmission
from app.models.fraud_alert import FraudAlert
from app.models.insurance_payout import InsurancePayout
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.models.insurer import Insurer
from app.utils.jwt_utils import create_insurer_token, create_refresh_token
from app.utils.password_utils import verify_password
from pydantic import BaseModel

router = APIRouter()


class InsurerLoginBody(BaseModel):
    email: str
    password: str


@router.post("/login")
async def insurer_portal_login(body: InsurerLoginBody, db: AsyncSession = Depends(get_db)):
    from app.config import settings
    # In DEV_MODE, accept any email/password and generate a demo token
    if settings.DEV_MODE:
        token = create_insurer_token("00000000-0000-0000-0000-000000000001", body.email)
        refresh = create_refresh_token({"userId": "00000000-0000-0000-0000-000000000001", "email": body.email})
        return {
            "success": True,
            "data": {
                "accessToken": token,
                "refreshToken": refresh,
                "company": "Demo Insurance Co.",
                "fullName": "Demo Officer",
            },
        }

    result = await db.execute(select(Insurer).where(Insurer.email == body.email))
    insurer = result.scalar_one_or_none()
    if not insurer:
        return {"success": False, "error": {"message": "Invalid credentials"}}
    if not verify_password(body.password, insurer.password_hash):
        return {"success": False, "error": {"message": "Invalid password"}}
    token = create_insurer_token(str(insurer.id), insurer.email)
    refresh = create_refresh_token({"userId": str(insurer.id), "email": insurer.email})
    return {
        "success": True,
        "data": {
            "accessToken": token,
            "refreshToken": refresh,
            "company": insurer.company_name,
            "fullName": insurer.email,
        },
    }


def _generate_payout_id() -> str:
    return f"PAY-{random.randint(100000, 999999)}"


@router.get("/claims-queue")
async def insurer_claims_queue(
    status: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None),
    max_score: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    query = select(ClaimSubmission)

    if status:
        query = query.where(ClaimSubmission.status == status)
    if state:
        query = query.where(ClaimSubmission.state.ilike(f"%{state}%"))
    if district:
        query = query.where(ClaimSubmission.district.ilike(f"%{district}%"))
    if min_score is not None:
        query = query.where(ClaimSubmission.fraud_score >= min_score)
    if max_score is not None:
        query = query.where(ClaimSubmission.fraud_score <= max_score)
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
                    "state": c.state,
                    "district": c.district,
                    "cropType": c.crop_type,
                    "declaredLoss": float(c.declared_loss) if c.declared_loss else None,
                    "claimAmount": float(c.claim_amount) if c.claim_amount else None,
                    "cscOperator": c.csc_operator_name,
                    "filedAt": c.filed_at.isoformat() if c.filed_at else None,
                    "fraudScore": c.fraud_score,
                    "verdict": c.fraud_verdict,
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
async def insurer_get_claim(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    result = await db.execute(select(ClaimSubmission).where(ClaimSubmission.claim_id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Fetch farmer details
    farmer_data = {}
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrm == claim.udlrm))
    udlrn_rec = udlrn_result.scalar_one_or_none()
    if udlrn_rec:
        farmer_result = await db.execute(select(Farmer).where(Farmer.id == udlrn_rec.farmer_id))
        farmer = farmer_result.scalar_one_or_none()
        if farmer:
            farmer_data = {
                "mobile": farmer.mobile,
                "aadhaar": "XXXX-XXXX-" + (farmer.aadhaar[-4:] if farmer.aadhaar and len(farmer.aadhaar) >= 4 else "0000"),
                "bankName": farmer.bank_name,
                "bankIfsc": farmer.bank_ifsc,
                "bankAccount": farmer.bank_account,
                "landAreaHa": float(farmer.land_area or 0),
                "latitude": float(farmer.latitude) if farmer.latitude else None,
                "longitude": float(farmer.longitude) if farmer.longitude else None,
            }

    # Fetch related fraud alerts
    alert_result = await db.execute(
        select(FraudAlert).where(FraudAlert.claim_id == claim_id).order_by(FraudAlert.triggered_at.desc())
    )
    alerts = alert_result.scalars().all()

    return {
        "success": True,
        "data": {
            "claim": {
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
                "cscOperator": claim.csc_operator_name,
                "auditTrail": claim.audit_trail,
            },
            "farmer": farmer_data,
            "fraudAlerts": [
                {
                    "alertId": a.alert_id,
                    "type": a.alert_type,
                    "severity": a.severity,
                    "status": a.status,
                    "description": a.description,
                    "triggeredAt": a.triggered_at.isoformat() if a.triggered_at else None,
                }
                for a in alerts
            ],
        },
    }


@router.post("/approve-claim")
async def insurer_approve_claim(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    claim_id = body.get("claimId")
    approved_amount = body.get("approvedAmount")
    officer_notes = body.get("officerNotes", "")

    result = await db.execute(select(ClaimSubmission).where(ClaimSubmission.claim_id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = "INSURER_APPROVED"
    claim.insurer_decision = "APPROVED"
    claim.insurer_decided_at = datetime.utcnow()
    claim.payout_amount = approved_amount
    claim.officer_notes = officer_notes

    trail = claim.audit_trail or []
    trail.append({
        "action": "INSURER_APPROVED",
        "actor": user.get("userId", "insurer"),
        "timestamp": datetime.utcnow().isoformat(),
        "notes": officer_notes,
    })
    claim.audit_trail = trail

    # Create payout record
    payout = InsurancePayout(
        id=uuid4(),
        payout_id=_generate_payout_id(),
        claim_id=claim_id,
        udlrm=claim.udlrm,
        farmer_name=claim.farmer_name,
        approved_amount=approved_amount,
        payout_status="INITIATED",
        insurer_name=user.get("email", "Insurer"),
        approved_by=user.get("userId", "insurer"),
        officer_notes=officer_notes,
    )
    db.add(payout)
    await db.commit()

    return {
        "success": True,
        "data": {
            "claimId": claim_id,
            "status": "INSURER_APPROVED",
            "approvedAmount": approved_amount,
            "payoutId": payout.payout_id,
        },
    }


@router.post("/reject-claim")
async def insurer_reject_claim(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    claim_id = body.get("claimId")
    rejection_reason = body.get("rejectionReason", "")
    officer_notes = body.get("officerNotes", "")

    result = await db.execute(select(ClaimSubmission).where(ClaimSubmission.claim_id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = "INSURER_REJECTED"
    claim.insurer_decision = "REJECTED"
    claim.insurer_decided_at = datetime.utcnow()
    claim.officer_notes = officer_notes

    trail = claim.audit_trail or []
    trail.append({
        "action": "INSURER_REJECTED",
        "actor": user.get("userId", "insurer"),
        "timestamp": datetime.utcnow().isoformat(),
        "notes": f"Reason: {rejection_reason}. {officer_notes}",
    })
    claim.audit_trail = trail

    # Create fraud alert if score > 60
    if claim.fraud_score > 60:
        alert = FraudAlert(
            id=uuid4(),
            alert_id=f"ALT-{random.randint(100000, 999999)}",
            udlrm=claim.udlrm,
            claim_id=claim_id,
            alert_type="INSURER_REJECTION_HIGH_RISK",
            severity="HIGH",
            description=f"Claim rejected by insurer. Fraud score: {claim.fraud_score}. Reason: {rejection_reason}",
            insurer_id=user.get("userId", ""),
            status="OPEN",
        )
        db.add(alert)

    await db.commit()
    return {"success": True, "data": {"claimId": claim_id, "status": "INSURER_REJECTED"}}


@router.post("/field-visit")
async def insurer_field_visit(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    claim_id = body.get("claimId")
    assigned_officer = body.get("assignedOfficer", "")
    officer_notes = body.get("officerNotes", "")

    result = await db.execute(select(ClaimSubmission).where(ClaimSubmission.claim_id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = "FIELD_VISIT_REQUIRED"
    claim.officer_notes = officer_notes

    trail = claim.audit_trail or []
    trail.append({
        "action": "FIELD_VISIT_ASSIGNED",
        "actor": user.get("userId", "insurer"),
        "timestamp": datetime.utcnow().isoformat(),
        "notes": f"Assigned to: {assigned_officer}. {officer_notes}",
    })
    claim.audit_trail = trail

    alert = FraudAlert(
        id=uuid4(),
        alert_id=f"ALT-{random.randint(100000, 999999)}",
        udlrm=claim.udlrm,
        claim_id=claim_id,
        alert_type="FIELD_VISIT_REQUIRED",
        severity="HIGH",
        description=f"Field visit assigned to {assigned_officer} for claim {claim_id}",
        insurer_id=user.get("userId", ""),
        status="OPEN",
    )
    db.add(alert)
    await db.commit()

    return {"success": True, "data": {"claimId": claim_id, "status": "FIELD_VISIT_REQUIRED"}}


@router.post("/escalate-alert")
async def insurer_escalate_alert(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    alert_id = body.get("alertId")
    notes = body.get("notes", "")

    result = await db.execute(select(FraudAlert).where(FraudAlert.alert_id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "ESCALATED"
    alert.notes = notes
    await db.commit()

    return {
        "success": True,
        "data": {
            "alertId": alert_id,
            "status": "ESCALATED",
            "message": f"Alert escalated to District Collector. Reference: {alert_id}",
        },
    }


@router.get("/fraud-alerts")
async def insurer_fraud_alerts(
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    query = select(FraudAlert)
    if severity:
        query = query.where(FraudAlert.severity == severity.upper())
    query = query.order_by(FraudAlert.triggered_at.desc())
    result = await db.execute(query)
    alerts = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "alertId": a.alert_id,
                "type": a.alert_type,
                "severity": a.severity,
                "udlrm": a.udlrm,
                "claimId": a.claim_id,
                "cscOperator": a.csc_operator_id,
                "triggeredAt": a.triggered_at.isoformat() if a.triggered_at else None,
                "status": a.status,
                "description": a.description,
            }
            for a in alerts
        ],
    }


@router.get("/heatmap-data")
async def insurer_heatmap_data(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    # Hardcoded 20 major agricultural districts with mock coordinates
    districts = [
        {"district": "Bengaluru Rural", "state": "KA", "lat": 13.2, "lng": 77.5},
        {"district": "Mysuru", "state": "KA", "lat": 12.3, "lng": 76.6},
        {"district": "Hubballi", "state": "KA", "lat": 15.4, "lng": 75.1},
        {"district": "Nashik", "state": "MH", "lat": 20.0, "lng": 73.8},
        {"district": "Pune", "state": "MH", "lat": 18.5, "lng": 73.9},
        {"district": "Aurangabad", "state": "MH", "lat": 19.9, "lng": 75.3},
        {"district": "Warangal", "state": "TS", "lat": 18.0, "lng": 79.6},
        {"district": "Karimnagar", "state": "TS", "lat": 18.4, "lng": 79.1},
        {"district": "Ludhiana", "state": "PB", "lat": 30.9, "lng": 75.9},
        {"district": "Amritsar", "state": "PB", "lat": 31.6, "lng": 74.9},
        {"district": "Jaipur", "state": "RJ", "lat": 26.9, "lng": 75.8},
        {"district": "Jodhpur", "state": "RJ", "lat": 26.3, "lng": 73.0},
        {"district": "Lucknow", "state": "UP", "lat": 26.8, "lng": 80.9},
        {"district": "Kanpur", "state": "UP", "lat": 26.4, "lng": 80.3},
        {"district": "Varanasi", "state": "UP", "lat": 25.3, "lng": 83.0},
        {"district": "Ahmedabad", "state": "GJ", "lat": 23.0, "lng": 72.6},
        {"district": "Rajkot", "state": "GJ", "lat": 22.3, "lng": 70.8},
        {"district": "Surat", "state": "GJ", "lat": 21.2, "lng": 72.8},
        {"district": "Patna", "state": "BR", "lat": 25.6, "lng": 85.1},
        {"district": "Gaya", "state": "BR", "lat": 24.8, "lng": 85.0},
    ]

    # Aggregate real data per district from claim_submissions
    data = []
    for d in districts:
        result = await db.execute(
            select(
                func.count(ClaimSubmission.id),
                func.avg(ClaimSubmission.fraud_score),
            ).where(
                and_(
                    ClaimSubmission.district.ilike(f"%{d['district']}%"),
                    ClaimSubmission.state.ilike(f"%{d['state']}%"),
                )
            )
        )
        total_claims, avg_score = result.one()
        total_claims = total_claims or 0
        avg_score = round(float(avg_score or 0), 1)

        flagged_result = await db.execute(
            select(func.count(ClaimSubmission.id)).where(
                and_(
                    ClaimSubmission.district.ilike(f"%{d['district']}%"),
                    ClaimSubmission.state.ilike(f"%{d['state']}%"),
                    ClaimSubmission.fraud_score > 60,
                )
            )
        )
        flagged = flagged_result.scalar() or 0

        data.append({
            "district": d["district"],
            "state": d["state"],
            "lat": d["lat"],
            "lng": d["lng"],
            "totalClaims": total_claims,
            "avgFraudScore": avg_score,
            "flaggedClaims": flagged,
        })

    return {"success": True, "data": data}


@router.get("/analytics")
async def insurer_analytics(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    # Claims by state
    state_result = await db.execute(
        select(ClaimSubmission.state, func.count(ClaimSubmission.id), func.avg(ClaimSubmission.fraud_score))
        .group_by(ClaimSubmission.state)
    )
    claims_by_state = [
        {"state": row[0] or "Unknown", "count": row[1] or 0, "avgFraudScore": round(float(row[2] or 0), 1)}
        for row in state_result.all()
    ]

    # Fraud score distribution (0-10, 11-20, ..., 91-100)
    fraud_dist = []
    for lower in range(0, 100, 10):
        upper = lower + 10
        count_result = await db.execute(
            select(func.count(ClaimSubmission.id)).where(
                and_(
                    ClaimSubmission.fraud_score >= lower,
                    ClaimSubmission.fraud_score < upper,
                )
            )
        )
        fraud_dist.append({
            "range": f"{lower}-{upper-1}",
            "count": count_result.scalar() or 0,
        })

    # Monthly payouts (last 6 months)
    monthly_payouts = []
    for i in range(5, -1, -1):
        month_start = datetime.now().replace(day=1) - timedelta(days=i*30)
        month_end = month_start + timedelta(days=30)
        payout_result = await db.execute(
            select(func.sum(InsurancePayout.approved_amount)).where(
                and_(
                    InsurancePayout.created_at >= month_start,
                    InsurancePayout.created_at < month_end,
                    InsurancePayout.payout_status != "FAILED",
                )
            )
        )
        amount = float(payout_result.scalar() or 0)
        monthly_payouts.append({
            "month": month_start.strftime("%Y-%m"),
            "amount": amount,
        })

    # Approval vs Rejection rate per month (last 6)
    approval_rejection = []
    for i in range(5, -1, -1):
        month_start = datetime.now().replace(day=1) - timedelta(days=i*30)
        month_end = month_start + timedelta(days=30)
        approved_result = await db.execute(
            select(func.count(ClaimSubmission.id)).where(
                and_(
                    ClaimSubmission.status == "INSURER_APPROVED",
                    ClaimSubmission.insurer_decided_at >= month_start,
                    ClaimSubmission.insurer_decided_at < month_end,
                )
            )
        )
        rejected_result = await db.execute(
            select(func.count(ClaimSubmission.id)).where(
                and_(
                    ClaimSubmission.status == "INSURER_REJECTED",
                    ClaimSubmission.insurer_decided_at >= month_start,
                    ClaimSubmission.insurer_decided_at < month_end,
                )
            )
        )
        review_result = await db.execute(
            select(func.count(ClaimSubmission.id)).where(
                and_(
                    ClaimSubmission.status.in_(["UNDER_REVIEW", "FIELD_VISIT_REQUIRED"]),
                    ClaimSubmission.filed_at >= month_start,
                    ClaimSubmission.filed_at < month_end,
                )
            )
        )
        approval_rejection.append({
            "month": month_start.strftime("%Y-%m"),
            "approved": approved_result.scalar() or 0,
            "rejected": rejected_result.scalar() or 0,
            "review": review_result.scalar() or 0,
        })

    return {
        "success": True,
        "data": {
            "claimsByState": claims_by_state,
            "fraudScoreDistribution": fraud_dist,
            "monthlyPayouts": monthly_payouts,
            "approvalRejectionByMonth": approval_rejection,
        },
    }


@router.get("/dashboard-stats")
async def insurer_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_insurer_role),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = today_start + timedelta(days=1)

    pending_result = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            ClaimSubmission.status.in_(["PENDING", "UNDER_REVIEW", "AUTO_APPROVED"])
        )
    )
    pending = pending_result.scalar() or 0

    auto_approved_today = await db.execute(
        select(func.count(ClaimSubmission.id)).where(
            and_(
                ClaimSubmission.status == "AUTO_APPROVED",
                ClaimSubmission.filed_at >= today_start,
                ClaimSubmission.filed_at < today_end,
            )
        )
    )
    approved_today = auto_approved_today.scalar() or 0

    field_visit = await db.execute(
        select(func.count(ClaimSubmission.id)).where(ClaimSubmission.status == "FIELD_VISIT_REQUIRED")
    )
    field_visit_count = field_visit.scalar() or 0

    rejected = await db.execute(
        select(func.count(ClaimSubmission.id)).where(ClaimSubmission.status == "AUTO_REJECTED")
    )
    rejected_count = rejected.scalar() or 0

    # Total payout this month
    month_start = datetime.now().replace(day=1)
    payout_result = await db.execute(
        select(func.sum(InsurancePayout.approved_amount)).where(
            and_(
                InsurancePayout.created_at >= month_start,
                InsurancePayout.payout_status.in_(["INITIATED", "PROCESSED"]),
            )
        )
    )
    total_payout = float(payout_result.scalar() or 0)

    # High risk alerts (top 5)
    alert_result = await db.execute(
        select(FraudAlert).where(FraudAlert.severity.in_(["HIGH", "CRITICAL"])).order_by(
            FraudAlert.triggered_at.desc()
        ).limit(5)
    )
    alerts = alert_result.scalars().all()

    return {
        "success": True,
        "data": {
            "pendingClaims": pending,
            "autoApprovedToday": approved_today,
            "fieldVisitRequired": field_visit_count,
            "autoRejected": rejected_count,
            "totalPayoutThisMonth": total_payout,
            "highRiskAlerts": [
                {
                    "alertId": a.alert_id,
                    "type": a.alert_type,
                    "udlrm": a.udlrm,
                    "claimId": a.claim_id,
                    "severity": a.severity,
                }
                for a in alerts
            ],
        },
    }
