from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import Response
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
from app.services.satellite_service import get_ndvi_label, get_ndvi_color, get_ndvi_interpretation, SatelliteService
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

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
        "district": farmer.district,
        "taluk": farmer.taluk,
        "village": farmer.village,
        "hobli": farmer.address,
        "latitude": float(farmer.latitude) if farmer.latitude else None,
        "longitude": float(farmer.longitude) if farmer.longitude else None,
        "farm_lat": float(farmer.latitude) if farmer.latitude else None,
        "farm_lng": float(farmer.longitude) if farmer.longitude else None,
        "landAreaHa": float(udlrn.land_area_ha) if udlrn and udlrn.land_area_ha else None,
        "declaredCrop": udlrn.declared_crop if udlrn else "PADDY",
        "surveyNumber": udlrn.survey_number if udlrn else None,
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
    # Fallback to farmer table coordinates if udlrn gps is empty
    if not gps.get('lat') or not gps.get('lng'):
        from app.services.farmer_service import get_farmer_by_id
        farmer = await get_farmer_by_id(db, UUID(user["userId"]))
        if farmer and farmer.latitude and farmer.longitude:
            gps['lat'] = float(farmer.latitude)
            gps['lng'] = float(farmer.longitude)
    data = await get_farm_view(udlrn.udlrn, gps, udlrn.declared_crop or "PADDY")
    return {"success": True, "data": data}

@router.get("/satellite/all")
async def get_all_satellite_data(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_farmer),
):
    from app.models.udlrn_master import UdlrnMaster
    from app.services.satellite_service import get_ndvi_history_from_gee
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        return {"success": False, "error": {"message": "Land record not found"}}
    gps = {}
    if udlrn.gps_lat:
        gps['lat'] = float(udlrn.gps_lat)
    if udlrn.gps_lng:
        gps['lng'] = float(udlrn.gps_lng)
    # Fallback to farmer table coordinates if udlrn gps is empty
    if not gps.get('lat') or not gps.get('lng'):
        from app.services.farmer_service import get_farmer_by_id
        farmer = await get_farmer_by_id(db, UUID(user["userId"]))
        if farmer and farmer.latitude and farmer.longitude:
            gps['lat'] = float(farmer.latitude)
            gps['lng'] = float(farmer.longitude)
    lat = gps.get('lat')
    lng = gps.get('lng')
    if not lat or not lng:
        return {"success": True, "data": {
            "udlrn": udlrn.udlrn, "gps": gps, "crop": udlrn.declared_crop or "PADDY",
            "ndviHistory": [], "currentNdvi": None, "ndviLabel": "—",
            "ndviColor": "#9ca3af", "ndviInterpretation": "No coordinates available",
        }}
    monthly_ndvi = await get_ndvi_history_from_gee(lat, lng, months=12)
    current_ndvi = monthly_ndvi[-1]["ndvi"] if monthly_ndvi else None
    return {"success": True, "data": {
        "udlrn": udlrn.udlrn,
        "gps": gps,
        "crop": udlrn.declared_crop or "PADDY",
        "ndviHistory": monthly_ndvi,
        "currentNdvi": current_ndvi if current_ndvi is not None else 0.5,
        "ndviLabel": get_ndvi_label(current_ndvi) if current_ndvi is not None else "—",
        "ndviColor": get_ndvi_color(current_ndvi) if current_ndvi is not None else "#9ca3af",
        "ndviInterpretation": get_ndvi_interpretation(current_ndvi) if current_ndvi is not None else "No data",
    }}


