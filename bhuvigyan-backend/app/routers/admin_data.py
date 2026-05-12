from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_, text
from app.database import get_db
from app.dependencies import require_admin_role
from app.models.farmer import Farmer
from app.models.claim import Claim
from app.models.udlrn_master import UdlrnMaster
from app.models.cce_visit import CceVisit
from app.models.alert import FirAlert
import math
from typing import Optional

router = APIRouter()


@router.get("/stats")
async def get_admin_stats(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    r = await db.execute(text("""
        SELECT
          (SELECT COUNT(*) FROM farmers) as total_farmers,
          (SELECT COUNT(*) FROM claims WHERE status IN ('PENDING','PROCESSING','UNDER_REVIEW')) as active_claims,
          (SELECT COUNT(*) FROM claims WHERE fraud_score > 60) as fraud_alerts,
          (SELECT COUNT(*) FROM farmers WHERE carbon_enrolled=true) as carbon_enrolled,
          (SELECT COUNT(*) FROM cce_visits WHERE status='ASSIGNED') as pending_visits,
          (SELECT COUNT(*) FROM claims WHERE status='AUTO_APPROVED') as auto_approved,
          (SELECT COUNT(*) FROM claims WHERE status='AUTO_REJECTED') as auto_rejected,
          (SELECT COUNT(*) FROM fir_alerts WHERE status='PENDING') as fir_pending,
          (SELECT COUNT(*) FROM claims WHERE fraud_score BETWEEN 31 AND 60) as review_needed,
          (SELECT COUNT(*) FROM cce_visits WHERE status='COMPLETED') as visits_completed
    """))
    row = r.fetchone()

    r2 = await db.execute(text("SELECT status, COUNT(*)::int as count FROM claims GROUP BY status"))
    rows2 = r2.mappings().fetchall()
    breakdown = {r["status"]: r["count"] for r in rows2}

    return {"success": True, "data": {
        "totalFarmers": row.total_farmers or 0,
        "activeClaims": row.active_claims or 0,
        "fraudAlerts": row.fraud_alerts or 0,
        "carbonEnrolled": row.carbon_enrolled or 0,
        "pendingVisits": row.pending_visits or 0,
        "autoApproved": row.auto_approved or 0,
        "autoRejected": row.auto_rejected or 0,
        "firPending": row.fir_pending or 0,
        "reviewNeeded": row.review_needed or 0,
        "visitsCompleted": row.visits_completed or 0,
        "claimsStatusBreakdown": breakdown,
    }}


@router.get("/farmers")
async def get_farmers(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role), page: int = 1, limit: int = 10):
    result = await db.execute(select(Farmer).limit(limit).offset((page-1)*limit))
    farmers = result.scalars().all()
    total = await db.scalar(select(func.count(Farmer.id)))
    return {"success": True, "data": {"farmers": [{"id": str(f.id), "fullName": f.full_name, "mobile": f.mobile, "isVerified": f.is_verified} for f in farmers], "total": total}}


@router.get("/farm/search")
async def search_farm_by_udlrn(
    udlrn: str = Query(None),
    mobile: str = Query(None),
    survey: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role)
):
    """Search farm by UDLRN/ULPIN, mobile number, or survey number."""
    if not any([udlrn, mobile, survey]):
        raise HTTPException(status_code=400, detail="Provide at least one: udlrn, mobile, or survey")

    query = select(Farmer)
    if udlrn:
        # Search by mobile since ulpin doesn't exist in Farmer model
        query = query.where(Farmer.mobile.ilike(f"%{udlrn}%"))
    elif mobile:
        query = query.where(Farmer.mobile == mobile)
    elif survey:
        query = query.where(Farmer.village.ilike(f"%{survey}%"))

    result = await db.execute(query)
    farmer = result.scalar_one_or_none()

    if not farmer:
        raise HTTPException(status_code=404, detail="No farmer found with this UDLRN/mobile/survey number")

    # Get active claims count
    claims_result = await db.execute(
        select(Claim).where(Claim.farmer_id == farmer.id)
    )
    claims = claims_result.scalars().all()

    return {
        "farmer_id": str(farmer.id),
        "full_name": farmer.full_name,
        "mobile": farmer.mobile,
        "ulpin": None,
        "survey_number": None,
        "village": farmer.village,
        "taluk": farmer.taluk,
        "district": farmer.district,
        "state": farmer.state_code,
        "land_area_ha": farmer.land_area,
        "ownership_type": None,
        "farm_lat": farmer.latitude,
        "farm_lng": farmer.longitude,
        "kgis_verified": farmer.is_verified,
        "bank_verified": None,
        "status": "active" if not farmer.is_blacklisted else "blacklisted",
        "carbon_score": None,
        "total_claims": len(claims),
        "active_claims": [
            {
                "claim_number": c.claim_number,
                "status": c.status,
                "crop_type": c.crop_type,
                "claim_amount": c.claim_amount,
                "fraud_score_v1": c.fraud_score_v1
            }
            for c in claims
        ]
    }


