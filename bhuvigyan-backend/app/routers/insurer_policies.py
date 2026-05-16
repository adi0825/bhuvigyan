from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from uuid import uuid4, UUID
from app.database import get_db
from app.dependencies import require_insurer_role
from app.models.insurance_application import InsuranceApplication
from app.models.active_policy import ActivePolicy
from app.models.insurance_plan import InsurancePlan
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster

router = APIRouter()

class PolicyApproveRequest(BaseModel):
    applicationId: str
    policyNumber: str = ""
    startDate: str = ""
    endDate: str = ""
    remarks: str = ""

class PolicyRejectRequest(BaseModel):
    applicationId: str
    reason: str

@router.get("/policy-applications")
async def list_applications(db: AsyncSession = Depends(get_db), user: dict = Depends(require_insurer_role)):
    result = await db.execute(
        select(InsuranceApplication).order_by(InsuranceApplication.submitted_at.desc())
    )
    apps = result.scalars().all()
    data = []
    for a in apps:
        farmer = None
        if a.farmer_id:
            f_res = await db.execute(select(Farmer).where(Farmer.id == a.farmer_id))
            farmer = f_res.scalar_one_or_none()
        udlrn_row = None
        if a.udlrn:
            u_res = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == a.udlrn))
            udlrn_row = u_res.scalar_one_or_none()
        data.append({
            "applicationId": a.application_id,
            "udlrn": a.udlrn,
            "farmerName": a.farmer_name,
            "farmerMobile": farmer.mobile if farmer else None,
            "requestedPlan": a.plan_name,
            "cropType": a.crop_type,
            "premium": float(a.premium) if a.premium else None,
            "sumInsured": float(a.sum_insured) if a.sum_insured else None,
            "landAreaHa": float(a.land_area_ha) if a.land_area_ha else None,
            "landVerified": udlrn_row.satellite_verified if udlrn_row else False,
            "status": a.policy_status,
            "submittedAt": str(a.submitted_at),
            "insurerRemarks": a.insurer_remarks,
            "rejectionReason": a.rejection_reason,
        })
    return {"success": True, "data": data}

@router.get("/policy-application/{application_id}")
async def get_application(application_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(require_insurer_role)):
    result = await db.execute(select(InsuranceApplication).where(InsuranceApplication.application_id == application_id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    farmer = None
    if a.farmer_id:
        f_res = await db.execute(select(Farmer).where(Farmer.id == a.farmer_id))
        farmer = f_res.scalar_one_or_none()
    udlrn_row = None
    if a.udlrn:
        u_res = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == a.udlrn))
        udlrn_row = u_res.scalar_one_or_none()
    plan_res = await db.execute(select(InsurancePlan).where(InsurancePlan.plan_id == a.selected_plan_id))
    plan = plan_res.scalar_one_or_none()
    return {"success": True, "data": {
        "applicationId": a.application_id,
        "udlrn": a.udlrn,
        "farmerName": a.farmer_name,
        "farmerMobile": farmer.mobile if farmer else None,
        "farmerAddress": farmer.address if farmer else None,
        "farmerDistrict": farmer.district if farmer else None,
        "landVerified": udlrn_row.satellite_verified if udlrn_row else False,
        "landAreaHa": float(udlrn_row.land_area_ha) if udlrn_row and udlrn_row.land_area_ha else None,
        "requestedPlan": a.plan_name,
        "planDetails": {"planId": plan.plan_id, "planName": plan.plan_name, "coverageType": plan.coverage_type, "claimConditions": plan.claim_conditions, "eligibilityRules": plan.eligibility_rules, "eligibleCrops": plan.eligible_crops or []} if plan else None,
        "cropType": a.crop_type,
        "premium": float(a.premium) if a.premium else None,
        "sumInsured": float(a.sum_insured) if a.sum_insured else None,
        "status": a.policy_status,
        "submittedAt": str(a.submitted_at),
        "insurerRemarks": a.insurer_remarks,
        "rejectionReason": a.rejection_reason,
    }}

@router.post("/policy-approve")
async def approve_application(body: PolicyApproveRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(require_insurer_role)):
    result = await db.execute(select(InsuranceApplication).where(InsuranceApplication.application_id == body.applicationId))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.policy_status != "PENDING":
        return {"success": False, "error": {"message": f"Application is already {app.policy_status}"}}
    plan_res = await db.execute(select(InsurancePlan).where(InsurancePlan.plan_id == app.selected_plan_id))
    plan = plan_res.scalar_one_or_none()
    start = datetime.strptime(body.startDate, "%Y-%m-%d").date() if body.startDate else date.today()
    end = datetime.strptime(body.endDate, "%Y-%m-%d").date() if body.endDate else (start + timedelta(days=(plan.duration_months * 30) if plan else 180))
    policy_number = body.policyNumber or f"POL-{uuid4().hex[:8].upper()}"
    active_policy = ActivePolicy(
        policy_number=policy_number,
        udlrn=app.udlrn,
        farmer_name=app.farmer_name,
        farmer_id=app.farmer_id,
        plan_id=app.selected_plan_id,
        plan_name=app.plan_name,
        start_date=start,
        end_date=end,
        coverage_amount=app.sum_insured,
        premium_paid=app.premium,
        policy_status="ACTIVE",
        insurer_id=UUID(user["userId"]) if user.get("userId") else None,
        insurer_name=user.get("company") or user.get("email") or "Insurer",
        approved_at=datetime.utcnow(),
        application_id=app.application_id,
    )
    app.policy_status = "APPROVED"
    app.reviewed_at = datetime.utcnow()
    app.insurer_remarks = body.remarks
    db.add(active_policy)
    await db.commit()
    return {"success": True, "data": {"policyNumber": policy_number, "status": "ACTIVE", "startDate": str(start), "endDate": str(end), "approvedAt": str(app.reviewed_at)}}

@router.post("/policy-reject")
async def reject_application(body: PolicyRejectRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(require_insurer_role)):
    result = await db.execute(select(InsuranceApplication).where(InsuranceApplication.application_id == body.applicationId))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.policy_status != "PENDING":
        return {"success": False, "error": {"message": f"Application is already {app.policy_status}"}}
    app.policy_status = "REJECTED"
    app.reviewed_at = datetime.utcnow()
    app.rejection_reason = body.reason
    await db.commit()
    return {"success": True, "data": {"applicationId": app.application_id, "status": "REJECTED", "reason": body.reason}}
