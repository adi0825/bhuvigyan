"""
Bhuvigyan V7 — Async Notification Tasks (SMS, Email, Push)
"""
from app.celery_app import celery_app
from app.database import sync_engine
from sqlalchemy.orm import sessionmaker
from uuid import UUID

SessionLocal = sessionmaker(bind=sync_engine)


@celery_app.task(name="notifications.send_email")
def send_email_task(to_email: str, subject: str, body: str):
    """Send email notification."""
    # Production: integrate with SMTP / AWS SES / SendGrid
    print(f"[EMAIL] To: {to_email} | Subject: {subject}")
    return {"success": True, "channel": "EMAIL", "to": to_email}


@celery_app.task(name="notifications.send_sms")
def send_sms_task(mobile: str, message: str):
    """Send SMS notification."""
    # Production: integrate with Twilio / Exotel / MSG91
    print(f"[SMS] To: {mobile} | Message: {message[:50]}...")
    return {"success": True, "channel": "SMS", "to": mobile}


@celery_app.task(name="notifications.push_in_app")
def push_in_app_notification_task(user_id: str, notif_type: str, title: str, message: str):
    """Create in-app notification."""
    from app.services.notification_service import create_notification
    import asyncio

    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        notif = loop.run_until_complete(
            create_notification(db, user_id, notif_type, title, message, "IN_APP")
        )
        loop.close()
        return {"success": True, "channel": "IN_APP", "notification_id": str(notif.id)}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
    finally:
        db.close()


@celery_app.task(name="notifications.dispatch_claim_status")
def dispatch_claim_status_notification(claim_id: str, farmer_id: str, new_status: str):
    """Dispatch multi-channel notification for claim status change."""
    from sqlalchemy import select
    from app.models.farmer import Farmer
    import asyncio

    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        result = loop.run_until_complete(db.execute(select(Farmer).where(Farmer.id == UUID(farmer_id))))
        farmer = result.scalar_one_or_none()
        loop.close()

        title = f"Claim {new_status.replace('_', ' ').title()}"
        message = f"Your claim {claim_id} has been {new_status.lower()}."

        # In-app (guaranteed)
        push_in_app_notification_task.delay(farmer_id, f"CLAIM_{new_status}", title, message)

        # SMS (if mobile available)
        if farmer and farmer.mobile:
            send_sms_task.delay(farmer.mobile, message)

        return {"success": True, "channels": ["IN_APP", "SMS"], "claim_id": claim_id}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
    finally:
        db.close()
