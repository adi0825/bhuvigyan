from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class ClaimDocument(Base):
    __tablename__ = "claim_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(255), nullable=False)
    storage_url = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    gps_latitude = Column(String(20), nullable=True)
    gps_longitude = Column(String(20), nullable=True)
    exif_timestamp = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
