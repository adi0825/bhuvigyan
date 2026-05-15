from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    alert_id = Column(String(50), unique=True, nullable=False)
    udlrm = Column(String(50), nullable=False, index=True)
    claim_id = Column(String(50), nullable=True, index=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)  # LOW | MEDIUM | HIGH | CRITICAL
    description = Column(Text, nullable=True)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    status = Column(String(20), default="OPEN")  # OPEN | RESOLVED | ESCALATED
    csc_operator_id = Column(String(50), nullable=True)
    insurer_id = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
