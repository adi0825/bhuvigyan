from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_db
from app.dependencies import require_state_role
from app.models.claim import Claim
from app.models.claim_status_history import ClaimStatusHistory
from app.services.audit_service import log_event
from app.services.notification_service import create_notification
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter()

@router.get("/state/claims")
async def get_state_claims(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_state_role),
):
    """Get claims in the state/DC review queue."""
    stmt = select(Claim).where(Claim.status.in_(["OFFICER_REVIEW", "CCE_VISIT", "SUBMITTED"]))
    if status:
        stmt = stmt.where(Claim.status == status)
    stmt = stmt.order_by(Claim.fraud_score.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    claims = result.scalars().all()
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": str(c.id),
                    "claimNumber": c.claim_number,
                    "status": c.status,
                    "fraudScore": c.fraud_score,
                    "lossType": c.loss_type,
                    "claimedAreaHa": float(c.claimed_area_ha) if c.claimed_area_ha else None,
                    "claimAmount": float(c.claim_amount_requested) if c.claim_amount_requested else None,
                    "filedAt": c.filed_at.isoformat() if c.filed_at else None,
                }
                for c in claims
            ],
            "total": len(claims),
        }
    }

@router.post("/state/claims/{claim_id}/decision")
async def make_decision(
    claim_id: UUID,
    decision: str,  # APPROVE, REJECT, FLAG
    approved_amount: Optional[float] = None,
    rejection_reason: Optional[str] = None,
    review_notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_state_role),
):
    """State/DC reviewer makes a decision on a claim."""
    result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status not in ("OFFICER_REVIEW", "CCE_VISIT", "SUBMITTED"):
        raise HTTPException(status_code=400, detail="Claim is not in reviewable status")

    old_status = claim.status
    reviewer_id = UUID(user["userId"])

    if decision == "APPROVE":
        if approved_amount is None or approved_amount < 0:
            raise HTTPException(status_code=400, detail="Approved amount required for approval")
        claim.status = "APPROVED"
        claim.approved_amount = approved_amount
        claim.reviewer_id = reviewer_id
        claim.decided_at = datetime.utcnow()
    elif decision == "REJECT":
        if not rejection_reason or len(rejection_reason) < 20:
            raise HTTPException(status_code=400, detail="Rejection reason must be at least 20 characters")
        claim.status = "REJECTED"
        claim.rejection_reason = rejection_reason
        claim.reviewer_id = reviewer_id
        claim.decided_at = datetime.utcnow()
    elif decision == "FLAG":
        if not review_notes or len(review_notes) < 20:
            raise HTTPException(status_code=400, detail="Flag notes must be at least 20 characters")
        claim.status = "FLAGGED"
        claim.review_notes = review_notes
        claim.reviewer_id = reviewer_id
    else:
        raise HTTPException(status_code=400, detail="Invalid decision. Use APPROVE, REJECT, or FLAG")

    claim.updated_at = datetime.utcnow()

    # Create status history entry
    history = ClaimStatusHistory(
        id=uuid4(),
        claim_id=claim_id,
        from_status=old_status,
        to_status=claim.status,
        actor_id=reviewer_id,
        actor_type=user.get("role", "REVIEWER"),
        notes=review_notes or rejection_reason or f"Decision: {decision}",
    )
    db.add(history)

    # Audit log
    await log_event(
        db,
        action=f"CLAIM_{decision}",
        actor_id=str(reviewer_id),
        actor_type=user.get("role"),
        target_id=str(claim_id),
        target_type="CLAIM",
        details={"decision": decision, "old_status": old_status, "new_status": claim.status},
    )

    # Notification to farmer
    await create_notification(
        db,
        user_id=str(claim.farmer_id),
        notif_type=f"CLAIM_{decision}",
        title=f"Claim {decision.title()}d",
        message=f"Your claim {claim.claim_number} has been {decision.lower()}d by the reviewer.",
        channel="IN_APP",
    )

    await db.commit()

    return {
        "success": True,
        "data": {
            "claimId": str(claim_id),
            "claimNumber": claim.claim_number,
            "status": claim.status,
            "decision": decision,
            "decidedAt": claim.decided_at.isoformat() if claim.decided_at else None,
        }
    }
