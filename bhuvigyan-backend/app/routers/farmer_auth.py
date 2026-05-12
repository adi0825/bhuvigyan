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
    farmer = await create_farmer(db, farmer_data)
    await db.flush()
    udlrn = await generate(db, "KA")
    udlrn_record = UdlrnMaster(udlrn=udlrn, farmer_id=farmer.id, land_area_ha=body.land_area or 2.5, declared_crop=body.crop_name or "PADDY", carbon_score=0)
    db.add(udlrn_record)
    await db.commit()
    otp = await generate_otp(mobile)
    return {"success": True, "data": {"farmerId": str(farmer.id), "udlrn": udlrn, "devOtp": otp}}