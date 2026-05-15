from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db
from app.dependencies import require_admin_role
from app.models.claim import Claim
from app.models.fraud_scoring import FraudScore
from typing import Optional

router = APIRouter()

@router.get("/reports/fraud-trend")
async def fraud_trend(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    result = await db.execute(text(f"""
        SELECT DATE(created_at) as date,
               AVG(fraud_score)::float as avg_score,
               COUNT(*)::int as claim_count
        FROM claims
        WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
          AND fraud_score IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [{"date": str(r["date"]), "avgScore": r["avg_score"], "claimCount": r["claim_count"]} for r in rows]}

@router.get("/reports/district-heatmap")
async def district_heatmap(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    result = await db.execute(text("""
        SELECT f.district, COUNT(*)::int as claim_count, AVG(c.fraud_score)::float as avg_score
        FROM claims c
        JOIN farmers f ON c.farmer_id = f.id
        WHERE c.fraud_score IS NOT NULL
        GROUP BY f.district
        ORDER BY avg_score DESC
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [{"district": r["district"] or "Unknown", "claimCount": r["claim_count"], "avgScore": r["avg_score"]} for r in rows]}

@router.get("/reports/reviewer-productivity")
async def reviewer_productivity(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    result = await db.execute(text(f"""
        SELECT reviewer_id, COUNT(*)::int as decisions,
               AVG(EXTRACT(EPOCH FROM (decided_at - filed_at))/3600)::float as avg_hours
        FROM claims
        WHERE decided_at IS NOT NULL
          AND decided_at >= CURRENT_DATE - INTERVAL '{days} days'
        GROUP BY reviewer_id
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [{"reviewerId": str(r["reviewer_id"]), "decisions": r["decisions"], "avgHours": r["avg_hours"]} for r in rows]}


@router.post("/reports/claim/{claim_id}/rejection-report")
async def generate_rejection_report_endpoint(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    """Generate a rejection/assessment report PDF for a claim."""
    from uuid import UUID
    from app.models.farmer import Farmer
    from app.models.udlrn_master import UdlrnMaster
    from app.models.fraud_scoring import FraudScore, FraudExplanation
    from app.models.claim_document import ClaimDocument
    from app.models.claim_status_history import ClaimStatusHistory
    from app.services.pdf_service import generate_rejection_report
    from app.services.satellite_service import SatelliteService

    claim_result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()

    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == claim.farmer_id))
    udlrn = udlrn_result.scalar_one_or_none()

    # Fraud score
    fraud_result = await db.execute(
        select(FraudScore).where(FraudScore.claim_id == UUID(claim_id)).order_by(FraudScore.created_at.desc())
    )
    fraud = fraud_result.scalar_one_or_none()

    # Documents
    docs_result = await db.execute(select(ClaimDocument).where(ClaimDocument.claim_id == UUID(claim_id)))
    docs = docs_result.scalars().all()

    # Audit trail
    audit_result = await db.execute(
        select(ClaimStatusHistory)
        .where(ClaimStatusHistory.claim_id == UUID(claim_id))
        .order_by(ClaimStatusHistory.created_at.asc())
    )
    audit_events = audit_result.scalars().all()

    # Real satellite data
    sat_data = {}
    if farmer and farmer.latitude and farmer.longitude:
        svc = SatelliteService()
        ndvi = svc.get_ndvi_current(float(farmer.latitude), float(farmer.longitude))
        sar = svc.get_sar_flood(float(farmer.latitude), float(farmer.longitude))
        sat_data = {
            "ndvi": ndvi.get("ndvi") if isinstance(ndvi, dict) else None,
            "ndviLabel": ndvi.get("health_label") if isinstance(ndvi, dict) else None,
            "sarFlood": sar.get("flood_detected") if isinstance(sar, dict) else False,
            "cloudCover": ndvi.get("cloud_cover_pct") if isinstance(ndvi, dict) else None,
            "lastScan": ndvi.get("scan_date") if isinstance(ndvi, dict) else None,
            "conclusion": "Satellite data reviewed for claim assessment.",
        }

    # Factor breakdown from fraud explanation
    factor_breakdown = []
    if fraud:
        expl_result = await db.execute(
            select(FraudExplanation).where(FraudExplanation.fraud_score_id == fraud.id)
        )
        expl = expl_result.scalar_one_or_none()
        if expl and expl.top_factors:
            for tf in expl.top_factors:
                factor_breakdown.append({
                    "factor": tf.get("name", ""),
                    "weight": tf.get("weight", 0),
                    "score": tf.get("weight", 0),
                    "reason": tf.get("description", ""),
                })

    report_data = {
        "claim": {
            "claimNumber": claim.claim_number,
            "status": claim.status,
            "lossType": claim.damage_cause or "UNKNOWN",
            "damagePercent": float(claim.damage_percent) if claim.damage_percent else None,
            "affectedArea": float(claim.affected_area) if claim.affected_area else None,
            "claimAmount": float(claim.claim_amount_requested) if claim.claim_amount_requested else None,
            "crop": claim.declared_crop,
            "season": claim.season,
            "decisionReason": claim.description or "Claim assessed by Bhuvigyan Autonomous System.",
        },
        "farmer": {
            "fullName": farmer.full_name if farmer else "Unknown",
            "ulpin": udlrn.udlrn if udlrn else None,
            "village": farmer.village if farmer else None,
            "taluk": farmer.taluk if farmer else None,
            "district": farmer.district if farmer else None,
            "state": farmer.state_code if farmer else None,
        },
        "satellite": sat_data,
        "fraud": {
            "score": int(fraud.score) if fraud else 0,
            "riskLevel": fraud.risk_level if fraud else "UNKNOWN",
            "verdict": fraud.risk_level if fraud else "UNKNOWN",
            "confidence": float(fraud.confidence) if fraud else 0,
            "modelVersion": fraud.model_version if fraud else "unknown",
            "keyIssues": [f"{f.get('name', '')}: {f.get('description', '')}" for f in (expl.top_factors if expl else [])][:3],
            "factor_breakdown": factor_breakdown,
        },
        "documents": [
            {"name": d.document_type or "Document", "submitted": str(d.created_at), "status": "Verified", "reason": ""}
            for d in docs
        ],
        "audit_trail": [
            {"date": str(e.created_at), "event": e.status, "actor": e.changed_by or "System", "notes": e.notes or ""}
            for e in audit_events
        ],
    }

    filepath = await generate_rejection_report(report_data)
    filename = filepath.split("/")[-1]
    return {"success": True, "data": {"filepath": filepath, "filename": filename, "downloadUrl": f"/uploads/reports/{filename}"}}
