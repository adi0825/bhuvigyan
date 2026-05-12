from sqlalchemy import Column, String, Boolean, DateTime, UUID as SQLUUID, ForeignKey
from app.database import Base
from datetime import datetime
from uuid import uuid4

class FieldOfficer(Base):
    __tablename__ = "field_officers"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True)
    full_name = Column(String(255))
    mobile = Column(String(10))
    role = Column(String(50))
    district_id = Column(SQLUUID(as_uuid=True), ForeignKey("location_districts.id"), nullable=True)
    taluk_id = Column(SQLUUID(as_uuid=True), ForeignKey("location_taluks.id"), nullable=True)
    employee_id = Column(String(50), unique=True)
    designation = Column(String(100))
    is_active = Column(Boolean, default=True)
    password_hash = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)