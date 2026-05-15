from sqlalchemy import Column, String, Numeric, DateTime, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4
from datetime import datetime
from app.database import Base

class WeatherCache(Base):
    __tablename__ = "weather_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    lat = Column(Numeric(10, 6), nullable=False)
    lng = Column(Numeric(10, 6), nullable=False)
    date = Column(Date, nullable=False)
    temperature = Column(Numeric(5, 2), nullable=True)
    rainfall_mm = Column(Numeric(10, 2), nullable=True)
    humidity = Column(Numeric(5, 2), nullable=True)
    wind_speed = Column(Numeric(5, 2), nullable=True)
    source = Column(String(50), nullable=True)
    cached_at = Column(DateTime, default=datetime.utcnow)

class SatelliteCache(Base):
    __tablename__ = "satellite_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    lat = Column(Numeric(10, 6), nullable=False)
    lng = Column(Numeric(10, 6), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    ndvi_values = Column(JSONB, nullable=True)
    mean_ndvi = Column(Numeric(5, 4), nullable=True)
    min_ndvi = Column(Numeric(5, 4), nullable=True)
    cloud_cover_pct = Column(Numeric(5, 2), nullable=True)
    anomaly_detected = Column(Boolean, default=False)
    is_mock = Column(Boolean, default=False)
    cached_at = Column(DateTime, default=datetime.utcnow)
