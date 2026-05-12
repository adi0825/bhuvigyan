from sqlalchemy import Column, String, Numeric, DateTime, Text, Boolean, UUID as SQLUUID, ForeignKey
from app.database import Base
from datetime import datetime
from uuid import uuid4

class Inspection(Base):
    __tablename__ = "inspections"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(SQLUUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)
    officer_id = Column(SQLUUID(as_uuid=True), ForeignKey("field_officers.id"), nullable=True)
    status = Column(String(50), default="ASSIGNED")
    actual_loss_pct = Column(Numeric(5,2), nullable=True)
    crop_condition = Column(String(100), nullable=True)
    weather_correlated = Column(Boolean, nullable=True)
    remarks = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