@router.get("/farmers/{farmer_id}")
async def get_farmer_detail(farmer_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Farmer).where(Farmer.id == UUID(farmer_id)))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return {"success": True, "data": {
        "id": str(farmer.id), "fullName": farmer.full_name, "mobile": farmer.mobile,
        "isVerified": farmer.is_verified, "carbonEligible": farmer.carbon_eligible,
        "carbonEnrolled": farmer.carbon_enrolled, "village": farmer.village,
        "district": farmer.district, "state": farmer.state_code,
        "registeredAt": farmer.created_at.isoformat() if farmer.created_at else None,
    }}


@router.put("/farmers/{farmer_id}/verify")
async def verify_farmer(farmer_id: str, body: dict, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Farmer).where(Farmer.id == UUID(farmer_id)))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    status = body.get("status", "verified")
    farmer.is_verified = (status == "verified")
    farmer.verification_status = status
    await db.commit()
    return {"success": True, "data": {"id": str(farmer.id), "status": status}}


@router.put("/farmers/{farmer_id}/suspend")
async def suspend_farmer(farmer_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Farmer).where(Farmer.id == UUID(farmer_id)))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    farmer.is_verified = False
    farmer.verification_status = "suspended"
    await db.commit()
    return {"success": True, "data": {"id": str(farmer.id), "status": "suspended"}}


@router.put("/farmers/{farmer_id}/block")
async def block_farmer(farmer_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Farmer).where(Farmer.id == UUID(farmer_id)))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    farmer.is_verified = False
    farmer.verification_status = "blocked"
    await db.commit()
    return {"success": True, "data": {"id": str(farmer.id), "status": "blocked"}}


@router.get("/claims")
async def get_claims(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    min_fraud_score: int = Query(0, ge=0, le=100),
    max_fraud_score: int = Query(100, ge=0, le=100),
    search: Optional[str] = None,
    sort_by: str = "fraud_score",
    sort_order: str = "desc",
):
    query = select(Claim, Farmer, UdlrnMaster).join(Farmer, Claim.farmer_id == Farmer.id).join(UdlrnMaster, Claim.udlrn == UdlrnMaster.udlrn, isouter=True).where(Claim.fraud_score >= min_fraud_score, Claim.fraud_score <= max_fraud_score)
    if status:
        query = query.where(Claim.status == status)
    if search:
        query = query.where(or_(
            Farmer.full_name.ilike(f"%{search}%"),
            Claim.claim_number.ilike(f"%{search}%"),
            Claim.udlrn.ilike(f"%{search}%"),
            Farmer.mobile.ilike(f"%{search}%"),
        ))
    sort_col = getattr(Claim, sort_by, Claim.fraud_score)
    if sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))
    total = await db.scalar(select(func.count(Claim.id)).where(Claim.fraud_score >= min_fraud_score, Claim.fraud_score <= max_fraud_score))
    result = await db.execute(query.limit(limit).offset((page-1)*limit))
    rows = result.all()
    claims_list = []
    for claim, farmer, land in rows:
        claims_list.append({
            "id": str(claim.id),
            "claimNumber": claim.claim_number,
            "farmerName": farmer.full_name if farmer else "Unknown",
            "farmerMobile": farmer.mobile if farmer else None,
            "udlrn": claim.udlrn,
            "declaredCrop": claim.declared_crop,
            "damageCause": claim.damage_cause,
            "damagePercent": float(claim.damage_percent or 0),
            "claimedAreaHa": float(claim.claimed_area_ha or 0),
            "fraudScore": claim.fraud_score,
            "fraudVerdict": claim.fraud_verdict,
            "status": claim.status,
            "district": farmer.district if farmer else None,
            "createdAt": claim.created_at.isoformat() if claim.created_at else None,
            "season": claim.season,
            "year": claim.year,
            "fraudSignalsCount": len(claim.fraud_signals or []),
        })
    return {"success": True, "data": {"claims": claims_list, "total": total or 0, "page": page, "pages": math.ceil((total or 0) / limit)}}


