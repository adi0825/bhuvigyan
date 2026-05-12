from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class Payment(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"))
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("farmers.id"))
    payment_reference = Column(String(50), unique=True)
    amount = Column(Numeric(12, 2), nullable=False)
    bank_account_masked = Column(String(50))
    bank_ifsc = Column(String(20))
    status = Column(String(20), default="queued")  # queued/processing/settled/failed/reversed
    npci_transaction_id = Column(String(100))
    initiated_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime)
    failure_reason = Column(String(500))
    retry_count = Column(String(10), default="0")
    batch_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
