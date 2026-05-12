from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.system_config import SystemConfig
from app.schemas.system_config import SystemConfigCreate, SystemConfigUpdate, SystemConfigOut
from typing import List

router = APIRouter()

@router.get("/config", response_model=List[SystemConfigOut])
async def list_configs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemConfig).order_by(SystemConfig.key))
    return result.scalars().all()

@router.get("/config/{key}", response_model=SystemConfigOut)
async def get_config(key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config key not found")
    return config

@router.post("/config", response_model=SystemConfigOut)
async def create_config(data: SystemConfigCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(SystemConfig).where(SystemConfig.key == data.key))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Config key already exists")
    config = SystemConfig(**data.dict())
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

@router.put("/config/{key}", response_model=SystemConfigOut)
async def update_config(key: str, data: SystemConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config key not found")
    config.value = data.value
    if data.description is not None:
        config.description = data.description
    await db.commit()
    await db.refresh(config)
    return config
