from sqlalchemy import Column, String, Numeric, DateTime, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class InsurancePlan(Base):
    __tablename__ = "insurance_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    plan_id = Column(String(50), unique=True, nullable=False)
    plan_name = Column(String(255), nullable=False)
    crop_type = Column(String(100), nullable=True)
    premium = Column(Numeric(12, 2), nullable=False)
    sum_insured = Column(Numeric(12, 2), nullable=False)
    duration_months = Column(Integer, default=12)
    waiting_period_days = Column(Integer, default=15)
    claim_conditions = Column(Text, nullable=True)
    eligibility_rules = Column(Text, nullable=True)
    coverage_type = Column(String(100), nullable=True)
    eligible_crops = Column(JSON, nullable=True)
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
