from sqlalchemy import Column, String, Numeric, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class FarmRegistration(Base):
    __tablename__ = "farm_registrations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("farmers.id"))
    survey_number = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    taluk = Column(String(100), nullable=False)
    hobli = Column(String(100))
    village = Column(String(100), nullable=False)
    land_area_ha = Column(Numeric(10, 4), nullable=False)
    ownership_type = Column(String(20), default="owner")  # owner/tenant/sharecropper
    kgis_verified = Column(Boolean, default=False)
    kgis_data = Column(String(1000))  # JSON string of KGIS response
    aadhaar_seeded = Column(Boolean, default=False)
    geo_centroid_lat = Column(Numeric(10, 7))
    geo_centroid_lng = Column(Numeric(10, 7))
    verification_status = Column(String(20), default="pending")
    admin_notes = Column(String(2000))
    registered_at = Column(DateTime, default=datetime.utcnow)
