from sqlalchemy import Column, String, Boolean, DateTime, Date, UUID as SQLUUID, ForeignKey, Integer
from app.database import Base
from datetime import date, datetime
from uuid import uuid4

class CscOperator(Base):
    __tablename__ = "csc_operators"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    csc_id = Column(String(50), unique=True)
    name = Column(String(255))
    mobile = Column(String(10))
    district_id = Column(SQLUUID(as_uuid=True), ForeignKey("location_districts.id"), nullable=True)
    is_blocked = Column(Boolean, default=False)
    block_reason = Column(String(255), nullable=True)
    password_hash = Column(String(255))
    daily_claim_count = Column(Integer, default=0)
    last_count_reset = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)