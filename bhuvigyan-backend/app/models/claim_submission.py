from sqlalchemy import Column, String, Numeric, DateTime, Integer, JSON, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class ClaimSubmission(Base):
    __tablename__ = "claim_submissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(String(50), unique=True, nullable=False)
    udlrm = Column(String(50), nullable=False, index=True)
    farmer_name = Column(String(255), nullable=False)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    crop_type = Column(String(100), nullable=True)
    declared_loss = Column(Numeric(5, 2), nullable=True)  # % loss
    claim_amount = Column(Numeric(15, 2), nullable=True)  # ₹ amount
    csc_operator_id = Column(String(50), nullable=False)
    csc_operator_name = Column(String(255), nullable=True)
    filed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="PENDING")

    # Satellite snapshot at claim time
    ndvi_at_claim = Column(Numeric(5, 4), nullable=True)
    ndvi_at_sowing = Column(Numeric(5, 4), nullable=True)
    loss_map = Column(String(500), nullable=True)
    soil_moisture_at_claim = Column(Numeric(5, 2), nullable=True)

    # Fraud
    fraud_score = Column(Integer, default=0)
    fraud_verdict = Column(String(50), nullable=True)
    fraud_flags = Column(JSON, nullable=True)
    satellite_evidence_pdf = Column(String(500), nullable=True)

    # Claim details filled by CSC
    season = Column(String(50), nullable=True)
    cause_of_loss = Column(String(100), nullable=True)
    date_of_loss = Column(Date, nullable=True)
    csc_remarks = Column(Text, nullable=True)

    # Review
    officer_notes = Column(Text, nullable=True)
    insurer_decision = Column(String(50), nullable=True)
    insurer_decided_at = Column(DateTime, nullable=True)
    payout_amount = Column(Numeric(15, 2), nullable=True)
    payout_date = Column(DateTime, nullable=True)
    audit_trail = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
