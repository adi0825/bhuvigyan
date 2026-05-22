from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Date, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4
from datetime import datetime
from app.database import Base

class LandHolding(Base):
    __tablename__ = "land_holdings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    farmer_id = Column(String(36), nullable=False, index=True)
    label = Column(String(100), nullable=False)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    taluk = Column(String(100), nullable=True)
    village = Column(String(100), nullable=True)
    survey_number = Column(String(50), nullable=True)
    land_area_acres = Column(Numeric(10, 4), nullable=True)
    land_area_hectares = Column(Numeric(10, 4), nullable=True)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    declared_crop = Column(String(100), nullable=True)
    season = Column(String(50), nullable=True)
    sowing_date = Column(Date, nullable=True)
    has_multiple_crops = Column(Boolean, default=False)
    secondary_crop = Column(String(100), nullable=True)
    location_verified = Column(Boolean, default=False)
    location_mismatch_reason = Column(String(500), nullable=True)
    bhuvan_vid = Column(String(50), nullable=True)
    verification_status = Column(String(50), default="pending")
    verification_data = Column(JSONB, nullable=True)  # stores satellite verification results
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
