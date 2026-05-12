from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class CropMaster(Base):
    __tablename__ = "crop_masters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    growing_season = Column(String(50), nullable=True)
    typical_ndvi_range = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
