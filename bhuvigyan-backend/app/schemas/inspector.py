from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


# ── Field Inspector ──
class FieldInspectorCreate(BaseModel):
    full_name: str
    employee_id: str
    mobile: str
    department: Optional[str] = None
    badge_number: Optional[str] = None
    districts_assigned: List[str] = []
    state: str


class FieldInspectorUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    badge_number: Optional[str] = None
    districts_assigned: Optional[List[str]] = None
    is_active: Optional[bool] = None


class FieldInspectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    employee_id: str
    mobile: str
    department: Optional[str] = None
    badge_number: Optional[str] = None
    districts_assigned: List = []
    state: str
    is_active: bool
    total_visits: int
    completed_visits: int
    created_at: datetime


# ── Field Visit ──
class FieldVisitAssign(BaseModel):
    inspector_id: UUID
    visit_type: str  # inspection, cce_visit, fraud_investigation
    due_date_override: Optional[date] = None


class FieldVisitAcknowledge(BaseModel):
    scheduled_date: date


class FieldVisitStart(BaseModel):
    gps_lat: Decimal
    gps_lng: Decimal


class FieldVisitAbandon(BaseModel):
    reason: str


class FieldVisitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    claim_id: UUID
    farmer_id: UUID
    inspector_id: UUID
    assigned_by: Optional[UUID] = None
    trigger_reason: str
    fraud_score_at_assignment: Optional[Decimal] = None
    visit_type: str
    status: str
    due_date: date
    scheduled_date: Optional[date] = None
    visit_start_time: Optional[datetime] = None
    visit_end_time: Optional[datetime] = None
    gps_verified: Optional[bool] = None
    distance_from_farm_m: Optional[int] = None
    assigned_at: datetime
    acknowledged_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None


# ── Field Inspection Report ──
class FieldInspectionReportCreate(BaseModel):
    crop_found: bool
    crop_type_found: Optional[str] = None
    crop_type_matches: Optional[bool] = None
    crop_stage: Optional[str] = None
    crop_condition: str
    actual_loss_pct: Decimal
    claimed_loss_pct: Optional[Decimal] = None
    land_found: bool
    land_area_observed: Optional[Decimal] = None
    land_area_claimed: Optional[Decimal] = None
    weather_at_visit: Optional[str] = None
    visible_water_damage: bool = False
    visible_fire_damage: bool = False
    visible_pest_damage: bool = False
    visible_hail_damage: bool = False
    cce_conducted: bool = False
    cce_plot_size_sqm: Optional[Decimal] = None
    cce_yield_kg: Optional[Decimal] = None
    cce_estimated_yield_per_ha: Optional[Decimal] = None
    threshold_yield: Optional[Decimal] = None
    cce_loss_pct: Optional[Decimal] = None
    inspector_recommendation: str
    recommended_payout_pct: Optional[Decimal] = None
    notes: Optional[str] = None
    fraud_suspicion: bool = False
    fraud_suspicion_reason: Optional[str] = None
    gps_end_lat: Optional[Decimal] = None
    gps_end_lng: Optional[Decimal] = None


class FieldInspectionReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    visit_id: UUID
    claim_id: Optional[UUID] = None
    crop_found: bool
    crop_type_found: Optional[str] = None
    crop_type_matches: Optional[bool] = None
    crop_stage: Optional[str] = None
    crop_condition: Optional[str] = None
    actual_loss_pct: Decimal
    claimed_loss_pct: Optional[Decimal] = None
    discrepancy_pct: Optional[Decimal] = None
    land_found: bool
    land_area_observed: Optional[Decimal] = None
    land_area_claimed: Optional[Decimal] = None
    area_discrepancy: Optional[Decimal] = None
    cce_conducted: Optional[bool] = None
    inspector_recommendation: str
    recommended_payout_pct: Optional[Decimal] = None
    notes: Optional[str] = None
    fraud_suspicion: Optional[bool] = None
    fraud_suspicion_reason: Optional[str] = None
    photos: List = []
    ndvi_at_visit: Optional[Decimal] = None
    ndvi_matches_finding: Optional[bool] = None
    satellite_flag: Optional[bool] = None
    submitted_at: datetime


# ── CCE Plot ──
class CcePlotCreate(BaseModel):
    plot_number: int
    gps_lat: Optional[Decimal] = None
    gps_lng: Optional[Decimal] = None
    plot_size_sqm: Optional[Decimal] = None
    crop_cut_weight_kg: Optional[Decimal] = None
    moisture_pct: Optional[Decimal] = None
    estimated_yield_kg_per_ha: Optional[Decimal] = None


class CcePlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    visit_id: UUID
    plot_number: int
    gps_lat: Optional[Decimal] = None
    gps_lng: Optional[Decimal] = None
    plot_size_sqm: Optional[Decimal] = None
    crop_cut_weight_kg: Optional[Decimal] = None
    moisture_pct: Optional[Decimal] = None
    estimated_yield_kg_per_ha: Optional[Decimal] = None
    photo_url: Optional[str] = None
    recorded_at: datetime


# ── Report Verification (Admin) ──
class ReportVerify(BaseModel):
    verified: bool
    admin_notes: Optional[str] = None
