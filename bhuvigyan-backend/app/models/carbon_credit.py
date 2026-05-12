from sqlalchemy import Column, String, Numeric, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class CarbonCredit(Base):
    __tablename__ = "carbon_credits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("farmers.id"))
    season = Column(String(20))  # kharif, rabi, summer
    year = Column(Integer)
    credits_earned = Column(Numeric(10, 4))
    value_inr = Column(Numeric(12, 2))
    certification = Column(String(50))  # VERRA / Gold Standard / pending
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
