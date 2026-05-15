"""
Bhuvigyan V7 — Fraud Scoring Orchestrator
Runs feature assembly -> model inference -> persistence -> risk band routing.
"""
import json
import random
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.claim import Claim
from app.models.fraud_scoring import FraudScore, FraudExplanation, FraudFeatureSnapshot
from app.models.model_registry import ModelRegistry
from app.models.scoring_request import ScoringRequest, ScoringResult
from app.services.feature_assembler import assemble_features
from app.services.fraud_service import compute_fraud_score, python_fallback_scorer


RISK_BANDS = {
    (0, 30): ("LOW", "AUTO_APPROVED"),
    (31, 60): ("MEDIUM", "OFFICER_REVIEW"),
    (61, 80): ("HIGH", "CCE_VISIT"),
    (81, 100): ("CRITICAL", "AUTO_REJECTED"),
}


def _get_risk_band(score: float) -> tuple:
    for (lo, hi), (risk_level, claim_status) in RISK_BANDS.items():
        if lo <= score <= hi:
            return risk_level, claim_status
    return "CRITICAL", "AUTO_REJECTED"


def _clamp_score(score: float) -> float:
    return max(0.0, min(100.0, float(score)))


def _generate_explanation(features: Dict[str, Any], score: float) -> Dict[str, Any]:
    """Generate top-5 contributing factors from features (rule-based approximation for MVP)."""
    factors = []

    # Factor 1: claim amount ratio
    car = features.get("claim_amount_ratio", 0)
    if car > 1.5:
        factors.append({
            "name": "claim_amount_ratio",
            "weight": min(20.0, round((car - 1.0) * 30, 1)),
            "direction": "+",
            "description": f"Claim amount is {car:.1f}x higher than typical for this crop"
        })

    # Factor 2: geo cluster
    gc = features.get("geo_cluster_different_farmers", 0)
    if gc >= 2:
        factors.append({
            "name": "geo_cluster_different_farmers",
            "weight": min(18.0, gc * 6.0),
            "direction": "+",
            "description": f"{gc} other farmers filed claims from the same GPS coordinates in 90 days"
        })

    # Factor 3: weather mismatch
    if features.get("weather_mismatch", 0):
        factors.append({
            "name": "weather_mismatch",
            "weight": 12.0,
            "direction": "+",
            "description": "No rainfall recorded on claimed flood date"
        })

    # Factor 4: ndvi mismatch
    if features.get("ndvi_mismatch", 0):
        factors.append({
            "name": "ndvi_mismatch",
            "weight": 10.0,
            "direction": "+",
            "description": "NDVI drop is minimal but claimed loss is high"
        })

    # Factor 5: officer discrepancy
    diff = features.get("officer_loss_pct_diff")
    if diff and diff > 15:
        factors.append({
            "name": "officer_loss_pct_diff",
            "weight": min(15.0, diff * 0.4),
            "direction": "+",
            "description": f"Officer assessed {diff:.0f}% less loss than farmer claimed"
        })

    # Factor 6: duplicate
    if features.get("same_gps_3plus_claims", 0):
        factors.append({
            "name": "same_gps_3plus_claims",
            "weight": 10.0,
            "direction": "+",
            "description": "3+ claims from same GPS in 90 days"
        })

    # Factor 7: prior fraud flags
    pff = features.get("prior_fraud_flags", 0)
    if pff >= 1:
        factors.append({
            "name": "prior_fraud_flags",
            "weight": min(12.0, pff * 6.0),
            "direction": "+",
            "description": f"Farmer has {pff} prior fraud-flagged claims"
        })

    # Factor 8: affected area ratio
    aar = features.get("affected_area_ratio", 0)
    if aar > 0.95:
        factors.append({
            "name": "affected_area_ratio",
            "weight": 8.0,
            "direction": "+",
            "description": "Claimed affected area is nearly entire insured area"
        })

    # Sort by absolute weight descending, take top 5
    factors.sort(key=lambda x: abs(x["weight"]), reverse=True)
    top_factors = factors[:5]

    shap_values = {f["name"]: f["weight"] for f in top_factors}
    human_text = "Top fraud indicators: " + "; ".join(
        f"{f['name']} ({f['direction']}{f['weight']:.1f})" for f in top_factors
    ) if top_factors else "No significant fraud indicators detected."

    return {
        "top_factors": top_factors,
        "shap_values": shap_values,
        "human_readable_text": human_text,
    }