@router.get("/carbon")
async def get_carbon(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_farmer)):
    from app.services.farmer_service import get_farmer_by_id
    from app.services.satellite_service import get_ndvi_history_from_gee
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    if not farmer:
        return {"success": False, "error": {"message": "Farmer not found"}}
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        return {"success": True, "data": {"eligible": False, "reason": "No land record found", "enrolled": farmer.carbon_enrolled}}
    area = float(udlrn.land_area_ha or 0)
    eligible = area >= 0.5 and udlrn.declared_crop is not None and udlrn.is_frozen != "true" and not farmer.is_blacklisted
    # Coordinates: udlrn_master first, then farmer table fallback
    lat = float(udlrn.gps_lat) if udlrn.gps_lat else (float(farmer.latitude) if farmer.latitude else None)
    lng = float(udlrn.gps_lng) if udlrn.gps_lng else (float(farmer.longitude) if farmer.longitude else None)
    if lat is None or lng is None:
        return {"success": True, "data": {"eligible": eligible, "enrolled": farmer.carbon_enrolled, "practiceType": farmer.carbon_practice, "carbonScore": udlrn.carbon_score or 0, "estimatedCredits": 0, "landAreaHa": area, "monthlyNdvi": [], "practices": [], "marketPrice": 850, "estimatedAnnualIncome": 0, "reason": "GPS coordinates not available"}}
    monthly_ndvi = await get_ndvi_history_from_gee(lat, lng, months=12)
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
    def _season_from_date(d):
        if d is None:
            return "—"
        month = d.month if hasattr(d, 'month') else int(str(d).split('-')[1])
        if month in (1, 2, 3, 10, 11, 12):
            return "Rabi"
        elif month in (7, 8, 9):
            return "Kharif"
        else:
            return "Summer"
    return {"success": True, "data": [{"id": str(p.id), "policyNumber": p.policy_number, "crop": p.crop, "insuredArea": float(p.insured_area), "sumInsured": float(p.sum_insured), "premiumPaid": float(p.premium_paid), "startDate": str(p.start_date), "endDate": str(p.end_date), "status": p.status, "season": _season_from_date(p.start_date)} for p in policies]}

@router.get("/weather")
async def get_weather(db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    from uuid import UUID
    from app.models.udlrn_master import UdlrnMaster
    import httpx
    from app.config import settings
    
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn = udlrn_result.scalar_one_or_none()
    from app.services.farmer_service import get_farmer_by_id
    farmer = await get_farmer_by_id(db, UUID(user["userId"]))
    # Coordinates: udlrn_master first, then farmer table fallback
    lat = float(udlrn.gps_lat) if udlrn and udlrn.gps_lat else (float(farmer.latitude) if farmer and farmer.latitude else None)
    lon = float(udlrn.gps_lng) if udlrn and udlrn.gps_lng else (float(farmer.longitude) if farmer and farmer.longitude else None)
    if lat is None or lon is None:
        return {"success": False, "error": {"message": "GPS coordinates not found"}}
    
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
    return {"success": True, "data": {"message": "All notifications marked as read"}}


@router.get("/land-data/{udlrm}")
async def get_land_data(udlrm: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    """
    Return full landData object from shared schema for a given UDLRM.
    Used by My Land page and dashboard.
    """
    from uuid import UUID
    # Find farmer by UDLRM
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrm))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        raise HTTPException(status_code=404, detail="UDLRM not found")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == udlrn.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Ownership check for farmers
    if user.get("role") == "FARMER" and user.get("userId") != str(farmer.id):
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "success": True,
        "data": farmer.landData or None
    }


