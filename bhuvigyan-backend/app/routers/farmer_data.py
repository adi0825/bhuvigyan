from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_farmer
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.models.notification import Notification
from app.models.claim import Claim
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
from app.services.satellite_service import get_ndvi_label, get_ndvi_color, get_ndvi_interpretation, generate_mock_ndvi_12months

router = APIRouter()


class ClaimFileRequest(BaseModel):
    udlrn: str
    damageCause: str
    damagePercent: float
    damageDate: str
    description: Optional[str] = None

@router.get("/profile")
async def get_profile(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from app.services.farmer_service import get_farmer_by_id
    from uuid import UUID
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    if not farmer:
        return {"success": False, "error": {"message": "Farmer not found"}}
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    return {"success": True, "data": {
        "id": str(farmer.id), "fullName": farmer.full_name, "mobile": farmer.mobile,
        "isVerified": farmer.is_verified, "email": None,
        "bankAccount": farmer.bank_account or "", "bankIfsc": farmer.bank_ifsc or "", "bankName": farmer.bank_name,
        "stateCode": farmer.state_code or "KA", "districtCode": farmer.district or "",
        "notificationPrefs": {"inApp": True, "sms": True, "whatsapp": True},
        "parcels": [{"udlrn": udlrn.udlrn, "areaHa": float(udlrn.land_area_ha), "landUse": "Agricultural", "crop": udlrn.declared_crop}] if udlrn else [],
    }}

@router.get("/land")
async def get_land(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.services.farmer_service import get_farmer_by_id
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    land = udlrn_result.scalar_one_or_none()
    if not land:
        return {"success": False, "error": {"message": "Land record not found"}}
    from app.models.claim import Claim
    claims_result = await db.execute(
        select(Claim).where(Claim.farmer_id == UUID(user["userId"])).order_by(Claim.created_at.desc())
    )
    past_claims = claims_result.scalars().all()
    return {"success": True, "data": {
        "udlrn": land.udlrn,
        "landOwnerName": farmer.full_name if farmer else None,
        "landAreaHa": float(land.land_area_ha),
        "declaredCrop": land.declared_crop,
        "isFrozen": land.is_frozen == "true",
        "frozenReason": "Land record frozen due to pending litigation" if land.is_frozen == "true" else None,
        "landUseType": "Agricultural",
        "carbonScore": land.carbon_score,
        "carbonEligible": farmer.carbon_eligible if farmer else False,
        "carbonEnrolled": farmer.carbon_enrolled if farmer else False,
        "payoutBankName": farmer.bank_name if farmer else None,
        "payoutIfsc": farmer.bank_ifsc if farmer else None,
        "payoutAccountNo": farmer.bank_account if farmer else None,
        "state": farmer.state_code or "KA",
        "district": farmer.district or "Bengaluru Rural",
        "taluk": farmer.taluk or "Devanahalli",
        "village": farmer.village or "Yelahanka",
        "season": "Kharif 2026",
        "claimsHistory": [{"id": str(c.id), "claimNumber": c.claim_number, "status": c.status, "declaredCrop": c.declared_crop, "filedAt": str(c.created_at), "approvedAmount": float(c.claimed_area_ha) * 28000 * 0.75 if c.status in ("APPROVED", "AUTO_APPROVED") else None} for c in past_claims],
    }}

@router.get("/notifications")
async def get_notifications(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    result = await db.execute(select(Notification).where(Notification.farmer_id == UUID(user["userId"])).order_by(Notification.created_at.desc()))
    notifications = result.scalars().all()
    return {"success": True, "data": [{"id": str(n.id), "title": n.title, "message": n.message, "channel": n.channel or "IN_APP", "isRead": n.is_read, "readAt": str(n.read_at) if n.read_at else None, "createdAt": str(n.created_at)} for n in notifications]}

@router.get("/satellite")
async def get_satellite_view(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_farmer),
):
    from app.models.udlrn_master import UdlrnMaster
    from app.services.satellite_service import get_farm_view
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        return {"success": False, "error": {"message": "Land record not found"}}
    gps = {}
    if udlrn.gps_lat:
        gps['lat'] = float(udlrn.gps_lat)
    if udlrn.gps_lng:
        gps['lng'] = float(udlrn.gps_lng)
    data = await get_farm_view(udlrn.udlrn, gps, udlrn.declared_crop or "PADDY")
    return {"success": True, "data": data}

@router.get("/satellite/all")
async def get_all_satellite_data(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_farmer),
):
    from app.models.udlrn_master import UdlrnMaster
    from app.services.satellite_service import get_farm_view, get_ndvi_label, get_ndvi_color, get_ndvi_interpretation, generate_mock_ndvi_12months
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        return {"success": False, "error": {"message": "Land record not found"}}
    gps = {}
    if udlrn.gps_lat:
        gps['lat'] = float(udlrn.gps_lat)
    if udlrn.gps_lng:
        gps['lng'] = float(udlrn.gps_lng)
    monthly_ndvi = generate_mock_ndvi_12months(udlrn.udlrn)
    return {"success": True, "data": {
        "udlrn": udlrn.udlrn,
        "gps": gps,
        "crop": udlrn.declared_crop or "PADDY",
        "ndviHistory": monthly_ndvi,
        "currentNdvi": monthly_ndvi[-1]["ndvi"] if monthly_ndvi else 0.5,
        "ndviLabel": get_ndvi_label(monthly_ndvi[-1]["ndvi"] if monthly_ndvi else 0.5),
        "ndviColor": get_ndvi_color(monthly_ndvi[-1]["ndvi"] if monthly_ndvi else 0.5),
        "ndviInterpretation": get_ndvi_interpretation(monthly_ndvi[-1]["ndvi"] if monthly_ndvi else 0.5),
    }}


@router.get("/carbon")
async def get_carbon(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    from app.services.farmer_service import get_farmer_by_id
    from app.services.satellite_service import get_ndvi_label, get_ndvi_color, get_ndvi_interpretation, generate_mock_ndvi_12months
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    if not farmer:
        return {"success": False, "error": {"message": "Farmer not found"}}
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        return {"success": True, "data": {"eligible": False, "reason": "No land record found", "enrolled": farmer.carbon_enrolled}}
    area = float(udlrn.land_area_ha or 0)
    eligible = area >= 0.5 and udlrn.declared_crop is not None and udlrn.is_frozen != "true" and not farmer.is_blacklisted
    monthly_ndvi = generate_mock_ndvi_12months(udlrn.udlrn)
    area = float(udlrn.land_area_ha or 2.5)
    practices = [
        {"key": "PADDY_STRAW_MANAGEMENT", "label": "Paddy Straw Management", "icon": "🌾", "creditsPerHa": 5.2, "estimatedCredits": round(area * 5.2, 1), "description": "Avoid burning, earn credits"},
        {"key": "ZERO_TILLAGE", "label": "Zero Tillage Farming", "icon": "🚜", "creditsPerHa": 3.8, "estimatedCredits": round(area * 3.8, 1), "description": "No-till = less CO2 released"},
        {"key": "COVER_CROPPING", "label": "Cover Cropping", "icon": "🌿", "creditsPerHa": 2.5, "estimatedCredits": round(area * 2.5, 1), "description": "Grow cover crop between seasons"},
        {"key": "WATER_MANAGEMENT", "label": "Alternate Wetting & Drying", "icon": "💧", "creditsPerHa": 4.1, "estimatedCredits": round(area * 4.1, 1), "description": "Reduce methane from paddy water"},
    ]
    return {"success": True, "data": {
        "eligible": eligible,
        "enrolled": farmer.carbon_enrolled,
        "practiceType": farmer.carbon_practice,
        "carbonScore": udlrn.carbon_score or 0,
        "estimatedCredits": round(area * 5.2, 1),
        "landAreaHa": area,
        "monthlyNdvi": monthly_ndvi,
        "practices": practices,
        "marketPrice": 850,
        "estimatedAnnualIncome": round(area * 5.2 * 850),
    }}


@router.post("/carbon/enrol")
async def enrol_carbon(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer), body: dict = None):
    from app.services.farmer_service import get_farmer_by_id
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    if not farmer:
        return {"success": False, "error": {"message": "Farmer not found"}}
    practice = body.get("practiceType") if body else None
    if not practice:
        return {"success": False, "error": {"message": "Practice type required"}}
    farmer.carbon_enrolled = True
    farmer.carbon_practice = practice
    await db.commit()
    return {"success": True, "data": {"enrolled": True, "practiceType": practice, "message": "Enrolled successfully"}}


@router.get("/claims")
async def get_claims(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.models.claim import Claim
    result = await db.execute(select(Claim).where(Claim.farmer_id == UUID(user["userId"])).order_by(Claim.created_at.desc()))
    claims = result.scalars().all()
    return {"success": True, "data": [{"id": str(c.id), "claimNumber": c.claim_number, "udlrn": c.udlrn, "declaredCrop": c.declared_crop, "damageType": c.damage_cause or "UNKNOWN", "fraudScore": c.fraud_score, "status": c.status, "filedAt": str(c.created_at), "approvedAmount": float(c.claimed_area_ha) * 28000 * 0.75 if c.status in ("APPROVED", "AUTO_APPROVED") else None, "claimedAreaHa": float(c.claimed_area_ha)} for c in claims]}

@router.get("/policies")
async def get_policies(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.models.policy import Policy
    result = await db.execute(select(Policy).where(Policy.farmer_id == UUID(user["userId"]), Policy.status == "ACTIVE").order_by(Policy.start_date.desc()))
    policies = result.scalars().all()
    return {"success": True, "data": [{"id": str(p.id), "policyNumber": p.policy_number, "crop": p.crop, "insuredArea": float(p.insured_area), "sumInsured": float(p.sum_insured), "premiumPaid": float(p.premium_paid), "startDate": str(p.start_date), "endDate": str(p.end_date), "status": p.status} for p in policies]}

@router.get("/weather")
async def get_weather(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.models.udlrn_master import UdlrnMaster
    import httpx
    from app.config import settings
    
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn or not udlrn.gps_lat or not udlrn.gps_lng:
        return {"success": False, "error": {"message": "GPS coordinates not found"}}
    
    lat = udlrn.gps_lat
    lon = udlrn.gps_lng
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.OPENWEATHER_API_KEY}&units=metric"
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "data": {
                        "temp": data["main"]["temp"],
                        "humidity": data["main"]["humidity"],
                        "windSpeed": data["wind"]["speed"],
                        "condition": data["weather"][0]["main"],
                        "description": data["weather"][0]["description"],
                        "location": {"lat": lat, "lon": lon}
                    }
                }
            else:
                return {"success": False, "error": {"message": "Weather data unavailable"}}
    except Exception as e:
        return {"success": False, "error": {"message": str(e)}}

@router.get("/reports")
async def get_reports(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.models.claim import Claim
    result = await db.execute(select(Claim).where(Claim.farmer_id == UUID(user["userId"])).order_by(Claim.created_at.desc()))
    claims = result.scalars().all()
    return {"success": True, "data": [{
        "id": str(c.id),
        "claimNumber": c.claim_number,
        "status": c.status,
        "declaredCrop": c.declared_crop,
        "filedAt": str(c.created_at),
        "approvedAmount": float(c.claimed_area_ha) * 28000 * 0.75 if c.status in ("APPROVED", "AUTO_APPROVED") else None,
    } for c in claims]}

@router.post("/carbon/enrol")
async def enrol_carbon(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.services.farmer_service import get_farmer_by_id
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    if not farmer:
        return {"success": False, "error": {"message": "Farmer not found"}}
    if farmer.carbon_enrolled:
        return {"success": False, "error": {"message": "Already enrolled in carbon program", "code": "ALREADY_ENROLLED"}}
    farmer.carbon_enrolled = True
    farmer.carbon_practice = "PADDY_STRAW_MANAGEMENT"
    notif = Notification(farmer_id=farmer.id, title="Carbon Enrolled", message="You have been enrolled in the carbon credit program. Estimated credits: 100 kg CO2/year.", is_read=False)
    db.add(notif)
    await db.commit()
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    return {"success": True, "data": {"enrolled": True, "practiceType": "PADDY_STRAW_MANAGEMENT", "estimatedCredits": float(udlrn.carbon_score) if udlrn else 100}}

@router.post("/claims")
async def file_claim(
    body: ClaimFileRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_farmer),
):
    from app.services.farmer_service import get_farmer_by_id
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    if not farmer:
        return {"success": False, "error": {"message": "Farmer not found"}}

    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == body.udlrn))
    land = udlrn_result.scalar_one_or_none()
    if not land or str(land.farmer_id) != user["userId"]:
        return {"success": False, "error": {"message": "Land record not found or does not belong to you"}}

    count = await db.scalar(select(Claim.id))
    claim_number = f"C-KA-{datetime.now().year}-{str((count or 0) + 1).zfill(5)}"

    claim = Claim(
        claim_number=claim_number,
        udlrn=body.udlrn,
        farmer_id=UUID(user["userId"]),
        declared_crop=land.declared_crop,
        claimed_area_ha=land.land_area_ha,
        damage_cause=body.damageCause,
        damage_percent=body.damagePercent,
        season="KHARIF",
        year=datetime.now().year,
        status="PENDING",
    )
    db.add(claim)
    await db.commit()
    await db.refresh(claim)

    notif = Notification(
        farmer_id=farmer.id,
        title="Claim Filed Successfully",
        message=f"Your claim {claim_number} has been registered. Our AI will analyze your farm and provide a verdict shortly.",
        is_read=False,
        channel="IN_APP",
    )
    db.add(notif)
    await db.commit()

    background_tasks.add_task(process_claim_score, str(claim.id), body.udlrn)

    return {"success": True, "data": {
        "claimId": str(claim.id),
        "claimNumber": claim_number,
        "status": "PENDING",
        "message": "Claim submitted. AI analysis in progress."
    }}


async def process_claim_score(claim_id: str, udlrn: str):
    pass


@router.post("/notifications/mark-read/{notification_id}")
async def mark_notification_read(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer), notification_id: str = None):
    from uuid import UUID
    if not notification_id:
        return {"success": False, "error": {"message": "Notification ID required"}}
    result = await db.execute(select(Notification).where(Notification.id == UUID(notification_id), Notification.farmer_id == UUID(user["userId"])))
    notif = result.scalar_one_or_none()
    if not notif:
        return {"success": False, "error": {"message": "Notification not found"}}
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    await db.commit()
    return {"success": True, "data": {"id": str(notif.id), "isRead": True, "readAt": str(notif.read_at)}}

@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    result = await db.execute(select(Notification).where(Notification.farmer_id == UUID(user["userId"]), Notification.is_read == False))
    notifications = result.scalars().all()
    for notif in notifications:
        notif.is_read = True
    await db.commit()
    return {"success": True, "data": {"count": len(notifications), "allRead": True}}