@router.get("/claims/{claim_id}")
async def get_claim_detail(claim_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    land_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == claim.udlrn))
    land = land_result.scalar_one_or_none()
    visit_result = await db.execute(select(CceVisit).where(CceVisit.claim_id == UUID(claim_id)))
    visit = visit_result.scalar_one_or_none()
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
        "claimedAreaHa": float(claim.claimed_area_ha or 0),
        "damagePercent": float(claim.damage_percent or 0),
        "damageCause": claim.damage_cause,
        "season": claim.season,
        "year": claim.year,
        "filedAt": claim.created_at.isoformat() if claim.created_at else None,
        "farmer": {"name": farmer.full_name if farmer else None, "mobile": farmer.mobile if farmer else None, "id": str(farmer.id) if farmer else None},
        "land": {"areaHa": float(land.land_area_ha) if land else 0, "surveyNo": getattr(land, 'survey_number', None), "crop": land.declared_crop if land else None, "isFrozen": land.is_frozen == "true" if land else False, "state": farmer.state_code if farmer else None, "district": farmer.district if farmer else None, "taluk": farmer.taluk if farmer else None, "village": farmer.village if farmer else None},
        "visit": {"id": str(visit.id), "status": visit.status, "assignedAt": str(visit.created_at), "visitDate": str(visit.visit_date) if visit.visit_date else None, "gpsMatch": visit.gps_match, "gpsDistanceM": visit.gps_distance_m, "cropFound": visit.crop_found, "cropMatch": visit.crop_match, "areaVisitedHa": float(visit.area_visited_ha) if visit and visit.area_visited_ha else None, "damagePercent": float(visit.damage_percent) if visit and visit.damage_percent else None, "recommendation": visit.recommendation, "remarks": visit.remarks, "checklist": visit.checklist} if visit else None,
        "ndviData": claim.satellite_data,
    }}


