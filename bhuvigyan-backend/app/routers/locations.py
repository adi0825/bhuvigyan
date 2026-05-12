from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.redis_client import redis_client

router = APIRouter()

@router.get("/states")
async def get_states(db: AsyncSession = Depends(get_db)):
    cached = await redis_client.get("locations:states")
    if cached:
        return {"success": True, "data": eval(cached)}
    from app.models.location import LocationState
    result = await db.execute(select(LocationState).order_by(LocationState.name))
    states = result.scalars().all()
    data = [{"id": str(s.id), "name": s.name, "code": s.code} for s in states]
    await redis_client.setex("locations:states", 7776000, str(data))
    return {"success": True, "data": data}

@router.get("/districts")
async def get_districts(stateCode: str, db: AsyncSession = Depends(get_db)):
    if not stateCode:
        raise HTTPException(422, "stateCode is required")
    cached = await redis_client.get(f"locations:districts:{stateCode}")
    if cached:
        return {"success": True, "data": eval(cached)}
    from app.models.location import LocationState, LocationDistrict
    state_result = await db.execute(select(LocationState).where(LocationState.code == stateCode))
    state = state_result.scalar_one_or_none()
    if not state:
        return {"success": True, "data": []}
    result = await db.execute(select(LocationDistrict).where(LocationDistrict.state_id == state.id).order_by(LocationDistrict.name))
    districts = result.scalars().all()
    data = [{"id": str(d.id), "name": d.name, "code": d.code} for d in districts]
    await redis_client.setex(f"locations:districts:{stateCode}", 7776000, str(data))
    return {"success": True, "data": data}

@router.get("/taluks")
async def get_taluks(districtId: str, db: AsyncSession = Depends(get_db)):
    if not districtId:
        raise HTTPException(422, "districtId is required")
    from app.models.location import LocationTaluk
    result = await db.execute(select(LocationTaluk).where(LocationTaluk.district_id == districtId).order_by(LocationTaluk.name))
    taluks = result.scalars().all()
    return {"success": True, "data": [{"id": str(t.id), "name": t.name, "code": t.code} for t in taluks]}

@router.get("/hoblis")
async def get_hoblis(talukId: str, db: AsyncSession = Depends(get_db)):
    if not talukId:
        raise HTTPException(422, "talukId is required")
    from app.models.location import LocationHobli
    result = await db.execute(select(LocationHobli).where(LocationHobli.taluk_id == talukId).order_by(LocationHobli.name))
    hoblis = result.scalars().all()
    return {"success": True, "data": [{"id": str(h.id), "name": h.name, "code": h.code} for h in hoblis]}

@router.get("/villages")
async def get_villages(hobliId: str, db: AsyncSession = Depends(get_db)):
    if not hobliId:
        raise HTTPException(422, "hobliId is required")
    from app.models.location import LocationVillage
    result = await db.execute(select(LocationVillage).where(LocationVillage.hobli_id == hobliId).order_by(LocationVillage.name))
    villages = result.scalars().all()
    return {"success": True, "data": [{"id": str(v.id), "name": v.name, "code": v.code} for v in villages]}

@router.get("/udlrn/{udlrn}")
async def get_udlrn(udlrn: str, db: AsyncSession = Depends(get_db)):
    from app.models.udlrn_master import UdlrnMaster
    from app.models.farmer import Farmer
    result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrn))
    land = result.scalar_one_or_none()
    if not land:
        raise HTTPException(status_code=404, detail="UDLRN not found")
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == land.farmer_id))
    farmer = farmer_result.scalar_one_or_none()
    return {"success": True, "data": {
        "udlrn": land.udlrn,
        "landAreaHa": float(land.land_area_ha),
        "declaredCrop": land.declared_crop,
        "isFrozen": land.is_frozen == "true",
        "carbonScore": land.carbon_score,
        "farmerName": farmer.full_name if farmer else None,
        "farmerMobile": farmer.mobile if farmer else None,
        "state": "KA",
        "district": farmer.district if farmer else None,
        "taluk": farmer.taluk if farmer else None,
        "village": farmer.village if farmer else None,
    }}

@router.post("/udlrn/resolve")
async def resolve_udlrn(body: dict, db: AsyncSession = Depends(get_db)):
    survey_no = body.get("surveyNo")
    district_id = body.get("districtId")
    taluk_id = body.get("talukId")
    village_id = body.get("villageId")
    if not survey_no:
        raise HTTPException(status_code=422, detail="surveyNo is required")
    from app.utils.udlrn_generator import generate
    udlrn = await generate(db, "KA")
    from app.models.udlrn_master import UdlrnMaster
    return {"success": True, "data": {"udlrn": udlrn, "surveyNo": survey_no}}