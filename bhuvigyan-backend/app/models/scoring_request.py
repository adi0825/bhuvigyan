from sqlalchemy import Column, String, Numeric, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class ScoringRequest(Base):
    __tablename__ = "scoring_requests"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True), nullable=False)
    model_id = Column(UUID(as_uuid=True), nullable=True)
    latency_ms = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False)
    fallback_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScoringResult(Base):
    __tablename__ = "scoring_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    scoring_request_id = Column(UUID(as_uuid=True), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    confidence = Column(Numeric(3, 2), nullable=True)
    risk_level = Column(String(20), nullable=True)
    is_shadow = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
