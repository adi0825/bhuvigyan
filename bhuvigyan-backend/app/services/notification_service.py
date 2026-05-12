from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    channel: str = "IN_APP",
) -> Notification:
    notif = Notification(
        farmer_id=UUID(user_id) if isinstance(user_id, str) else user_id,
        title=title,
        message=message,
        channel=channel,
        is_read=False,
    )
    db.add(notif)
    await db.flush()
    return notif


async def get_user_notifications(
    db: AsyncSession,
    user_id: str,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.farmer_id == UUID(user_id))
        .order_by(Notification.created_at.desc())
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    result = await db.execute(stmt.limit(limit).offset(offset))
    return result.scalars().all()


async def mark_read(db: AsyncSession, notif_id: str, user_id: str) -> bool:
    from datetime import datetime
    result = await db.execute(
        select(Notification)
        .where(Notification.id == UUID(notif_id), Notification.farmer_id == UUID(user_id))
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        notif.read_at = datetime.utcnow()
        await db.flush()
        return True
    return False


async def mark_all_read(db: AsyncSession, user_id: str) -> int:
    from datetime import datetime
    result = await db.execute(
        select(Notification)
        .where(Notification.farmer_id == UUID(user_id), Notification.is_read == False)
    )
    notifs = result.scalars().all()
    for n in notifs:
        n.is_read = True
        n.read_at = datetime.utcnow()
    await db.flush()
    return len(notifs)


async def get_unread_count(db: AsyncSession, user_id: str) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.farmer_id == UUID(user_id), Notification.is_read == False)
    )
    return result.scalar() or 0