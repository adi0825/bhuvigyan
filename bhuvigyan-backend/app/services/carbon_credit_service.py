from uuid import uuid4
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.carbon_credit import CarbonCredit


async def get_farmer_credits(db: AsyncSession, farmer_id: str):
    result = await db.execute(
        select(CarbonCredit).where(CarbonCredit.farmer_id == farmer_id).order_by(CarbonCredit.created_at.desc())
    )
    return result.scalars().all()


async def create_credit(db: AsyncSession, farmer_id: str, data: dict):
    credit = CarbonCredit(
        id=uuid4(),
        farmer_id=farmer_id,
        season=data.get("season"),
        year=data.get("year"),
        credits_earned=data.get("credits_earned", 0),
        value_inr=data.get("value_inr", 0),
        certification=data.get("certification", "pending"),
        status=data.get("status", "pending"),
    )
    db.add(credit)
    await db.commit()
    await db.refresh(credit)
    return credit


async def get_farmer_credit_summary(db: AsyncSession, farmer_id: str):
    result = await db.execute(
        select(func.sum(CarbonCredit.credits_earned), func.sum(CarbonCredit.value_inr))
        .where(CarbonCredit.farmer_id == farmer_id, CarbonCredit.status == "verified")
    )
    total_credits, total_value = result.one()
    return {
        "total_credits": float(total_credits or 0),
        "total_value_inr": float(total_value or 0),
        "is_enrolled": True,
    }
