from sqlalchemy import Column, String, Numeric, DateTime, Boolean, Integer, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class SatelliteReport(Base):
    __tablename__ = "satellite_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("farmers.id"))
    claim_id = Column(UUID(as_uuid=True), nullable=True)
    ndvi_value = Column(Numeric(6, 4))
    ndvi_label = Column(String(20))
    ndvi_source = Column(String(100), default="Sentinel-2 SR Harmonized")
    flood_detected = Column(Boolean, default=False)
    flood_area_sqm = Column(Numeric(12, 2))
    fire_detected = Column(Boolean, default=False)
    fire_hotspots = Column(Integer, default=0)
    imd_condition = Column(String(50))
    imd_rainfall_mm = Column(Numeric(8, 2))
    last_scan_date = Column(Date)
    cloud_cover_pct = Column(Numeric(5, 2))
    is_live = Column(Boolean, default=True)
    gee_job_id = Column(String(100))
    raw_response = Column(String(4000))  # JSON string
    computed_at = Column(DateTime, default=datetime.utcnow)
