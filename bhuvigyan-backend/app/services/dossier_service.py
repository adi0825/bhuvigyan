"""
Bhuvigyan V7 — Evidence PDF Dossier Generation
Assembles claim summary, farmer details, policy, inspection, photos, NDVI, fraud score into PDF.
"""
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.models.claim import Claim
from app.models.farmer import Farmer
from app.models.policy import Policy
from app.models.inspection import Inspection
from app.models.fraud_scoring import FraudScore, FraudExplanation
from app.models.claim_document import ClaimDocument


async def generate_evidence_dossier(claim_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Generate structured dossier data (PDF generation delegated to Celery/WeasyPrint in production)."""
    from uuid import UUID as PyUUID
    cid = PyUUID(claim_id)

    claim_result = await db.execute(select(Claim).where(Claim.id == cid))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        raise ValueError("Claim not found")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()

    policy_result = await db.execute(select(Policy).where(Policy.id == claim.policy_id))
    policy = policy_result.scalar_one_or_none()

    inspection_result = await db.execute(
        select(Inspection).where(Inspection.claim_id == cid).order_by(Inspection.completed_at.desc())
    )
    inspection = inspection_result.scalar_one_or_none()

    fraud_result = await db.execute(
        select(FraudScore).where(FraudScore.claim_id == cid).order_by(FraudScore.computed_at.desc())
    )
    fraud_score = fraud_result.scalar_one_or_none()

    explanation_result = await db.execute(
        select(FraudExplanation).where(FraudExplanation.fraud_score_id == fraud_score.id)
    ) if fraud_score else None
    explanation = explanation_result.scalar_one_or_none() if explanation_result else None

    docs_result = await db.execute(select(ClaimDocument).where(ClaimDocument.claim_id == cid))
    documents = docs_result.scalars().all()

    dossier = {
        "claim": {
            "id": str(claim.id),
            "claimNumber": claim.claim_number,
            "udlrn": claim.udlrn,
            "status": claim.status,
            "lossType": claim.loss_type,
            "lossDate": claim.loss_date.isoformat() if claim.loss_date else None,
            "affectedArea": float(claim.affected_area) if claim.affected_area else None,
            "claimAmount": float(claim.claim_amount_requested) if claim.claim_amount_requested else None,
            "description": claim.description,
            "gps": {"lat": float(claim.gps_latitude) if claim.gps_latitude else None, "lng": float(claim.gps_longitude) if claim.gps_longitude else None},
            "filedAt": claim.filed_at.isoformat() if claim.filed_at else None,
            "decidedAt": claim.decided_at.isoformat() if claim.decided_at else None,
        },
        "farmer": {
            "id": str(farmer.id) if farmer else None,
            "fullName": farmer.full_name if farmer else None,
            "mobile": farmer.mobile if farmer else None,
            "village": farmer.village if farmer else None,
            "district": farmer.district if farmer else None,
            "state": farmer.state_code if farmer else None,
        },
        "policy": {
            "policyNumber": policy.policy_number if policy else None,
            "crop": policy.crop if policy else None,
            "insuredArea": float(policy.insured_area) if policy else None,
            "sumInsured": float(policy.sum_insured) if policy else None,
            "startDate": policy.start_date.isoformat() if policy else None,
            "endDate": policy.end_date.isoformat() if policy else None,
        },
        "inspection": {
            "status": inspection.status if inspection else None,
            "actualLossPct": float(inspection.actual_loss_pct) if inspection and inspection.actual_loss_pct else None,
            "cropCondition": inspection.crop_condition if inspection else None,
            "weatherCorrelated": inspection.weather_correlated if inspection else None,
            "remarks": inspection.remarks if inspection else None,
            "completedAt": inspection.completed_at.isoformat() if inspection and inspection.completed_at else None,
        },
        "fraud": {
            "score": float(fraud_score.score) if fraud_score else None,
            "confidence": float(fraud_score.confidence) if fraud_score else None,
            "riskLevel": fraud_score.risk_level if fraud_score else None,
            "modelVersion": fraud_score.model_version if fraud_score else None,
            "topFactors": explanation.top_factors if explanation else [],
            "humanReadableText": explanation.human_readable_text if explanation else None,
        },
        "evidence": [
            {
                "fileName": d.file_name,
                "hash": d.file_hash,
                "url": d.storage_url,
                "mimeType": d.mime_type,
                "gps": {"lat": d.gps_latitude, "lng": d.gps_longitude},
                "exifTimestamp": d.exif_timestamp.isoformat() if d.exif_timestamp else None,
            }
            for d in documents
        ],
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }

    return dossier
