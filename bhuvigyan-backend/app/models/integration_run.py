from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class IntegrationRun(Base):
    __tablename__ = "integration_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    integration_name = Column(String(100), nullable=False)
    endpoint = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False)
    request_hash = Column(String(255), nullable=True)
    response_hash = Column(String(255), nullable=True)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
