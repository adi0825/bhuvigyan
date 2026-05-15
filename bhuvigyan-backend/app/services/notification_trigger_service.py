"""
Bhuvigyan V7 — Claim Status Notification Triggers
Sends SMS and in-app notifications when claim status changes.
"""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.claim import Claim
from app.models.farmer import Farmer
from app.models.notification import Notification

logger = logging.getLogger(__name__)


SMS_TEMPLATES = {
    "SUBMITTED": (
        "Bhuvigyan: Your claim {claim_number} has been submitted. "
        "We will notify you within 7 days."
    ),
    "AUTO_APPROVED": (
        "Bhuvigyan: Your claim {claim_number} has been APPROVED. "
        "Rs. {amount:,.0f} will be credited in 3-5 working days."
    ),
    "APPROVED": (
        "Bhuvigyan: Your claim {claim_number} has been APPROVED. "
        "Rs. {amount:,.0f} will be credited in 3-5 working days."
    ),
    "AUTO_REJECTED": (
        "Bhuvigyan: Your claim {claim_number} could not be approved. "
        "Download your claim report from the portal for details."
    ),
    "REJECTED": (
        "Bhuvigyan: Your claim {claim_number} has been rejected. "
        "Download your claim report from the portal for details."
    ),
    "OFFICER_REVIEW": (
        "Bhuvigyan: Your claim {claim_number} is under review. "
        "An officer will assess your claim and notify you."
    ),
    "CCE_VISIT": (
        "Bhuvigyan: Your claim {claim_number} requires a field visit. "
        "An inspector will visit your farm. Please be available."
    ),
    "FIELD_VISIT_REQUIRED": (
        "Bhuvigyan: An inspector will visit your farm for claim {claim_number}. "
        "Please be available on the scheduled date."
    ),
}


async def trigger_claim_notification(
    claim_id: str,
    new_status: str,
    db: AsyncSession,
    approved_amount: Optional[float] = None,
) -> bool:
    """
    Trigger SMS + in-app notification when a claim changes status.
    Returns True if notification was created.
    """
    from uuid import UUID, uuid4

    cid = UUID(claim_id)
    claim_result = await db.execute(select(Claim).where(Claim.id == cid))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        logger.warning(f"Claim {claim_id} not found for notification")
        return False

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer or not farmer.mobile:
        logger.warning(f"Farmer or mobile not found for claim {claim_id}")
        return False

    template = SMS_TEMPLATES.get(new_status)
    if not template:
        logger.debug(f"No SMS template for status {new_status}")
        return False

    amount = approved_amount or float(claim.claim_amount_requested or 0)
    message = template.format(
        claim_number=claim.claim_number,
        amount=amount,
    )

    # Create in-app notification
    notification = Notification(
        id=uuid4(),
        farmer_id=claim.farmer_id,
        title=f"Claim {claim.claim_number} — {new_status.replace('_', ' ').title()}",
        message=message,
        channel="SMS",
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)

    # TODO: Integrate with actual SMS provider (Twilio/Fast2SMS)
    # For now, log the SMS that would be sent
    logger.info(f"[SMS] To {farmer.mobile}: {message}")

    await db.commit()
    return True


async def trigger_farmer_registration_notification(
    farmer_id: str,
    status: str,
    db: AsyncSession,
) -> bool:
    """Send SMS when farmer registration is approved or rejected."""
    from uuid import UUID, uuid4

    fid = UUID(farmer_id)
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == fid))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer or not farmer.mobile:
        return False

    if status == "AUTO_APPROVED":
        message = "Bhuvigyan: Your farmer registration is APPROVED. You can now file PMFBY claims."
    elif status == "PENDING_ADMIN_REVIEW":
        message = "Bhuvigyan: Your registration is submitted and under review. We will notify you within 48 hours."
    elif status == "REJECTED":
        message = "Bhuvigyan: Your registration needs review. Please contact your nearest CSC operator."
    else:
        return False

    notification = Notification(
        id=uuid4(),
        farmer_id=fid,
        title=f"Registration {status.replace('_', ' ').title()}",
        message=message,
        channel="SMS",
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    logger.info(f"[SMS] To {farmer.mobile}: {message}")
    await db.commit()
    return True
