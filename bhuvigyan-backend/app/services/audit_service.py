"""
Bhuvigyan V7 — Audit Logging Service
Append-only audit trail for every state-changing operation.
"""
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.audit_trail import AuditTrail


async def log_event(
    db: AsyncSession,
    action: str,
    actor_id: Optional[str] = None,
    actor_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditTrail:
    """Create an immutable audit log entry."""
    entry = AuditTrail(
        id=uuid4(),
        actor_id=UUID(actor_id) if actor_id else None,
        actor_type=actor_type,
        action=action,
        target_id=UUID(target_id) if target_id else None,
        target_type=target_type,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    await db.flush()
    return entry


async def search_audit_logs(
    db: AsyncSession,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
):
    stmt = select(AuditTrail).order_by(AuditTrail.created_at.desc())
    if user_id:
        stmt = stmt.where(AuditTrail.actor_id == UUID(user_id))
    if action:
        stmt = stmt.where(AuditTrail.action == action)
    if target_type:
        stmt = stmt.where(AuditTrail.target_type == target_type)
    if from_date:
        stmt = stmt.where(AuditTrail.created_at >= from_date)
    if to_date:
        stmt = stmt.where(AuditTrail.created_at <= to_date)

    result = await db.execute(stmt.limit(limit).offset(offset))
    return result.scalars().all()
