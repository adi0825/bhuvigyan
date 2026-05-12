from sqlalchemy import Column, String, Numeric, DateTime, Integer, JSON, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class Claim(Base):
    __tablename__ = "claims"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_number = Column(String(50), unique=True)
    udlrn = Column(String(50))
    farmer_id = Column(UUID(as_uuid=True))
    insurer_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(50), default="PENDING")
    fraud_score = Column(Integer, default=0)
    fraud_verdict = Column(String(50), nullable=True)
    declared_crop = Column(String(100))
    claimed_area_ha = Column(Numeric(10,2))
    damage_percent = Column(Numeric(5,2), nullable=True)
    damage_cause = Column(String(100), nullable=True)
    season = Column(String(50))
    year = Column(Integer)
    ndvi_at_claim = Column(Numeric(5,4), nullable=True)
    satellite_data = Column(JSON, nullable=True)
    fraud_signals = Column(JSON, nullable=True)
    fraud_features = Column(JSON, nullable=True)
    policy_id = Column(UUID(as_uuid=True), nullable=True)
    loss_type = Column(String(50), nullable=True)
    loss_date = Column(Date, nullable=True)
    affected_area = Column(Numeric(10,2), nullable=True)
    claim_amount_requested = Column(Numeric(15,2), nullable=True)
    description = Column(Text, nullable=True)
    gps_latitude = Column(Numeric(10,6), nullable=True)
    gps_longitude = Column(Numeric(10,6), nullable=True)
    fraud_flags = Column(JSON, nullable=True)
    officer_id = Column(UUID(as_uuid=True), nullable=True)
    reviewer_id = Column(UUID(as_uuid=True), nullable=True)
    approved_amount = Column(Numeric(15,2), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    review_notes = Column(Text, nullable=True)
    filed_at = Column(DateTime, nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)