from sqlalchemy import Column, String, Numeric, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class Policy(Base):
    __tablename__ = "policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    policy_number = Column(String(100), unique=True, nullable=False)
    insurer_id = Column(UUID(as_uuid=True), nullable=False)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    crop = Column(String(100), nullable=False)
    insured_area = Column(Numeric(10, 2), nullable=False)
    sum_insured = Column(Numeric(15, 2), nullable=False)
    premium_paid = Column(Numeric(15, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
