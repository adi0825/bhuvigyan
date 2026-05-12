from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
from uuid import uuid4


class FieldInspectionReport(Base):
    __tablename__ = "field_inspection_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    visit_id = Column(UUID(as_uuid=True), unique=True)
    claim_id = Column(UUID(as_uuid=True))

    # Crop Findings
    crop_found = Column(Boolean, nullable=False)
    crop_type_found = Column(String(100))
    crop_type_matches = Column(Boolean)
    crop_stage = Column(String(100))
    crop_condition = Column(String(50))  # healthy, mild_damage, moderate_damage, severe_damage, total_loss
    actual_loss_pct = Column(Numeric(5, 2), nullable=False)
    claimed_loss_pct = Column(Numeric(5, 2))
    discrepancy_pct = Column(Numeric(5, 2))

    # Land Findings
    land_found = Column(Boolean, nullable=False)
    land_area_observed = Column(Numeric(10, 4))
    land_area_claimed = Column(Numeric(10, 4))
    area_discrepancy = Column(Numeric(10, 4))

    # CCE Data
    cce_conducted = Column(Boolean, default=False)
    cce_plot_size_sqm = Column(Numeric(8, 2))
    cce_yield_kg = Column(Numeric(10, 3))
    cce_estimated_yield_per_ha = Column(Numeric(10, 3))
    threshold_yield = Column(Numeric(10, 3))
    cce_loss_pct = Column(Numeric(5, 2))

    # Weather Observations
    weather_at_visit = Column(String(100))
    visible_water_damage = Column(Boolean, default=False)
    visible_fire_damage = Column(Boolean, default=False)
    visible_pest_damage = Column(Boolean, default=False)
    visible_hail_damage = Column(Boolean, default=False)

    # Inspector Assessment
    inspector_recommendation = Column(String(50), nullable=False)  # approve, reject, partial_approve, further_investigation
    recommended_payout_pct = Column(Numeric(5, 2))
    notes = Column(Text)
    fraud_suspicion = Column(Boolean, default=False)
    fraud_suspicion_reason = Column(Text)

    # Photos
    photos = Column(JSON, default=list)
    video_url = Column(String(500))

    # Satellite Cross-check
    ndvi_at_visit = Column(Numeric(6, 4))
    ndvi_matches_finding = Column(Boolean)
    satellite_flag = Column(Boolean, default=False)

    submitted_at = Column(DateTime, default=datetime.utcnow)
