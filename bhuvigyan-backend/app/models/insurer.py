from sqlalchemy import Column, String, Boolean, DateTime, UUID as SQLUUID
from app.database import Base
from datetime import datetime
from uuid import uuid4

class Insurer(Base):
    __tablename__ = "insurers"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    company_name = Column(String(255))
    email = Column(String(255), unique=True)
    password_hash = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)