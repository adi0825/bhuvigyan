from sqlalchemy import Column, String, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class InsurancePayout(Base):
    __tablename__ = "insurance_payouts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    payout_id = Column(String(50), unique=True, nullable=False)
    claim_id = Column(String(50), nullable=False, index=True)
    udlrm = Column(String(50), nullable=False, index=True)
    farmer_name = Column(String(255), nullable=True)
    approved_amount = Column(Numeric(15, 2), nullable=False)
    bank_account = Column(String(50), nullable=True)
    ifsc = Column(String(20), nullable=True)
    payout_date = Column(DateTime, nullable=True)
    payout_status = Column(String(50), default="INITIATED")  # INITIATED | PROCESSED | FAILED
    insurer_name = Column(String(255), nullable=True)
    approved_by = Column(String(255), nullable=True)
    officer_notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
