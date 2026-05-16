from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from uuid import uuid4, UUID
from app.database import get_db
from app.dependencies import get_current_farmer
from app.models.insurance_plan import InsurancePlan
from app.models.insurance_application import InsuranceApplication
from app.models.active_policy import ActivePolicy
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster

router = APIRouter()

class PolicyApplyRequest(BaseModel):
    planId: str
    cropType: str = ""
    landAreaHa: float = 0.0

class ClaimCreateRequest(BaseModel):
    policyNumber: str
    lossDate: str
    causeOfLoss: str
    lossPercentage: float
    claimAmount: float
    notes: str = ""

async def _seed_plans_if_needed(db: AsyncSession):
    result = await db.execute(select(func.count(InsurancePlan.id)))
    count = result.scalar()
    if count and count > 0:
        return
    plans = [
        InsurancePlan(plan_id="PLAN-BCC-001", plan_name="Basic Crop Cover", crop_type="All Kharif Crops", premium=850.00, sum_insured=25000.00, duration_months=6, waiting_period_days=15, claim_conditions="Damage due to natural calamities only. Min 30% crop loss.", eligibility_rules="Land verified, UDLRN active, Kharif season", coverage_type="Weather Index", eligible_crops=["Rice", "Maize", "Soybean", "Groundnut"]),
        InsurancePlan(plan_id="PLAN-SCP-002", plan_name="Standard Crop Protection", crop_type="All Rabi Crops", premium=1200.00, sum_insured=40000.00, duration_months=6, waiting_period_days=15, claim_conditions="Covers pest, disease, and weather damage. Min 25% loss.", eligibility_rules="Land verified, UDLRN active, Rabi season", coverage_type="Comprehensive", eligible_crops=["Wheat", "Barley", "Mustard", "Gram"]),
        InsurancePlan(plan_id="PLAN-PYS-003", plan_name="Premium Yield Shield", crop_type="High-Value Crops", premium=2500.00, sum_insured=75000.00, duration_months=12, waiting_period_days=30, claim_conditions="Yield shortfall below 80% of benchmark. Covers all perils.", eligibility_rules="Land verified, UDLRN active, >1 Ha land", coverage_type="Yield Index", eligible_crops=["Cotton", "Sugarcane", "Tobacco", "Potato"]),
        InsurancePlan(plan_id="PLAN-DFC-004", plan_name="Disaster Flood Cover", crop_type="Flood-Prone Crops", premium=1500.00, sum_insured=35000.00, duration_months=6, waiting_period_days=7, claim_conditions="Flood/inundation damage. Immediate payout on satellite trigger.", eligibility_rules="Flood-prone district, land verified", coverage_type="Parametric Flood", eligible_crops=["Rice", "Vegetables", "Pulses"]),
        InsurancePlan(plan_id="PLAN-DPP-005", plan_name="Drought Protection Plan", crop_type="Drought-Prone Crops", premium=1100.00, sum_insured=30000.00, duration_months=12, waiting_period_days=15, claim_conditions="Drought index trigger (SPI < -1.5) or >40% crop loss.", eligibility_rules="Arid/semi-arid district, land verified", coverage_type="Drought Index", eligible_crops=["Bajra", "Jowar", "Pulses", "Oilseeds"]),
        InsurancePlan(plan_id="PLAN-MPH-006", plan_name="Multi-Peril Harvest Cover", crop_type="All Crops", premium=3200.00, sum_insured=100000.00, duration_months=12, waiting_period_days=30, claim_conditions="Covers fire, storm, pest, disease, and accidental damage. Min 20% loss.", eligibility_rules="Land verified, UDLRN active, any season", coverage_type="Multi-Peril", eligible_crops=["All Crops"]),
    ]
    for p in plans:
        db.add(p)
    await db.commit()

