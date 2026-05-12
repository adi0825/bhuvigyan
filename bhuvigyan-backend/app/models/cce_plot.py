from sqlalchemy import Column, String, DateTime, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class CcePlot(Base):
    __tablename__ = "cce_plots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    visit_id = Column(UUID(as_uuid=True))
    plot_number = Column(Integer, nullable=False)
    gps_lat = Column(Numeric(10, 7))
    gps_lng = Column(Numeric(10, 7))
    plot_size_sqm = Column(Numeric(8, 2))
    crop_cut_weight_kg = Column(Numeric(10, 3))
    moisture_pct = Column(Numeric(5, 2))
    estimated_yield_kg_per_ha = Column(Numeric(10, 3))
    photo_url = Column(String(500))
    recorded_at = Column(DateTime, default=datetime.utcnow)
