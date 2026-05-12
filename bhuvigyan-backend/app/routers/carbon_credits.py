"""Carbon Credits endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import carbon_credit_service

router = APIRouter(prefix="/carbon-credits", tags=["Carbon Credits"])


@router.get("/{farmer_id}")
async def get_credits(farmer_id: str, db: AsyncSession = Depends(get_db)):
    credits = await carbon_credit_service.get_farmer_credits(db, farmer_id)
    summary = await carbon_credit_service.get_farmer_credit_summary(db, farmer_id)
    return {"success": True, "data": {"credits": credits, "summary": summary}}


@router.post("/{farmer_id}")
async def add_credit(farmer_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    credit = await carbon_credit_service.create_credit(db, farmer_id, body)
    return {"success": True, "data": credit}
