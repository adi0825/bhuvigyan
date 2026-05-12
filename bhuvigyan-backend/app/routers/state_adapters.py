from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.state_adapter import StateAdapter
from app.schemas.state_adapter import StateAdapterCreate, StateAdapterUpdate, StateAdapterOut
from typing import List
from uuid import UUID

router = APIRouter()

@router.get("/adapters", response_model=List[StateAdapterOut])
async def list_adapters(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StateAdapter).order_by(StateAdapter.state_code))
    return result.scalars().all()

@router.get("/adapters/{state_code}", response_model=StateAdapterOut)
async def get_adapter(state_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StateAdapter).where(StateAdapter.state_code == state_code.upper()))
    adapter = result.scalar_one_or_none()
    if not adapter:
        raise HTTPException(status_code=404, detail="State adapter not found")
    return adapter

@router.post("/adapters", response_model=StateAdapterOut)
async def create_adapter(data: StateAdapterCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(StateAdapter).where(StateAdapter.state_code == data.state_code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Adapter for this state already exists")
    adapter = StateAdapter(
        state_code=data.state_code.upper(),
        name=data.name,
        config_json=data.config_json,
        active=data.active,
    )
    db.add(adapter)
    await db.commit()
    await db.refresh(adapter)
    return adapter

@router.put("/adapters/{state_code}", response_model=StateAdapterOut)
async def update_adapter(state_code: str, data: StateAdapterUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StateAdapter).where(StateAdapter.state_code == state_code.upper()))
    adapter = result.scalar_one_or_none()
    if not adapter:
        raise HTTPException(status_code=404, detail="State adapter not found")
    if data.name is not None:
        adapter.name = data.name
    if data.config_json is not None:
        adapter.config_json = data.config_json
    if data.active is not None:
        adapter.active = data.active
    await db.commit()
    await db.refresh(adapter)
    return adapter
