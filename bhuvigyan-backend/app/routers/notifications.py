from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.services.notification_service import (
    get_user_notifications, mark_read, mark_all_read, get_unread_count
)
from typing import List

router = APIRouter()

@router.get("/notifications")
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    notifs = await get_user_notifications(db, user["userId"], unread_only, limit, offset)
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "message": n.message,
                    "channel": n.channel,
                    "isRead": n.is_read,
                    "readAt": n.read_at.isoformat() if n.read_at else None,
                    "createdAt": n.created_at.isoformat(),
                }
                for n in notifs
            ],
            "total": len(notifs),
        }
    }

@router.get("/notifications/unread-count")
async def unread_count(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    count = await get_unread_count(db, user["userId"])
    return {"success": True, "data": {"count": count}}

@router.put("/notifications/{notif_id}/read")
async def read_notification(notif_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    ok = await mark_read(db, notif_id, user["userId"])
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "data": {"read": True}}

@router.put("/notifications/mark-all-read")
async def read_all(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    count = await mark_all_read(db, user["userId"])
    return {"success": True, "data": {"markedRead": count}}
