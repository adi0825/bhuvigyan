from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.dependencies import require_admin_role
from app.services.audit_service import search_audit_logs
from app.models.audit_trail import AuditTrail

router = APIRouter()

@router.get("/audit")
async def get_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    logs = await search_audit_logs(
        db, user_id=user_id, action=action, target_type=resource_type,
        from_date=from_date, to_date=to_date, limit=limit, offset=offset
    )
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": str(l.id),
                    "actorId": str(l.actor_id) if l.actor_id else None,
                    "actorType": l.actor_type,
                    "action": l.action,
                    "targetId": str(l.target_id) if l.target_id else None,
                    "targetType": l.target_type,
                    "ipAddress": str(l.ip_address) if l.ip_address else None,
                    "details": l.details,
                    "createdAt": l.created_at.isoformat(),
                }
                for l in logs
            ],
            "limit": limit,
            "offset": offset,
        }
    }