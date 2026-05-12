from sqlalchemy import Column, String, Boolean, DateTime, Integer, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class FieldVisit(Base):
    __tablename__ = "field_visits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True))
    farmer_id = Column(UUID(as_uuid=True))
    inspector_id = Column(UUID(as_uuid=True))
    assigned_by = Column(UUID(as_uuid=True))
    trigger_reason = Column(String(100), nullable=False)
    fraud_score_at_assignment = Column(Numeric(5, 2))
    visit_type = Column(String(50), nullable=False)  # inspection, cce_visit, fraud_investigation
    status = Column(String(50), default="assigned")  # assigned, acknowledged, in_progress, submitted, verified
    due_date = Column(Date, nullable=False)
    scheduled_date = Column(Date)
    visit_start_time = Column(DateTime)
    visit_end_time = Column(DateTime)
    gps_start_lat = Column(Numeric(10, 7))
    gps_start_lng = Column(Numeric(10, 7))
    gps_end_lat = Column(Numeric(10, 7))
    gps_end_lng = Column(Numeric(10, 7))
    distance_from_farm_m = Column(Integer)
    gps_verified = Column(Boolean, default=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime)
    submitted_at = Column(DateTime)