@router.get("/plans")
async def list_plans(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    await _seed_plans_if_needed(db)
    result = await db.execute(select(InsurancePlan).where(InsurancePlan.status == "ACTIVE"))
    plans = result.scalars().all()
    return {"success": True, "data": [{"planId": p.plan_id, "planName": p.plan_name, "cropType": p.crop_type, "premium": float(p.premium), "sumInsured": float(p.sum_insured), "durationMonths": p.duration_months, "waitingPeriodDays": p.waiting_period_days, "claimConditions": p.claim_conditions, "eligibilityRules": p.eligibility_rules, "coverageType": p.coverage_type, "eligibleCrops": p.eligible_crops or []} for p in plans]}

@router.get("/status/{udlrn}")
async def get_insurance_status(udlrn: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    app_result = await db.execute(select(InsuranceApplication).where(InsuranceApplication.udlrn == udlrn).order_by(InsuranceApplication.created_at.desc()))
    latest_app = app_result.scalars().first()
    policy_result = await db.execute(select(ActivePolicy).where(ActivePolicy.udlrn == udlrn, ActivePolicy.policy_status == "ACTIVE", ActivePolicy.end_date >= date.today()).order_by(ActivePolicy.start_date.desc()))
    active_policy = policy_result.scalars().first()
    return {"success": True, "data": {
        "hasActivePolicy": active_policy is not None,
        "activePolicy": {"policyNumber": active_policy.policy_number, "planName": active_policy.plan_name, "startDate": str(active_policy.start_date), "endDate": str(active_policy.end_date), "coverageAmount": float(active_policy.coverage_amount) if active_policy.coverage_amount else None, "premiumPaid": float(active_policy.premium_paid) if active_policy.premium_paid else None} if active_policy else None,
        "latestApplication": {"applicationId": latest_app.application_id, "planName": latest_app.plan_name, "status": latest_app.policy_status, "submittedAt": str(latest_app.submitted_at), "rejectionReason": latest_app.rejection_reason} if latest_app else None,
    }}

@router.post("/apply")
async def apply_policy(body: PolicyApplyRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    farmer = await db.execute(select(Farmer).where(Farmer.id == UUID(user["userId"])))
    farmer = farmer.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn_row = udlrn_result.scalar_one_or_none()
    udlrn = udlrn_row.udlrn if udlrn_row else None
    if not udlrn:
        return {"success": False, "error": {"message": "UDLRN not found. Complete land registration first."}}
    plan_result = await db.execute(select(InsurancePlan).where(InsurancePlan.plan_id == body.planId))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        return {"success": False, "error": {"message": "Invalid insurance plan selected."}}
    existing_active = await db.execute(select(ActivePolicy).where(ActivePolicy.udlrn == udlrn, ActivePolicy.policy_status == "ACTIVE", ActivePolicy.end_date >= date.today()))
    if existing_active.scalars().first():
        return {"success": False, "error": {"message": "You already have an active policy."}}
    application = InsuranceApplication(
        application_id=f"APP-{uuid4().hex[:8].upper()}",
        udlrn=udlrn,
        farmer_name=farmer.full_name,
        farmer_id=farmer.id,
        selected_plan_id=plan.plan_id,
        plan_name=plan.plan_name,
        crop_type=body.cropType or plan.crop_type,
        premium=plan.premium,
        sum_insured=plan.sum_insured,
        land_area_ha=body.landAreaHa or farmer.land_area,
        policy_status="PENDING",
    )
    db.add(application)
    await db.commit()
    return {"success": True, "data": {"applicationId": application.application_id, "planName": plan.plan_name, "status": "PENDING", "submittedAt": str(application.submitted_at)}}

@router.get("/policy/{udlrn}")
async def get_policy(udlrn: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    result = await db.execute(select(ActivePolicy).where(ActivePolicy.udlrn == udlrn).order_by(ActivePolicy.created_at.desc()))
    policies = result.scalars().all()
    return {"success": True, "data": [{"policyNumber": p.policy_number, "planName": p.plan_name, "startDate": str(p.start_date), "endDate": str(p.end_date), "coverageAmount": float(p.coverage_amount) if p.coverage_amount else None, "premiumPaid": float(p.premium_paid) if p.premium_paid else None, "status": p.policy_status} for p in policies]}

@router.get("/eligibility/{udlrn}")
async def check_eligibility(udlrn: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    policy_result = await db.execute(select(ActivePolicy).where(ActivePolicy.udlrn == udlrn, ActivePolicy.policy_status == "ACTIVE", ActivePolicy.end_date >= date.today()))
    active_policy = policy_result.scalars().first()
    if not active_policy:
        return {"success": True, "data": {"isEligible": False, "reason": "No active insurance policy found. Please apply for a policy first.", "checkedAt": str(datetime.utcnow())}}
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == UUID(user["userId"])))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer or not farmer.is_verified:
        return {"success": True, "data": {"isEligible": False, "reason": "Farmer profile not verified.", "checkedAt": str(datetime.utcnow())}}
    return {"success": True, "data": {"isEligible": True, "policyNumber": active_policy.policy_number, "reason": "Eligible to file claims", "checkedAt": str(datetime.utcnow())}}
