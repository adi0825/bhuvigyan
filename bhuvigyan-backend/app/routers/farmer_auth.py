from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import FarmerLoginRequest, FarmerOTPVerifyRequest, FarmerRegisterRequest
from app.services.farmer_service import get_farmer_by_mobile, create_farmer, get_udlrn_by_farmer
from app.services.otp_service import generate_otp, verify_otp
from app.utils.jwt_utils import create_access_token, create_refresh_token
from app.models.udlrn_master import UdlrnMaster
from app.utils.udlrn_generator import generate

router = APIRouter()

@router.post("/login")
async def farmer_login(body: FarmerLoginRequest, db: AsyncSession = Depends(get_db)):
    from app.config import settings
    mobile = body.mobile or body.mobileNumber
    if not mobile:
        raise HTTPException(status_code=422, detail="Mobile number required")
    farmer = await get_farmer_by_mobile(db, mobile)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not registered")
    otp = await generate_otp(mobile)
    return {"success": True, "data": {"devOtp": otp}}

@router.post("/otp/send")
async def farmer_send_otp(body: FarmerLoginRequest, db: AsyncSession = Depends(get_db)):
    mobile = body.mobile or body.mobileNumber
    if not mobile:
        raise HTTPException(status_code=422, detail="Mobile number required")
    farmer = await get_farmer_by_mobile(db, mobile)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not registered")
    otp = await generate_otp(mobile)
    return {"success": True, "data": {"devOtp": otp}}

@router.post("/forgot-udlrn")
async def farmer_forgot_udlrn(body: FarmerLoginRequest, db: AsyncSession = Depends(get_db)):
    mobile = body.mobile or body.mobileNumber
    if not mobile:
        raise HTTPException(status_code=422, detail="Mobile number required")
    farmer = await get_farmer_by_mobile(db, mobile)
    if not farmer:
        raise HTTPException(status_code=404, detail="No farmer registered with this mobile number")
    udlrn_record = await get_udlrn_by_farmer(db, farmer.id)
    if not udlrn_record:
        raise HTTPException(status_code=404, detail="UDLRN not found for this farmer")
    return {"success": True, "data": {
        "udlrn": udlrn_record.udlrn,
        "fullName": farmer.full_name,
        "mobile": farmer.mobile,
    }}


