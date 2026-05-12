from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4
from datetime import datetime
from app.database import Base

class StateAdapter(Base):
    __tablename__ = "state_adapters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    state_code = Column(String(2), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    config_json = Column(JSONB, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
