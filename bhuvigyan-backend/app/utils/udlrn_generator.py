from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.models.udlrn_master import UdlrnMaster

async def generate(db: AsyncSession, state_code: str) -> str:
    year = datetime.now().year
    result = await db.execute(
        select(func.count(UdlrnMaster.udlrn)).where(
            UdlrnMaster.udlrn.like(f"{state_code}%-{year}-%")
        )
    )
    count = result.scalar() + 1
    return f"{state_code}01-{year}-{str(count).zfill(5)}"