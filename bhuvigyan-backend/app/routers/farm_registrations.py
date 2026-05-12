"""Farm Registration endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import farm_registration_service

router = APIRouter(prefix="/farm-registrations", tags=["Farm Registrations"])


@router.get("/{farmer_id}")
async def get_registrations(farmer_id: str, db: AsyncSession = Depends(get_db)):
    regs = await farm_registration_service.get_farmer_registrations(db, farmer_id)
    return {"success": True, "data": regs}


@router.post("/{farmer_id}")
async def create_registration(farmer_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    reg = await farm_registration_service.create_registration(db, farmer_id, body)
    return {"success": True, "data": reg}


@router.put("/{reg_id}/kgis-verify")
async def verify_kgis(reg_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    reg = await farm_registration_service.update_kgis_status(
        db, reg_id, body.get("verified", False), body.get("kgis_data")
    )
    return {"success": True, "data": reg}
