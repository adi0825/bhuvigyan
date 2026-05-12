from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.farm_registration import FarmRegistration


async def get_farmer_registrations(db: AsyncSession, farmer_id: str):
    result = await db.execute(
        select(FarmRegistration).where(FarmRegistration.farmer_id == farmer_id)
    )
    return result.scalars().all()


async def create_registration(db: AsyncSession, farmer_id: str, data: dict):
    reg = FarmRegistration(
        id=uuid4(),
        farmer_id=farmer_id,
        survey_number=data["survey_number"],
        state=data["state"],
        district=data["district"],
        taluk=data["taluk"],
        hobli=data.get("hobli"),
        village=data["village"],
        land_area_ha=data["land_area_ha"],
        ownership_type=data.get("ownership_type", "owner"),
        geo_centroid_lat=data.get("geo_centroid_lat"),
        geo_centroid_lng=data.get("geo_centroid_lng"),
        verification_status="pending",
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)
    return reg


async def update_kgis_status(db: AsyncSession, reg_id: str, verified: bool, kgis_data: dict = None):
    result = await db.execute(select(FarmRegistration).where(FarmRegistration.id == reg_id))
    reg = result.scalar_one_or_none()
    if not reg:
        return None
    reg.kgis_verified = verified
    if kgis_data:
        import json
        reg.kgis_data = json.dumps(kgis_data)
    if verified:
        reg.verification_status = "verified"
    await db.commit()
    await db.refresh(reg)
    return reg