@router.post("/verify-otp")
async def farmer_verify_otp(body: FarmerOTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    mobile = body.mobile or body.mobileNumber
    if not mobile:
        raise HTTPException(status_code=422, detail="Mobile number required")
    is_valid = await verify_otp(mobile, body.otp)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    farmer = await get_farmer_by_mobile(db, mobile)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    udlrn_record = await get_udlrn_by_farmer(db, farmer.id)
    access_token = create_access_token({"userId": str(farmer.id), "mobile": farmer.mobile, "role": "FARMER"})
    refresh_token = create_refresh_token({"userId": str(farmer.id)})
    return {"success": True, "data": {"accessToken": access_token, "refreshToken": refresh_token, "farmer": {"id": str(farmer.id), "fullName": farmer.full_name, "mobile": farmer.mobile}, "udlrn": udlrn_record.udlrn if udlrn_record else None}}

@router.post("/register")
async def farmer_register(body: FarmerRegisterRequest, db: AsyncSession = Depends(get_db)):
    raw = body.model_dump()
    mobile = body.mobile or raw.get("mobileNumber")
    if not mobile:
        raise HTTPException(status_code=422, detail="Mobile number required")
    existing = await get_farmer_by_mobile(db, mobile)
    if existing:
        raise HTTPException(status_code=409, detail="Mobile already registered")

    farmer_data = {
        "mobile": mobile,
        "full_name": body.fullName or body.full_name or mobile,
        "father_name": body.father_name,
        "address": body.address,
        "village": body.village,
        "taluk": body.taluk,
        "district": body.district,
        "state_code": body.state_code,
        "pincode": body.pincode,
        "bank_name": body.bank_name,
        "bank_ifsc": body.bank_ifsc,
        "bank_account": body.bank_account,
    }

    # Optional coordinates from registration
    lat = raw.get("latitude")
    lng = raw.get("longitude")
    if lat and lng:
        farmer_data["latitude"] = lat
        farmer_data["longitude"] = lng

    farmer = await create_farmer(db, farmer_data)
    await db.flush()

    # Save landData from shared schema if provided
    land_data = raw.get("landData")
    if land_data:
        farmer.landData = land_data
        # Set satellite_verified based on coordinatesVerified
        farmer.satellite_verified = land_data.get("coordinatesVerified", False)
    await db.flush()

    # Generate UDLRM with state code from landData or default to KA
    state_code = land_data.get("state") if land_data else None
    state_code_map = {
        "Karnataka": "KA", "Maharashtra": "MH", "Telangana": "TS",
        "Punjab": "PB", "Rajasthan": "RJ", "Uttar Pradesh": "UP"
    }
    state_code_final = state_code_map.get(state_code, "KA") if state_code else "KA"
    udlrm = await generate(db, state_code_final)
    udlrn_record = UdlrnMaster(
        udlrn=udlrm, farmer_id=farmer.id,
        land_area_ha=body.land_area or 2.5,
        declared_crop=body.crop_name or "PADDY",
        carbon_score=0,
        gps_lat=float(lat) if lat else None,
        gps_lng=float(lng) if lng else None,
    )
    db.add(udlrn_record)

    # KGIS auto-approval check + coordinate resolution
    registration_status = "PENDING_ADMIN_REVIEW"
    kgis_verified = False
    kgis_result = None

    # Priority 1: If lat/lng provided, verify them against declared village
    if lat and lng and farmer.village and farmer.district:
        try:
            from app.services.land_service import LandVerifier
            lv = LandVerifier()
            verify_result = await lv.verify_coordinates(float(lat), float(lng), farmer.village, farmer.district)
            if verify_result.get("matches_declared"):
                farmer.is_verified = True
                kgis_verified = True
                kgis_result = verify_result
                if farmer.bank_account and farmer.bank_ifsc:
                    registration_status = "AUTO_APPROVED"
                else:
                    registration_status = "PENDING_BANK_VERIFICATION"
        except Exception:
            pass

    # Priority 2: If no coordinates but village+district+taluk declared, resolve from KGIS
    if (not farmer.latitude or not farmer.longitude) and farmer.village and farmer.district and farmer.taluk:
        try:
            from app.services.land_service import LandVerifier
            lv = LandVerifier()
            resolved = await lv.resolve_village(farmer.state_code or "KA", farmer.district, farmer.taluk, farmer.village)
            if resolved.get("found"):
                farmer.latitude = resolved["centroid_lat"]
                farmer.longitude = resolved["centroid_lng"]
                farmer.is_verified = True
                kgis_verified = True
                kgis_result = resolved
                # Compute polygon area from KGIS geometry
                if resolved.get("geometry") and resolved.get("geometry").get("rings"):
                    area_ha = lv.compute_polygon_area_ha(resolved["geometry"]["rings"][0])
                    udlrn_record.land_area_ha = area_ha
                    udlrn_record.gps_lat = resolved["centroid_lat"]
                    udlrn_record.gps_lng = resolved["centroid_lng"]
                if farmer.bank_account and farmer.bank_ifsc:
                    registration_status = "AUTO_APPROVED"
                else:
                    registration_status = "PENDING_BANK_VERIFICATION"
        except Exception:
            pass

    await db.commit()

    # Send registration notification
    try:
        from app.services.notification_trigger_service import trigger_farmer_registration_notification
        await trigger_farmer_registration_notification(str(farmer.id), registration_status, db)
    except Exception:
        pass

    otp = await generate_otp(mobile)
    return {
        "success": True,
        "data": {
            "farmerId": str(farmer.id),
            "udlrn": udlrm,
            "udlrmNumber": udlrm,  # Alias for frontend consistency
            "devOtp": otp,
            "registrationStatus": registration_status,
            "kgisVerified": kgis_verified,
        },
    }