from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster

async def get_farmer_by_mobile(db: AsyncSession, mobile: str) -> Optional[Farmer]:
    result = await db.execute(select(Farmer).where(Farmer.mobile == mobile))
    return result.scalar_one_or_none()

async def get_farmer_by_id(db: AsyncSession, farmer_id: UUID) -> Optional[Farmer]:
    result = await db.execute(select(Farmer).where(Farmer.id == farmer_id))
    return result.scalar_one_or_none()

async def get_farmer_by_udlrn(db: AsyncSession, udlrn: str) -> Optional[Farmer]:
    result = await db.execute(select(Farmer).join(UdlrnMaster).where(UdlrnMaster.udlrn == udlrn))
    return result.scalar_one_or_none()

async def get_udlrn_by_farmer(db: AsyncSession, farmer_id: UUID) -> Optional[UdlrnMaster]:
    result = await db.execute(select(UdlrnMaster).where(UdlrnMaster.farmer_id == farmer_id))
    return result.scalar_one_or_none()

async def create_farmer(db: AsyncSession, farmer_data: dict) -> Farmer:
    farmer = Farmer(**farmer_data)
    db.add(farmer)
    await db.flush()
    return farmer