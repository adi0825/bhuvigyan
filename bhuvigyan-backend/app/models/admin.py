from sqlalchemy import Column, String, Boolean, DateTime, UUID as SQLUUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class AdminOfficer(Base):
    __tablename__ = "admin_officers"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True)
    full_name = Column(String(255))
    role = Column(String(50))
    password_hash = Column(String(255))
    totp_secret = Column(String(100), default="BHUVIGYAN2026")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)