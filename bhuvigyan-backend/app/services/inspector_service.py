"""Inspector service — business logic for field inspector operations."""
from datetime import datetime, timedelta, date
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field_inspector import FieldInspector
from app.models.field_visit import FieldVisit
from app.models.field_inspection_report import FieldInspectionReport
from app.models.cce_plot import CcePlot
from app.models.claim import Claim
from app.services.notification_service import create_notification


async def get_inspector_profile(db: AsyncSession, inspector_id: str):
    result = await db.execute(select(FieldInspector).where(FieldInspector.id == inspector_id))
    return result.scalar_one_or_none()


async def get_inspector_by_mobile(db: AsyncSession, mobile: str):
    result = await db.execute(select(FieldInspector).where(FieldInspector.mobile == mobile))
    return result.scalar_one_or_none()


async def create_inspector(db: AsyncSession, data: dict):
    from app.utils.password_utils import get_password_hash
    inspector = FieldInspector(
        id=uuid4(),
        full_name=data["full_name"],
        employee_id=data["employee_id"],
        mobile=data["mobile"],
        department=data.get("department"),
        badge_number=data.get("badge_number"),
        districts_assigned=data.get("districts_assigned", []),
        state=data["state"],
        password_hash=get_password_hash("Insp@2026"),
    )
    db.add(inspector)
    await db.commit()
    await db.refresh(inspector)
    return inspector


async def update_inspector(db: AsyncSession, inspector_id: str, data: dict):
    result = await db.execute(select(FieldInspector).where(FieldInspector.id == inspector_id))
    inspector = result.scalar_one_or_none()
    if not inspector:
        return None
    for key, value in data.items():
        if value is not None and hasattr(inspector, key):
            setattr(inspector, key, value)
    await db.commit()
    await db.refresh(inspector)
    return inspector


