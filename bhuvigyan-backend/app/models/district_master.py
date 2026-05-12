from sqlalchemy import Column, String, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class DistrictMaster(Base):
    __tablename__ = "district_masters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    state_code = Column(String(2), nullable=False)
    district_code = Column(String(10), nullable=False)
    name = Column(String(255), nullable=False)
    centroid_lat = Column(Numeric(10, 6), nullable=True)
    centroid_lng = Column(Numeric(10, 6), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
