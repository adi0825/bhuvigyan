"""
Bhuvigyan V7 — Integration Tests for End-to-End Claim Flow (DB-001 to DB-007)
"""
import pytest
from uuid import uuid4
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select

from app.models.claim import Claim
from app.models.farmer import Farmer


@pytest.mark.asyncio
async def test_farmer_creates_claim(db_session):
    """FR-001: Farmer files a claim with all required fields."""
    db = db_session
    farmer = Farmer(
        id=uuid4(),
        full_name="Test Farmer",
        mobile="9900000099",
        state_code="MH",
        is_verified=True,
    )
    db.add(farmer)
    await db.commit()

    claim = Claim(
        id=uuid4(),
        claim_number="CLM-TEST-001",
        udlrn="UDLRN-TEST-001",
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
        description="Integration test claim",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()

    result = await db.execute(select(Claim).where(Claim.id == claim.id))
    saved = result.scalar_one()
    assert saved.status == "DRAFT"
    assert saved.farmer_id == farmer.id
    assert saved.loss_type == "DROUGHT"


@pytest.mark.asyncio
async def test_claim_submission_triggers_scoring(db_session):
    """FR-002: Claim submission triggers fraud scoring."""
    db = db_session
    claim = Claim(
        id=uuid4(),
        claim_number="CLM-TEST-002",
        udlrn="UDLRN-TEST-002",
        farmer_id=uuid4(),
        status="DRAFT",
        declared_crop="Wheat",
        claimed_area_ha=Decimal("3.0"),
        season="RABI",
        year=2026,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()

    claim.status = "SUBMITTED"
    claim.filed_at = datetime.utcnow()
    await db.commit()

    from app.services.scoring_service import score_claim
    result = await score_claim(str(claim.id), db, use_cpp=False)
    assert result["success"] is True
    assert result["data"]["score"] >= 0


@pytest.mark.asyncio
async def test_reviewer_approves_claim(db_session):
    """FR-005: Reviewer approves claim with approved amount."""
    db = db_session
    claim = Claim(
        id=uuid4(),
        claim_number="CLM-TEST-003",
        udlrn="UDLRN-TEST-003",
        farmer_id=uuid4(),
        status="OFFICER_REVIEW",
        declared_crop="Cotton",
        claimed_area_ha=Decimal("4.0"),
        season="KHARIF",
        year=2026,
        claim_amount_requested=Decimal("40000"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()

    claim.status = "APPROVED"
    claim.approved_amount = Decimal("35000")
    await db.commit()

    result = await db.execute(select(Claim).where(Claim.id == claim.id))
    updated = result.scalar_one()
    assert updated.status == "APPROVED"
    assert updated.approved_amount == Decimal("35000")


@pytest.mark.asyncio
async def test_transaction_atomicity_rollback(db_session):
    """DB-001: Transaction atomicity — claim persists after commit."""
    db = db_session
    claim = Claim(
        id=uuid4(),
        claim_number="CLM-TEST-ATOMIC",
        udlrn="UDLRN-ATOMIC",
        farmer_id=uuid4(),
        status="DRAFT",
        declared_crop="Rice",
        claimed_area_ha=Decimal("5.0"),
        season="KHARIF",
        year=2026,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.commit()

    await db.rollback()
    result = await db.execute(select(Claim).where(Claim.id == claim.id))
    assert result.scalar_one_or_none() is not None