@router.post("/claims/{claim_id}/approve")
async def approve_claim(claim_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "APPROVED"
    await db.commit()
    return {"success": True, "data": {"id": str(claim.id), "status": "APPROVED"}}


@router.post("/claims/{claim_id}/reject")
async def reject_claim(claim_id: str, body: dict, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "REJECTED"
    claim.fraud_verdict = body.get("reason", "Manual rejection by admin")
    await db.commit()
    return {"success": True, "data": {"id": str(claim.id), "status": "REJECTED", "reason": claim.fraud_verdict}}


@router.post("/claims/{claim_id}/assign-visit")
async def assign_visit(claim_id: str, body: dict, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    from app.models.field_officer import FieldOfficer
    result = await db.execute(select(FieldOfficer).where(FieldOfficer.id == UUID(body.get("officerId", ""))))
    officer = result.scalar_one_or_none()
    claim_result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = claim_result.scalar_one_or_none()
    if not claim or not officer:
        raise HTTPException(status_code=404, detail="Claim or officer not found")
    from datetime import date
    visit = CceVisit(visit_number=f"VISIT-{claim.claim_number}", claim_id=UUID(claim_id), farmer_id=claim.farmer_id, udlrn=claim.udlrn, assigned_to=officer.id, assigned_by=UUID(user["userId"]), status="ASSIGNED", scheduled_date=date.today())
    db.add(visit)
    await db.commit()
    return {"success": True, "data": {"visitId": str(visit.id), "status": "ASSIGNED"}}


@router.get("/claims/{claim_id}/satellite-evidence")
async def get_satellite_evidence(claim_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from uuid import UUID
    from app.services.satellite_service import get_claim_evidence
    result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    land_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == claim.udlrn))
    land = land_result.scalar_one_or_none()
    gps = {"lat": 13.1234, "lng": 77.5678}
    if land and land.gps_lat:
        gps['lat'] = float(land.gps_lat)
    if land and land.gps_lng:
        gps['lng'] = float(land.gps_lng)
    evidence = await get_claim_evidence(
        claim_id=str(claim.id),
        udlrn=claim.udlrn,
        gps=gps,
        claim_date=str(claim.created_at.date()) if claim.created_at else None,
        damage_cause=claim.damage_cause or "UNKNOWN",
        damage_percent=float(claim.damage_percent or 0),
        crop=claim.declared_crop or "PADDY",
    )
    return {"success": True, "data": evidence}


@router.get("/officers")
async def get_officers(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from app.models.field_officer import FieldOfficer
    result = await db.execute(select(FieldOfficer))
    officers = result.scalars().all()
    return {"success": True, "data": [{"id": str(o.id), "fullName": o.full_name, "email": o.email, "role": o.role} for o in officers]}


@router.get("/audit-log")
async def get_audit_log(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role), page: int = 1, limit: int = 50):
    from app.models.audit_trail import AuditTrail
    result = await db.execute(select(AuditTrail).order_by(AuditTrail.created_at.desc()).limit(limit).offset((page-1)*limit))
    logs = result.scalars().all()
    return {"success": True, "data": [{"id": str(l.id), "action": l.action, "actorRole": l.actor_role, "createdAt": str(l.created_at)} for l in logs]}


@router.get("/charts/claims-status")
async def claims_status_chart(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT status, COUNT(*)::int as count FROM claims GROUP BY status ORDER BY count DESC")
    )
    rows = result.mappings().fetchall()
    status_colors = {
        'AUTO_APPROVED': '#22c55e', 'APPROVED': '#16a34a',
        'PROCESSING': '#3b82f6', 'UNDER_REVIEW': '#f59e0b',
        'PENDING_VISIT': '#f97316', 'AUTO_REJECTED': '#ef4444',
        'REJECTED': '#dc2626', 'PENDING': '#94a3b8',
    }
    data = [
        {"status": r["status"], "count": r["count"], "color": status_colors.get(r["status"], "#94a3b8"), "label": r["status"].replace('_', ' ').title()}
        for r in rows
    ]
    total = sum(d["count"] for d in data)
    return {"success": True, "data": {"breakdown": data, "total": total}}


@router.get("/charts/fraud-distribution")
async def fraud_distribution_chart(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            SUM(CASE WHEN fraud_score BETWEEN 0 AND 30 THEN 1 ELSE 0 END) AS low,
            SUM(CASE WHEN fraud_score BETWEEN 31 AND 60 THEN 1 ELSE 0 END) AS medium,
            SUM(CASE WHEN fraud_score BETWEEN 61 AND 80 THEN 1 ELSE 0 END) AS high,
            SUM(CASE WHEN fraud_score BETWEEN 81 AND 100 THEN 1 ELSE 0 END) AS critical
        FROM claims WHERE fraud_score IS NOT NULL
    """))
    row = result.mappings().fetchone()
    return {"success": True, "data": {"distribution": [
        {"range": "0-30", "label": "Low Risk", "count": row["low"] or 0, "color": "#22c55e"},
        {"range": "31-60", "label": "Medium Risk", "count": row["medium"] or 0, "color": "#f59e0b"},
        {"range": "61-80", "label": "High Risk", "count": row["high"] or 0, "color": "#f97316"},
        {"range": "81-100", "label": "Critical", "count": row["critical"] or 0, "color": "#ef4444"},
    ]}}


@router.get("/charts/weekly-claims")
async def weekly_claims_chart(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            TO_CHAR(created_at, 'Dy') AS day,
            DATE(created_at) AS date,
            COUNT(*)::int AS total,
            SUM(CASE WHEN fraud_score > 60 THEN 1 ELSE 0 END)::int AS flagged
        FROM claims
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at), TO_CHAR(created_at, 'Dy')
        ORDER BY DATE(created_at)
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [
        {"day": r["day"], "total": r["total"], "flagged": r["flagged"]}
        for r in rows
    ]}


@router.post("/disaster-mode")
async def create_disaster_mode(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    from app.models.disaster_event import DisasterEvent
    from uuid import uuid4
    event = DisasterEvent(
        id=uuid4(),
        event_name="Manual Disaster Declaration",
        disaster_type="OTHER",
        declared_by=user["userId"],
        status="ACTIVE",
    )
    db.add(event)
    await db.commit()
    return {"success": True, "data": {"disasterId": str(event.id), "status": "ACTIVE"}}


@router.get("/disaster-mode")
async def get_disaster_mode(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from app.models.disaster_event import DisasterEvent
    from sqlalchemy import select
    result = await db.execute(select(DisasterEvent).where(DisasterEvent.status == "ACTIVE").order_by(DisasterEvent.created_at.desc()))
    event = result.scalar_one_or_none()
    if not event:
        return {"success": True, "data": None}
    return {"success": True, "data": {"id": str(event.id), "name": event.event_name, "status": event.status, "declaredAt": event.created_at.isoformat()}}


@router.put("/disaster-mode/{disaster_id}/deactivate")
async def deactivate_disaster(disaster_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from app.models.disaster_event import DisasterEvent
    from uuid import UUID
    result = await db.execute(select(DisasterEvent).where(DisasterEvent.id == UUID(disaster_id)))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Disaster event not found")
    event.status = "INACTIVE"
    await db.commit()
    return {"success": True, "data": {"status": "INACTIVE"}}


@router.post("/claims/{claim_id}/score")
async def admin_trigger_score(claim_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from app.services.scoring_service import score_claim
    try:
        result = await score_claim(claim_id, db, use_cpp=False)
        return {"success": True, "data": result["data"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claims/{claim_id}/dossier")
async def get_claim_dossier(claim_id: str, db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from app.services.dossier_service import generate_evidence_dossier
    try:
        dossier = await generate_evidence_dossier(claim_id, db)
        return {"success": True, "data": dossier}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vao-alerts")
async def get_admin_vao_alerts(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
    status: Optional[str] = None,
):
    from app.models.vao_alert import VaoAlert
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
        "createdAt": str(a.created_at),
    } for a in alerts]}


@router.get("/system-config")
async def get_system_config(db: AsyncSession = Depends(get_db), user = Depends(require_admin_role)):
    from app.models.system_config import SystemConfig
    result = await db.execute(select(SystemConfig))
    configs = result.scalars().all()
    return {"success": True, "data": [{"key": c.key, "value": c.value, "description": c.description} for c in configs]}


@router.get("/visits")
async def get_officer_visits(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    from uuid import UUID
    query = select(CceVisit)
    if status:
        query = query.where(CceVisit.status == status)
    result = await db.execute(query.order_by(CceVisit.scheduled_date.desc()).offset((page - 1) * limit).limit(limit))
    visits = result.scalars().all()
    return {"success": True, "data": [{
        "id": str(v.id),
        "claimId": str(v.claim_id) if v.claim_id else None,
        "officerId": str(v.officer_id) if v.officer_id else None,
        "scheduledDate": str(v.scheduled_date) if v.scheduled_date else None,
        "completedDate": str(v.completed_date) if v.completed_date else None,
        "status": v.status,
        "notes": v.notes,
        "gpsLat": v.gps_lat,
        "gpsLng": v.gps_lng,
        "photos": v.photos or [],
    } for v in visits]}