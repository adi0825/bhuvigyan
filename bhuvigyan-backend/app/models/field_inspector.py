from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class FieldInspector(Base):
    __tablename__ = "field_inspectors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    full_name = Column(String(255), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False)
    mobile = Column(String(10), unique=True, nullable=False)
    department = Column(String(100))
    badge_number = Column(String(50))
    districts_assigned = Column(JSON, default=list)
    state = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    total_visits = Column(Integer, default=0)
    completed_visits = Column(Integer, default=0)
    password_hash = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
