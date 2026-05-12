"""E2E test: full inspector workflow.

Flow:
1. Admin creates a field inspector
2. Admin assigns inspector to a claim
3. Inspector logs in
4. Inspector acknowledges visit
5. Inspector starts visit
6. Inspector submits inspection report
7. Admin reviews and verifies report
8. Claim status updated
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal


@pytest.mark.asyncio
async def test_full_inspector_workflow(db_session, client):
    """End-to-end test of the inspector portal workflow."""
    from app.services.inspector_service import (
        create_inspector, assign_inspector_to_claim, acknowledge_visit,
        start_visit, submit_inspection_report, verify_report
    )
    from app.services.farmer_service import create_farmer
    from app.models.claim import Claim
    from app.models.field_visit import FieldVisit
    from app.models.field_inspection_report import FieldInspectionReport

    # ── Step 1: Create a farmer and claim ──
    farmer = await create_farmer(db_session, {
        "mobile": "9911111111",
        "full_name": "Test Farmer",
        "state_code": "KA",
        "district": "Bagalkot",
    })
    await db_session.flush()

    claim = Claim(
        id=farmer.id,  # reuse UUID for simplicity
        claim_number="CLM-E2E-001",
        farmer_id=farmer.id,
        status="PENDING",
        fraud_score=Decimal("65.50"),
    )
    db_session.add(claim)
    await db_session.commit()

    # ── Step 2: Admin creates inspector ──
    inspector = await create_inspector(db_session, {
        "full_name": "Inspector Kumar",
        "employee_id": "EMP-001",
        "mobile": "9922222222",
        "department": "Agriculture",
        "state": "Karnataka",
        "districts_assigned": ["Bagalkot"],
    })
    await db_session.commit()
    assert inspector.id is not None
    assert inspector.password_hash is not None

    # ── Step 3: Admin assigns inspector to claim ──
    visit, error = await assign_inspector_to_claim(
        db_session, str(claim.id), "admin-id", {
            "inspector_id": str(inspector.id),
            "visit_type": "inspection",
            "trigger_reason": "fraud_score_61_80",
        }
    )
    assert error is None
    assert visit is not None
    assert visit.status == "assigned"
    assert visit.claim_id == claim.id
    assert visit.inspector_id == inspector.id

    # Verify claim status updated
    await db_session.refresh(claim)
    assert claim.status == "FIELD_VISIT_REQUIRED"

    # ── Step 4: Inspector acknowledges visit ──
    acknowledged = await acknowledge_visit(
        db_session, str(visit.id), str(inspector.id),
        date.today() + timedelta(days=3)
    )
    assert acknowledged is not None
    assert acknowledged.status == "acknowledged"
    assert acknowledged.scheduled_date is not None

    # ── Step 5: Inspector starts visit ──
    started = await start_visit(
        db_session, str(visit.id), str(inspector.id),
        Decimal("16.512345"), Decimal("75.512345")
    )
    assert started is not None
    assert started.status == "in_progress"
    assert started.gps_start_lat == Decimal("16.512345")

    # ── Step 6: Inspector submits report ──
    report, error = await submit_inspection_report(
        db_session, str(visit.id), str(inspector.id), {
            "crop_found": True,
            "crop_type_found": "Paddy",
            "crop_type_matches": True,
            "crop_stage": "grain_filling",
            "crop_condition": "moderate_damage",
            "actual_loss_pct": Decimal("35.0"),
            "claimed_loss_pct": Decimal("50.0"),
            "land_found": True,
            "land_area_observed": Decimal("2.5"),
            "land_area_claimed": Decimal("3.0"),
            "visible_water_damage": True,
            "visible_fire_damage": False,
            "visible_pest_damage": False,
            "visible_hail_damage": False,
            "inspector_recommendation": "partial_approve",
            "recommended_payout_pct": Decimal("70.0"),
            "notes": "Moderate water damage observed. Crop found but loss is less than claimed.",
            "fraud_suspicion": False,
            "gps_end_lat": Decimal("16.512350"),
            "gps_end_lng": Decimal("75.512350"),
        }
    )
    assert error is None
    assert report is not None
    assert report.crop_found is True
    assert report.actual_loss_pct == Decimal("35.0")
    assert report.discrepancy_pct == Decimal("15.0")  # 50 - 35
    assert report.area_discrepancy == Decimal("0.5")  # 3.0 - 2.5
    assert report.inspector_recommendation == "partial_approve"

    # Verify visit status
    await db_session.refresh(visit)
    assert visit.status == "submitted"
    assert visit.visit_end_time is not None

    # Verify claim status
    await db_session.refresh(claim)
    assert claim.status == "INSPECTOR_REPORT_RECEIVED"

    # Verify inspector stats
    await db_session.refresh(inspector)
    assert inspector.completed_visits == 1

    # ── Step 7: Admin verifies report ──
    verified_visit = await verify_report(db_session, str(visit.id), True, "Report looks accurate")
    assert verified_visit is not None
    assert verified_visit.status == "verified"

    # Verify claim status updated
    await db_session.refresh(claim)
    assert claim.status == "INSPECTOR_REPORT_VERIFIED"
