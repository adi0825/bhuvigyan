from sqlalchemy import Column, String, Numeric, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class InsuranceApplication(Base):
    __tablename__ = "insurance_applications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    application_id = Column(String(50), unique=True, nullable=False)
    udlrn = Column(String(50), nullable=False, index=True)
    farmer_name = Column(String(255), nullable=False)
    farmer_id = Column(UUID(as_uuid=True), nullable=True)
    selected_plan_id = Column(String(50), nullable=False)
    plan_name = Column(String(255), nullable=True)
    crop_type = Column(String(100), nullable=True)
    premium = Column(Numeric(12, 2), nullable=True)
    sum_insured = Column(Numeric(12, 2), nullable=True)
    land_area_ha = Column(Numeric(10, 2), nullable=True)
    policy_status = Column(String(50), default="PENDING")
    insurer_remarks = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    insurer_id = Column(UUID(as_uuid=True), nullable=True)
    insurer_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
