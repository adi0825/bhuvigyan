from sqlalchemy import Column, String, Numeric, JSON, DateTime, UUID as SQLUUID, ForeignKey, Integer
from app.database import Base
from datetime import datetime
from uuid import uuid4

class FirAlert(Base):
    __tablename__ = "fir_alerts"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(SQLUUID(as_uuid=True), ForeignKey("claims.id"))
    farmer_id = Column(SQLUUID(as_uuid=True), ForeignKey("farmers.id"))
    fir_number = Column(String(50), nullable=True)
    fraud_score = Column(Integer)
    status = Column(String(50), default="PENDING")
    confirmed_by = Column(SQLUUID(as_uuid=True), ForeignKey("admin_officers.id"), nullable=True)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Settlement(Base):
    __tablename__ = "settlements"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(SQLUUID(as_uuid=True), ForeignKey("claims.id"))
    insurer_id = Column(SQLUUID(as_uuid=True), ForeignKey("insurers.id"))
    amount = Column(Numeric(10,2))
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)