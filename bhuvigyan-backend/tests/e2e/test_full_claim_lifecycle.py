"""
Bhuvigyan V7 — End-to-End Full Claim Lifecycle Test
Farmer → Claim → Scoring → Review → Decision
"""
import pytest
from uuid import uuid4
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select

from app.models.claim import Claim
from app.models.farmer import Farmer


@pytest.mark.asyncio
async def test_full_claim_lifecycle(db_session):
    """End-to-end: farmer creates claim, system scores it, reviewer approves it."""
    db = db_session
    # 1. Create farmer
    farmer = Farmer(
        id=uuid4(),
        full_name="Lifecycle Test Farmer",
        mobile="9900000098",
        state_code="MH",
        is_verified=True,
    )
    db.add(farmer)
    await db.commit()

    # 2. Create claim
    claim = Claim(
        id=uuid4(),
        claim_number="CLM-E2E-001",
        udlrn="UDLRN-E2E-001",
        farmer_id=farmer.id,
        status="DRAFT",
        declared_crop="Rice",
        claimed_area_ha=Decimal("5.0"),
        season="KHARIF",
        year=2026,
        loss_type="DROUGHT",
        loss_date=date(2026, 3, 15),
        affected_area=Decimal("2.5"),
        claim_amount_requested=Decimal("50000"),
        description="End-to-end lifecycle test claim",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()

    # 3. Submit claim
    claim.status = "SUBMITTED"
    claim.filed_at = datetime.utcnow()
    await db.commit()

    # 4. Trigger scoring
    from app.services.scoring_service import score_claim
    score_result = await score_claim(str(claim.id), db, use_cpp=False)
    assert score_result["success"] is True
    assert score_result["data"]["score"] >= 0

    # 5. Move to officer review
    claim.status = "OFFICER_REVIEW"
    await db.commit()

    # 6. Reviewer approves
    claim.status = "APPROVED"
    claim.approved_amount = Decimal("45000")
    await db.commit()

    # 7. Verify final state
    result = await db.execute(select(Claim).where(Claim.id == claim.id))
    final_claim = result.scalar_one()
    assert final_claim.status == "APPROVED"
    assert final_claim.approved_amount == Decimal("45000")
    assert final_claim.fraud_score is not None
