from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    mobile = Column(String(10), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    aadhaar = Column(String(12), nullable=True)
    father_name = Column(String(255), nullable=True)
    gender = Column(String(10), nullable=True)
    dob = Column(Date, nullable=True)
    address = Column(String(500), nullable=True)
    village = Column(String(100), nullable=True)
    taluk = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state_code = Column(String(10), nullable=True)
    pincode = Column(String(10), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    bank_account = Column(String(20), nullable=True)
    land_area = Column(Numeric(10,2), nullable=True)
    land_unit = Column(String(20), nullable=True)
    crop_name = Column(String(100), nullable=True)
    latitude = Column(Numeric(10,8), nullable=True)
    longitude = Column(Numeric(11,8), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    is_blacklisted = Column(Boolean, default=False)
    carbon_eligible = Column(Boolean, default=False)
    carbon_enrolled = Column(Boolean, default=False)
    carbon_practice = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)