async def score_claim(claim_id: str, db: AsyncSession, use_cpp: bool = True) -> Dict[str, Any]:
    """
    End-to-end scoring pipeline:
    1. Assemble features
    2. Run model inference (C++ -> Python fallback)
    3. Persist score + explanation + feature snapshot
    4. Update claim status based on risk band
    5. Return result
    """
    start_time = datetime.utcnow()
    req = ScoringRequest(
        id=uuid4(),
        claim_id=UUID(claim_id),
        status="PROCESSING",
        fallback_used=False,
    )
    db.add(req)
    await db.commit()

    try:
        # 1. Assemble features
        features = await assemble_features(claim_id, db)

        # 2. Load active model
        model_result = await db.execute(
            select(ModelRegistry).where(ModelRegistry.status == "PRODUCTION")
        )
        active_model: Optional[ModelRegistry] = model_result.scalar_one_or_none()
        model_version = active_model.version if active_model else "v6.0-fallback"
        req.model_id = active_model.id if active_model else None

        # 3. Model inference
        inference_result: Optional[Dict[str, Any]] = None
        fallback_used = False

        if use_cpp:
            try:
                inference_result = await compute_fraud_score(features)
            except Exception:
                inference_result = None

        if not inference_result:
            inference_result = python_fallback_scorer(features)
            fallback_used = True
            req.fallback_used = True

        raw_score = float(inference_result.get("fraudScore", 50))
        score = _clamp_score(raw_score)
        confidence = float(inference_result.get("confidence", 0.75))
        risk_level, claim_status = _get_risk_band(score)

        # If confidence < 0.7, force manual review regardless of band
        if confidence < 0.7 and claim_status in ("AUTO_APPROVED", "AUTO_REJECTED"):
            risk_level = "MEDIUM"
            claim_status = "OFFICER_REVIEW"

        # 3b. Auto-approval gate checks — downgrade if any gate fails
        if claim_status == "AUTO_APPROVED":
            from app.services.claim_decision_service import check_auto_approval_gates
            gate_result = await check_auto_approval_gates(claim_id, score, db)
            if not gate_result["eligible"]:
                risk_level = "MEDIUM"
                claim_status = "OFFICER_REVIEW"

        # 4. Persist feature snapshot
        snapshot = FraudFeatureSnapshot(
            id=uuid4(),
            claim_id=UUID(claim_id),
            features_json=features,
        )
        db.add(snapshot)

        # 5. Persist score
        fraud_score = FraudScore(
            id=uuid4(),
            claim_id=UUID(claim_id),
            score=score,
            confidence=confidence,
            risk_level=risk_level,
            model_version=model_version,
            feature_snapshot_id=snapshot.id,
        )
        db.add(fraud_score)
        await db.flush()

        # 6. Persist explanation (only if score >= 31 per SRS)
        explanation_data = None
        if score >= 31:
            explanation_data = _generate_explanation(features, score)
            explanation = FraudExplanation(
                id=uuid4(),
                fraud_score_id=fraud_score.id,
                top_factors=explanation_data["top_factors"],
                shap_values=explanation_data["shap_values"],
                human_readable_text=explanation_data["human_readable_text"],
            )
            db.add(explanation)

        # 7. Update claim
        claim_result = await db.execute(select(Claim).where(Claim.id == UUID(claim_id)))
        claim: Optional[Claim] = claim_result.scalar_one_or_none()
        if claim:
            claim.fraud_score = int(score)
            claim.fraud_verdict = claim_status
            claim.status = claim_status
            if claim_status in ("AUTO_APPROVED", "AUTO_REJECTED"):
                claim.decided_at = datetime.utcnow()

        # 7b. Trigger notification
        try:
            from app.services.notification_trigger_service import trigger_claim_notification
            await trigger_claim_notification(claim_id, claim_status, db)
        except Exception as e:
            logger = __import__("logging").getLogger(__name__)
            logger.warning(f"Notification trigger failed: {e}")

        # 8. Persist scoring result
        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        req.status = "COMPLETED"
        req.latency_ms = latency_ms

        result = ScoringResult(
            id=uuid4(),
            scoring_request_id=req.id,
            score=score,
            confidence=confidence,
            risk_level=risk_level,
            is_shadow=False,
        )
        db.add(result)
        await db.commit()

        return {
            "success": True,
            "data": {
                "score": score,
                "confidence": confidence,
                "risk_level": risk_level,
                "claim_status": claim_status,
                "model_version": model_version,
                "fallback_used": fallback_used,
                "latency_ms": latency_ms,
                "explanation": explanation_data,
                "auto_approval_gates": gate_result if claim_status == "OFFICER_REVIEW" and score <= 30 else None,
            }
        }

    except Exception as exc:
        req.status = "FAILED"
        await db.commit()
        raise exc
