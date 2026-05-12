from sqlalchemy import Column, String, JSON, DateTime, UUID as SQLUUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class AuditTrail(Base):
    __tablename__ = "audit_trail"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    actor_id = Column(String(255))
    actor_role = Column(String(50))
    action = Column(String(100))
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(255), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)