async def get_inspector_visits(db: AsyncSession, inspector_id: str, status: str = None):
    query = select(FieldVisit).where(FieldVisit.inspector_id == inspector_id)
    if status:
        query = query.where(FieldVisit.status == status)
    query = query.order_by(FieldVisit.due_date.asc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_overdue_visits(db: AsyncSession, inspector_id: str):
    today = date.today()
    query = select(FieldVisit).where(
        and_(
            FieldVisit.inspector_id == inspector_id,
            FieldVisit.status != "submitted",
            FieldVisit.status != "verified",
            FieldVisit.due_date < today,
        )
    )
    result = await db.execute(query)
    return result.scalars().all()


async def acknowledge_visit(db: AsyncSession, visit_id: str, inspector_id: str, scheduled_date: date):
    result = await db.execute(
        select(FieldVisit).where(and_(FieldVisit.id == visit_id, FieldVisit.inspector_id == inspector_id))
    )
    visit = result.scalar_one_or_none()
    if not visit:
        return None
    visit.status = "acknowledged"
    visit.scheduled_date = scheduled_date
    visit.acknowledged_at = datetime.utcnow()
    await db.commit()
    await db.refresh(visit)

    # Notify admin
    if visit.assigned_by:
        await create_notification(
            db, str(visit.assigned_by), "VISIT_ACKNOWLEDGED",
            "Inspector acknowledged visit",
            f"Inspector {inspector_id} has acknowledged the visit for claim {visit.claim_id}. Scheduled for {scheduled_date}."
        )

    return visit


async def start_visit(db: AsyncSession, visit_id: str, inspector_id: str, gps_lat: Decimal, gps_lng: Decimal):
    result = await db.execute(
        select(FieldVisit).where(and_(FieldVisit.id == visit_id, FieldVisit.inspector_id == inspector_id))
    )
    visit = result.scalar_one_or_none()
    if not visit:
        return None
    visit.status = "in_progress"
    visit.visit_start_time = datetime.utcnow()
    visit.gps_start_lat = gps_lat
    visit.gps_start_lng = gps_lng
    # TODO: compute distance from farm centroid and set gps_verified
    await db.commit()
    await db.refresh(visit)
    return visit


async def submit_inspection_report(db: AsyncSession, visit_id: str, inspector_id: str, report_data: dict):
    # Get the visit
    result = await db.execute(
        select(FieldVisit).where(and_(FieldVisit.id == visit_id, FieldVisit.inspector_id == inspector_id))
    )
    visit = result.scalar_one_or_none()
    if not visit:
        return None, "Visit not found"

    # Compute discrepancy
    actual_loss = report_data.get("actual_loss_pct", Decimal(0))
    claimed_loss = report_data.get("claimed_loss_pct")
    discrepancy = abs(actual_loss - claimed_loss) if claimed_loss is not None else None

    # Compute area discrepancy
    land_observed = report_data.get("land_area_observed")
    land_claimed = report_data.get("land_area_claimed")
    area_disc = abs(land_observed - land_claimed) if land_observed and land_claimed else None

    # Create report
    report = FieldInspectionReport(
        id=uuid4(),
        visit_id=visit.id,
        claim_id=visit.claim_id,
        crop_found=report_data["crop_found"],
        crop_type_found=report_data.get("crop_type_found"),
        crop_type_matches=report_data.get("crop_type_matches"),
        crop_stage=report_data.get("crop_stage"),
        crop_condition=report_data.get("crop_condition"),
        actual_loss_pct=actual_loss,
        claimed_loss_pct=claimed_loss,
        discrepancy_pct=discrepancy,
        land_found=report_data["land_found"],
        land_area_observed=land_observed,
        land_area_claimed=land_claimed,
        area_discrepancy=area_disc,
        cce_conducted=report_data.get("cce_conducted", False),
        cce_plot_size_sqm=report_data.get("cce_plot_size_sqm"),
        cce_yield_kg=report_data.get("cce_yield_kg"),
        cce_estimated_yield_per_ha=report_data.get("cce_estimated_yield_per_ha"),
        threshold_yield=report_data.get("threshold_yield"),
        cce_loss_pct=report_data.get("cce_loss_pct"),
        weather_at_visit=report_data.get("weather_at_visit"),
        visible_water_damage=report_data.get("visible_water_damage", False),
        visible_fire_damage=report_data.get("visible_fire_damage", False),
        visible_pest_damage=report_data.get("visible_pest_damage", False),
        visible_hail_damage=report_data.get("visible_hail_damage", False),
        inspector_recommendation=report_data["inspector_recommendation"],
        recommended_payout_pct=report_data.get("recommended_payout_pct"),
        notes=report_data.get("notes"),
        fraud_suspicion=report_data.get("fraud_suspicion", False),
        fraud_suspicion_reason=report_data.get("fraud_suspicion_reason"),
        gps_end_lat=report_data.get("gps_end_lat"),
        gps_end_lng=report_data.get("gps_end_lng"),
    )
    db.add(report)

    # Update visit
    visit.status = "submitted"
    visit.visit_end_time = datetime.utcnow()
    visit.gps_end_lat = report_data.get("gps_end_lat")
    visit.gps_end_lng = report_data.get("gps_end_lng")
    visit.submitted_at = datetime.utcnow()

    # Update claim status
    claim_result = await db.execute(select(Claim).where(Claim.id == visit.claim_id))
    claim = claim_result.scalar_one_or_none()
    if claim:
        claim.status = "INSPECTOR_REPORT_RECEIVED"

    # Update inspector stats
    insp_result = await db.execute(select(FieldInspector).where(FieldInspector.id == inspector_id))
    inspector = insp_result.scalar_one_or_none()
    if inspector:
        inspector.completed_visits = (inspector.completed_visits or 0) + 1

    await db.commit()
    await db.refresh(report)

    # Notify admin
    if visit.assigned_by:
        await create_notification(
            db, str(visit.assigned_by), "INSPECTOR_REPORT_SUBMITTED",
            "Inspection report submitted",
            f"Inspector {inspector_id} has submitted a report for claim {visit.claim_id}. Recommendation: {report.inspector_recommendation}."
        )

    # Notify farmer
    if visit.farmer_id:
        await create_notification(
            db, str(visit.farmer_id), "FIELD_VISIT_COMPLETED",
            "Field inspection completed",
            f"Your claim {visit.claim_id} has been inspected. The report is under review."
        )

    return report, None


async def add_cce_plot(db: AsyncSession, visit_id: str, plot_data: dict):
    plot = CcePlot(
        id=uuid4(),
        visit_id=visit_id,
        plot_number=plot_data["plot_number"],
        gps_lat=plot_data.get("gps_lat"),
        gps_lng=plot_data.get("gps_lng"),
        plot_size_sqm=plot_data.get("plot_size_sqm"),
        crop_cut_weight_kg=plot_data.get("crop_cut_weight_kg"),
        moisture_pct=plot_data.get("moisture_pct"),
        estimated_yield_kg_per_ha=plot_data.get("estimated_yield_kg_per_ha"),
    )
    db.add(plot)
    await db.commit()
    await db.refresh(plot)
    return plot


async def get_inspector_dashboard(db: AsyncSession, inspector_id: str):
    # Stats
    total = await db.execute(
        select(func.count()).select_from(FieldVisit).where(FieldVisit.inspector_id == inspector_id)
    )
    total_count = total.scalar() or 0

    pending = await db.execute(
        select(func.count()).select_from(FieldVisit).where(
            and_(FieldVisit.inspector_id == inspector_id, FieldVisit.status == "assigned")
        )
    )
    pending_count = pending.scalar() or 0

    in_progress = await db.execute(
        select(func.count()).select_from(FieldVisit).where(
            and_(FieldVisit.inspector_id == inspector_id, FieldVisit.status == "in_progress")
        )
    )
    in_progress_count = in_progress.scalar() or 0

    acknowledged = await db.execute(
        select(func.count()).select_from(FieldVisit).where(
            and_(FieldVisit.inspector_id == inspector_id, FieldVisit.status == "acknowledged")
        )
    )
    ack_count = acknowledged.scalar() or 0

    submitted = await db.execute(
        select(func.count()).select_from(FieldVisit).where(
            and_(FieldVisit.inspector_id == inspector_id, FieldVisit.status == "submitted")
        )
    )
    submitted_count = submitted.scalar() or 0

    overdue = await get_overdue_visits(db, inspector_id)

    # Upcoming visits
    upcoming = await db.execute(
        select(FieldVisit).where(
            and_(
                FieldVisit.inspector_id == inspector_id,
                FieldVisit.status.in_(["assigned", "acknowledged"]),
            )
        ).order_by(FieldVisit.due_date.asc()).limit(5)
    )
    upcoming_visits = upcoming.scalars().all()

    # Recent submitted
    recent = await db.execute(
        select(FieldVisit).where(
            and_(FieldVisit.inspector_id == inspector_id, FieldVisit.status == "submitted")
        ).order_by(FieldVisit.submitted_at.desc()).limit(3)
    )
    recent_visits = recent.scalars().all()

    completion_rate = (submitted_count / total_count * 100) if total_count > 0 else 0

    return {
        "stats": {
            "total_assigned": total_count,
            "pending_acknowledgement": pending_count,
            "acknowledged": ack_count,
            "in_progress": in_progress_count,
            "submitted_this_month": submitted_count,
            "overdue": len(overdue),
            "completion_rate_pct": round(completion_rate, 1),
        },
        "upcoming_visits": upcoming_visits,
        "overdue_visits": overdue,
        "recent_submitted": recent_visits,
    }


async def assign_inspector_to_claim(db: AsyncSession, claim_id: str, admin_id: str, data: dict):
    claim_result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        return None, "Claim not found"

    due = data.get("due_date_override") or (date.today() + timedelta(days=7))
    visit = FieldVisit(
        id=uuid4(),
        claim_id=claim.id,
        farmer_id=claim.farmer_id,
        inspector_id=data["inspector_id"],
        assigned_by=admin_id,
        trigger_reason=data.get("trigger_reason", "manual"),
        fraud_score_at_assignment=claim.fraud_score,
        visit_type=data.get("visit_type", "inspection"),
        status="assigned",
        due_date=due,
    )
    db.add(visit)

    # Update claim status
    claim.status = "FIELD_VISIT_REQUIRED"

    # Update inspector total_visits
    insp_result = await db.execute(select(FieldInspector).where(FieldInspector.id == data["inspector_id"]))
    inspector = insp_result.scalar_one_or_none()
    if inspector:
        inspector.total_visits = (inspector.total_visits or 0) + 1

    await db.commit()
    await db.refresh(visit)

    # Notify inspector
    await create_notification(
        db, str(inspector.id), "INSPECTOR_ASSIGNED",
        "New field visit assigned",
        f"You have been assigned to visit claim {claim.id} (trigger: {visit.trigger_reason}). Due by {visit.due_date}."
    )

    return visit, None


async def list_inspectors(db: AsyncSession, state: str = None):
    query = select(FieldInspector)
    if state:
        query = query.where(FieldInspector.state == state)
    query = query.where(FieldInspector.is_active == True)
    result = await db.execute(query.order_by(FieldInspector.full_name))
    return result.scalars().all()


async def verify_report(db: AsyncSession, visit_id: str, verified: bool, admin_notes: str = None):
    result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        return None

    if verified:
        visit.status = "verified"
    else:
        visit.status = "submitted"  # return to inspector for correction

    # Update claim status if verified
    if verified:
        claim_result = await db.execute(select(Claim).where(Claim.id == visit.claim_id))
        claim = claim_result.scalar_one_or_none()
        if claim:
            claim.status = "INSPECTOR_REPORT_VERIFIED"

    await db.commit()
    await db.refresh(visit)

    # Notify inspector
    if visit.inspector_id:
        if verified:
            await create_notification(
                db, str(visit.inspector_id), "REPORT_VERIFIED",
                "Report verified by admin",
                f"Your report for claim {visit.claim_id} has been verified by the admin."
            )
        else:
            await create_notification(
                db, str(visit.inspector_id), "REPORT_RETURNED",
                "Report returned for correction",
                f"Your report for claim {visit.claim_id} has been returned for correction. Please review and resubmit."
            )

    return visit
