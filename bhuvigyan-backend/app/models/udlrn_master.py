from sqlalchemy import Column, String, Numeric, DateTime, Integer, UUID as SQLUUID, ForeignKey
from app.database import Base
from datetime import datetime

class UdlrnMaster(Base):
    __tablename__ = "udlrn_master"
    udlrn = Column(String(50), primary_key=True)
    farmer_id = Column(SQLUUID(as_uuid=True), ForeignKey("farmers.id"))
    land_area_ha = Column(Numeric(10,2))
    declared_crop = Column(String(100))
    is_frozen = Column(String(10), default="false")
    carbon_score = Column(Integer, default=0)
    state_id = Column(SQLUUID(as_uuid=True), nullable=True)
    district_id = Column(SQLUUID(as_uuid=True), nullable=True)
    taluk_id = Column(SQLUUID(as_uuid=True), nullable=True)
    hobli_id = Column(SQLUUID(as_uuid=True), nullable=True)
    village_id = Column(SQLUUID(as_uuid=True), nullable=True)
    gps_lat = Column(Numeric(10,8), nullable=True)
    gps_lng = Column(Numeric(11,8), nullable=True)
    survey_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)