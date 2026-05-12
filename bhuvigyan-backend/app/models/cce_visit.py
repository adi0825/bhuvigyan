from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, JSON, UUID as SQLUUID, ForeignKey, Integer
from app.database import Base
from datetime import datetime
from uuid import uuid4

class CceVisit(Base):
    __tablename__ = "cce_visits"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    visit_number = Column(String(50), unique=True)
    claim_id = Column(SQLUUID(as_uuid=True), ForeignKey("claims.id"))
    farmer_id = Column(SQLUUID(as_uuid=True), ForeignKey("farmers.id"))
    udlrn = Column(String(50))
    assigned_to = Column(SQLUUID(as_uuid=True), ForeignKey("field_officers.id"))
    assigned_by = Column(SQLUUID(as_uuid=True), ForeignKey("admin_officers.id"))
    status = Column(String(50), default="ASSIGNED")
    scheduled_date = Column(Date)
    visit_date = Column(DateTime, nullable=True)
    gps_lat = Column(Numeric(10,8), nullable=True)
    gps_lng = Column(Numeric(11,8), nullable=True)
    land_gps_lat = Column(Numeric(10,8), nullable=True)
    land_gps_lng = Column(Numeric(11,8), nullable=True)
    gps_match = Column(String(10), nullable=True)
    gps_distance_m = Column(Integer, nullable=True)
    crop_found = Column(String(100), nullable=True)
    crop_match = Column(String(10), nullable=True)
    yield_estimate = Column(Numeric(10,2), nullable=True)
    damage_percent = Column(Numeric(5,2), nullable=True)
    damage_cause = Column(String(100), nullable=True)
    area_visited_ha = Column(Numeric(10,2), nullable=True)
    farmer_present = Column(String(10), nullable=True)
    remarks = Column(Text, nullable=True)
    recommendation = Column(String(50), nullable=True)
    checklist = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)