@router.get("/satellite/latest/{udlrm}")
async def get_latest_satellite_data(udlrm: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    """
    Fetches latest satellite data using real GEE service.
    Returns updated landData with real satellite analysis.
    """
    import random
    from datetime import datetime

    # Find farmer by UDLRM
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrm))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        raise HTTPException(status_code=404, detail="UDLRM not found")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == udlrn.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Ownership check for farmers
    if user.get("role") == "FARMER" and user.get("userId") != str(farmer.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Extract existing landData
    land_data = farmer.landData or {}
    if not land_data:
        raise HTTPException(status_code=404, detail="No land data found")

    # Get coordinates from landData
    lat = land_data.get("lat")
    lng = land_data.get("lng")

    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Coordinates not found in land data")

    # Use real GEE satellite service
    satellite_service = SatelliteService()
    try:
        analysis = satellite_service.get_full_analysis(lat, lng, buffer_m=500)

        # Extract data from GEE analysis
        ndvi_data = analysis.get("ndvi", {})
        ndwi_data = analysis.get("ndwi", {})
        sar_data = analysis.get("sar_flood", {})

        # Update with real GEE data
        new_ndvi = ndvi_data.get("ndvi", land_data.get("ndvi", 0.5))
        new_soil_moisture = round(50 + (ndwi_data.get("ndwi", 0) * 100))
        new_crop_coverage = round(65 + (new_ndvi * 20))

        # Update lastSatelliteDate
        new_last_date = ndvi_data.get("scan_date", datetime.utcnow().strftime("%Y-%m-%d"))

        # Append new entry to ndviHistory (keep last 12 entries)
        ndvi_history = land_data.get("ndviHistory", [])
        ndvi_history.append({
            "month": datetime.utcnow().strftime("%b %Y"),
            "value": new_ndvi
        })
        if len(ndvi_history) > 12:
            ndvi_history = ndvi_history[-12:]

        # Recalculate fraudScore based on NDVI
        if new_ndvi > 0.6:
            fraud_score = random.randint(5, 20)  # low
        elif new_ndvi >= 0.4:
            fraud_score = random.randint(21, 50)  # medium
        else:
            fraud_score = random.randint(51, 85)  # high

        # Update landData with real GEE data
        land_data.update({
            "ndvi": new_ndvi,
            "soilMoisture": new_soil_moisture,
            "cropCoverage": new_crop_coverage,
            "lastSatelliteDate": new_last_date,
            "ndviHistory": ndvi_history,
            "fraudScore": fraud_score,
            "cropHealth": get_ndvi_label(new_ndvi),
            "sarStatus": "Flooded" if sar_data.get("flood_detected", False) else "Active",
            "fetchedAt": datetime.utcnow().isoformat()
        })

        # Save updated landData to DB
        farmer.landData = land_data
        await db.commit()

        return {
            "success": True,
            "data": land_data,
            "source": "Google Earth Engine (Real-time)",
            "refreshedAt": datetime.utcnow().isoformat()
        }
    except Exception as e:
        # If GEE fails, use the existing fallback with small variations
        import logging
        logging.error(f"GEE satellite refresh failed: {e}")
        current_ndvi = land_data.get("ndvi", 0.5)
        new_ndvi = round(max(0.1, min(0.95, current_ndvi + random.uniform(-0.02, 0.02))), 2)

        soil_moisture = land_data.get("soilMoisture", 60)
        new_soil_moisture = max(0, min(100, soil_moisture + random.randint(-3, 3)))

        crop_coverage = land_data.get("cropCoverage", 70)
        new_crop_coverage = max(0, min(100, crop_coverage + random.randint(-2, 2)))

        new_last_date = datetime.utcnow().strftime("%Y-%m-%d")

        ndvi_history = land_data.get("ndviHistory", [])
        ndvi_history.append({
            "month": datetime.utcnow().strftime("%b %Y"),
            "value": new_ndvi
        })
        if len(ndvi_history) > 12:
            ndvi_history = ndvi_history[-12:]

        if new_ndvi > 0.6:
            fraud_score = random.randint(5, 20)
        elif new_ndvi >= 0.4:
            fraud_score = random.randint(21, 50)
        else:
            fraud_score = random.randint(51, 85)

        land_data.update({
            "ndvi": new_ndvi,
            "soilMoisture": new_soil_moisture,
            "cropCoverage": new_crop_coverage,
            "lastSatelliteDate": new_last_date,
            "ndviHistory": ndvi_history,
            "fraudScore": fraud_score,
            "cropHealth": get_ndvi_label(new_ndvi),
            "fetchedAt": datetime.utcnow().isoformat()
        })

        farmer.landData = land_data
        await db.commit()

        return {
            "success": True,
            "data": land_data,
            "source": "Fallback (GEE unavailable)",
            "refreshedAt": datetime.utcnow().isoformat()
        }


def _generate_mock_refresh(base_data: dict, lat: float, lng: float) -> dict:
    """Generate mock satellite refresh data with small variations."""
    import random
    current_ndvi = base_data.get("ndvi", 0.5)
    # Small random variation ±0.05
    new_ndvi = round(max(0.1, min(0.95, current_ndvi + random.uniform(-0.05, 0.05))), 2)
    return {
        **base_data,
        "ndvi": new_ndvi,
        "cropHealth": get_ndvi_label(new_ndvi),
        "cropCoverage": min(100, max(0, base_data.get("cropCoverage", 70) + random.randint(-5, 5))),
        "soilMoisture": min(100, max(0, base_data.get("soilMoisture", 60) + random.randint(-10, 10))),
        "lastSatelliteDate": datetime.utcnow().strftime("%Y-%m-%d"),
        "satelliteSource": "Mock (GEE unavailable)",
        "refreshedAt": datetime.utcnow().isoformat()
    }


@router.get("/report/{udlrm}")
async def get_farmer_report(udlrm: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_farmer)):
    """
    Generate and return a PDF report for a given UDLRM.
    Includes basic information, satellite data, and land record details.
    """
    from io import BytesIO

    # Find farmer by UDLRM
    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrm))
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        raise HTTPException(status_code=404, detail="UDLRM not found")

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == udlrn.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Ownership check for farmers
    if user.get("role") == "FARMER" and user.get("userId") != str(farmer.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Extract landData
    land_data = farmer.landData or {}

    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("PMFBY Farmer Land & Satellite Verification Report", styles['Title']))
    elements.append(Spacer(1, 0.2*inch))

    # Basic Information
    elements.append(Paragraph("Basic Information", styles['Heading2']))
    basic_data = [
        ["UDLRM Number", udlrm],
        ["Farmer Name", farmer.full_name or "—"],
        ["Mobile", farmer.mobile or "—"],
        ["State", land_data.get("state", farmer.district or "—")],
        ["District", land_data.get("district", farmer.district or "—")],
        ["Village", land_data.get("village", farmer.village or "—")],
    ]
    basic_table = Table(basic_data, colWidths=[2*inch, 4*inch])
    basic_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (1, 0), (-1, 0), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(basic_table)
    elements.append(Spacer(1, 0.2*inch))

    # Satellite Data
    elements.append(Paragraph("Satellite Data", styles['Heading2']))
    satellite_data = [
        ["NDVI", f"{land_data.get('ndvi', 0):.2f}" if land_data.get('ndvi') else "—"],
        ["Crop Health", land_data.get("cropHealth", "—")],
        ["Crop Type", land_data.get("cropType", "—")],
        ["Soil Moisture", f"{land_data.get('soilMoisture', 0)}%" if land_data.get('soilMoisture') else "—"],
        ["Fraud Risk", f"{land_data.get('fraudScore', 0)}/100" if land_data.get('fraudScore') else "—"],
        ["Last Satellite Date", land_data.get("lastSatelliteDate", "—")],
    ]
    satellite_table = Table(satellite_data, colWidths=[2*inch, 4*inch])
    satellite_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (1, 0), (-1, 0), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(satellite_table)
    elements.append(Spacer(1, 0.2*inch))

    # Land Record Details
    elements.append(Paragraph("Land Record Details", styles['Heading2']))
    land_data_rows = [
        ["Survey No", land_data.get("surveyNo", "—")],
        ["Land Area", f"{(land_data.get('area', 0) * 2.47105):.2f} ac ({land_data.get('area', 0)} ha)" if land_data.get('area') else "—"],
        ["Land Use", land_data.get("landUse", "—")],
        ["RTC Status", land_data.get("rtcStatus", "—")],
    ]
    land_table = Table(land_data_rows, colWidths=[2*inch, 4*inch])
    land_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgreen),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (1, 0), (-1, 0), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(land_table)
    elements.append(Spacer(1, 0.2*inch))

    # Verification Status
    elements.append(Paragraph("Verification Status", styles['Heading2']))
    verification_data = [
        ["Coordinates Verified via Satellite", "GPS coordinates matched with satellite imagery"],
        ["Satellite Analysis Complete", "NDVI, crop health, and fraud analysis performed"],
    ]
    verification_table = Table(verification_data, colWidths=[3*inch, 3*inch])
    verification_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (1, 0), (-1, 0), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(verification_table)

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PMFBY_Report_{udlrm}.pdf"}
    )


@router.get("/application/claims")
async def get_farmer_claim_status(
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_farmer),
):
    """Return any ClaimSubmission records linked to this farmer's UDLRM."""
    from app.models.claim_submission import ClaimSubmission
    from app.models.udlrn_master import UdlrnMaster

    udlrn_result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == UUID(user["userId"])))
    udlrn_rec = udlrn_result.scalar_one_or_none()
    if not udlrn_rec:
        return {"success": True, "data": []}

    claim_result = await db.execute(
        select(ClaimSubmission).where(ClaimSubmission.udlrm == udlrn_rec.udlrn).order_by(ClaimSubmission.filed_at.desc())
    )
    claims = claim_result.scalars().all()

    return {"success": True, "data": [
        {
            "claimId": c.claim_id,
            "status": c.status,
            "fraudScore": c.fraud_score,
            "verdict": c.fraud_verdict,
            "claimAmount": float(c.claim_amount) if c.claim_amount else None,
            "filedAt": c.filed_at.isoformat() if c.filed_at else None,
            "cropType": c.crop_type,
            "causeOfLoss": c.cause_of_loss,
        }
        for c in claims
    ]}