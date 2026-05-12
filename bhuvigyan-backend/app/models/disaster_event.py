from sqlalchemy import Column, String, DateTime, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class DisasterEvent(Base):
    __tablename__ = "disaster_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    event_name = Column(String(255), nullable=False)
    disaster_type = Column(String(50), nullable=False)
    affected_districts = Column(String(500), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    declared_by = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
