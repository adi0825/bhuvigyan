from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional
from uuid import UUID
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster

def _normalize_mobile(mobile: str) -> str:
    """Strip +91 prefix, spaces, dashes to get clean 10-digit number."""
    cleaned = mobile.strip().replace(' ', '').replace('-', '')
    if cleaned.startswith('+91'):
        cleaned = cleaned[3:]
    elif cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned

async def get_farmer_by_mobile(db: AsyncSession, mobile: str) -> Optional[Farmer]:
    clean = _normalize_mobile(mobile)
    # Try both clean number and +91 prefixed number
    result = await db.execute(
        select(Farmer).where(
            or_(Farmer.mobile == clean, Farmer.mobile == f"+91{clean}", Farmer.mobile == f"91{clean}")
        )
    )
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