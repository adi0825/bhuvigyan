from sqlalchemy import Column, String, Numeric, DateTime, Integer, Text, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class ActivePolicy(Base):
    __tablename__ = "active_policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    policy_number = Column(String(50), unique=True, nullable=False)
    udlrn = Column(String(50), nullable=False, index=True)
    farmer_name = Column(String(255), nullable=True)
    farmer_id = Column(UUID(as_uuid=True), nullable=True)
    plan_id = Column(String(50), nullable=False)
    plan_name = Column(String(255), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    coverage_amount = Column(Numeric(12, 2), nullable=True)
    premium_paid = Column(Numeric(12, 2), nullable=True)
    policy_status = Column(String(50), default="ACTIVE")
    insurer_id = Column(UUID(as_uuid=True), nullable=True)
    insurer_name = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_reason = Column(Text, nullable=True)
    application_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
