from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.fraud_scoring import FraudScore, FraudExplanation
from app.schemas.fraud import FraudScoreOut, FraudExplanationOut, ScoreOverrideRequest
from uuid import UUID as PyUUID

router = APIRouter()

@router.get("/fraud-scores/{claim_id}", response_model=dict)
async def get_fraud_score(claim_id: PyUUID, db: AsyncSession = Depends(get_db)):
    score_result = await db.execute(
        select(FraudScore).where(FraudScore.claim_id == claim_id).order_by(FraudScore.computed_at.desc())
    )
    score = score_result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Fraud score not found for this claim")

    explanation_result = await db.execute(
        select(FraudExplanation).where(FraudExplanation.fraud_score_id == score.id)
    )
    explanation = explanation_result.scalar_one_or_none()

    return {
        "success": True,
        "data": {
            "score": float(score.score),
            "confidence": float(score.confidence),
            "risk_level": score.risk_level,
            "model_version": score.model_version,
            "computed_at": score.computed_at.isoformat(),
            "explanation": {
                "top_factors": explanation.top_factors if explanation else [],
                "human_readable_text": explanation.human_readable_text if explanation else None,
            } if explanation else None,
        }
    }

@router.post("/fraud-scores/{claim_id}/override")
async def override_fraud_score(claim_id: PyUUID, data: ScoreOverrideRequest, db: AsyncSession = Depends(get_db)):
    score_result = await db.execute(
        select(FraudScore).where(FraudScore.claim_id == claim_id).order_by(FraudScore.computed_at.desc())
    )
    original = score_result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="No existing fraud score to override")

    override = FraudScore(
        claim_id=claim_id,
        score=data.override_score,
        confidence=1.0,
        risk_level="OVERRIDE",
        model_version=original.model_version,
    )
    db.add(override)
    await db.commit()
    await db.refresh(override)
    return {"success": True, "data": {"new_score_id": str(override.id), "original_score_id": str(original.id), "reason": data.override_reason}}
