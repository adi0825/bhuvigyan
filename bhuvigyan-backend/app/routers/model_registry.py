from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.model_registry import ModelRegistry, ModelDeployment
from app.schemas.model_registry import ModelRegistryCreate, ModelRegistryOut, ModelPromoteRequest
from typing import List
from uuid import UUID as PyUUID
from datetime import datetime

router = APIRouter()

@router.get("/admin/model-registry", response_model=List[ModelRegistryOut])
async def list_models(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelRegistry).order_by(ModelRegistry.created_at.desc()))
    return result.scalars().all()

@router.post("/admin/model-registry", response_model=ModelRegistryOut)
async def register_model(data: ModelRegistryCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(ModelRegistry).where(ModelRegistry.version == data.version))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Model version already exists")
    model = ModelRegistry(**data.model_dump())
    db.add(model)
    await db.commit()
    await db.refresh(model)
    return model

@router.post("/admin/model-registry/{model_id}/promote", response_model=ModelRegistryOut)
async def promote_model(model_id: PyUUID, data: ModelPromoteRequest, db: AsyncSession = Depends(get_db)):
    target = await db.execute(select(ModelRegistry).where(ModelRegistry.id == model_id))
    target_model = target.scalar_one_or_none()
    if not target_model:
        raise HTTPException(status_code=404, detail="Model not found")

    current_prod = await db.execute(select(ModelRegistry).where(ModelRegistry.status == "PRODUCTION"))
    prev_model = current_prod.scalar_one_or_none()

    if prev_model:
        prev_model.status = "ARCHIVED"
        deployment = ModelDeployment(
            model_id=target_model.id,
            deployed_by=None,
            previous_model_id=prev_model.id,
            notes=data.notes,
        )
    else:
        deployment = ModelDeployment(
            model_id=target_model.id,
            deployed_by=None,
            notes=data.notes,
        )

    target_model.status = "PRODUCTION"
    db.add(deployment)
    await db.commit()
    await db.refresh(target_model)
    return target_model
