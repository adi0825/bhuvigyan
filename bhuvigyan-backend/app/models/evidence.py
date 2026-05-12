from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4
from datetime import datetime
from app.database import Base

class EvidenceItem(Base):
    __tablename__ = "evidence_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    evidence_type = Column(String(50), nullable=False)
    file_hash = Column(String(255), nullable=False)
    storage_url = Column(String(500), nullable=False)
    meta_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
