from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class VaoAlert(Base):
    __tablename__ = "vao_alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    vao_name = Column(String(255), nullable=False)
    vao_id = Column(String(100), nullable=True)
    district_id = Column(UUID(as_uuid=True), nullable=True)
    claim_id = Column(UUID(as_uuid=True), nullable=True)
    alert_type = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING")
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
